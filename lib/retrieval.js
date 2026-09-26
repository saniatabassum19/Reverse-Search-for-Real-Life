import { fetchWithRetry } from "./utils";
import pdfParse from "pdf-parse";

const MAX_SOURCES = 3;
const MAX_EXCERPT_LENGTH = 2000;
const SOURCE_TIMEOUT_MS = 3000;
const MAX_SEARCH_RESULTS = 8;
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;
const SEARCH_TIMEOUT_MS = 5000;

// Retrieval contract: return source-backed context and the sources used to build it.
// Add only manually verified official documentation URLs to this registry.
const trustedSourceRegistry = Object.freeze({
  canon: [
    {
      product: "Canon EOS 250D DSLR Camera",
      model: "EOS 250D",
      title: "Canon EOS 250D User Manual",
      url: "https://pdisp01.c-wss.com/gdl/WWUFORedirectTarget.do?id=MDMwMDAzNDg2NDAy&cmp=ABX&lang=EN",
    },
  ],
});

const questionStopWords = new Set([
  "about",
  "this",
  "can",
  "does",
  "how",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "should",
  "from",
  "have",
  "that",
  "they",
  "their",
  "into",
  "your",
]);

function normalize(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function matchesRegisteredValue(value, registeredValue) {
  const normalizedValue = normalize(value);
  const normalizedRegisteredValue = normalize(registeredValue);
  if (!normalizedValue || !normalizedRegisteredValue) return false;

  return (
    normalizedValue === normalizedRegisteredValue ||
    normalizedValue.includes(normalizedRegisteredValue) ||
    normalizedRegisteredValue.includes(normalizedValue)
  );
}

function domainFor(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isUnsafeUrl(value) {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    if (parsed.protocol !== "https:") return true;
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname === "::1" ||
      hostname.includes(":")
    ) {
      return true;
    }

    const ipv4 = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!ipv4) return false;
    const [first, second] = ipv4.slice(1, 3).map(Number);
    return (
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  } catch {
    return true;
  }
}

function normalizeSearchText(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function isManufacturerCandidate(url, brand) {
  const domain = domainFor(url);
  const normalizedBrand = normalizeSearchText(brand).replace(/\s+/g, "");
  return Boolean(
    normalizedBrand &&
      domain.replace(/[^a-z0-9]/g, "").includes(normalizedBrand) &&
      /(support|manual|help|download|docs?)/i.test(url),
  );
}

// Signals that a page is troubleshooting/manual material rather than marketing or editorial.
const DIAGNOSTIC_SIGNAL_PATTERN =
  /(troubleshoot|troubleshooting|user\s?manual|instruction\s?manual|owner'?s?\s?manual|user\s?guide|support|faq|how\s?to\s?fix|repair|service\s?guide|error\s?code|self\s?help)/i;
const NON_DIAGNOSTIC_PATTERN =
  /(news|press[-_/ ]?release|announce|announcement|rumou?r|review|hands[-_ ]on|deal|discount|coupon|sale|shop|store|cart|checkout|pricing|blog\/|\/blog|forum|reddit|youtube|facebook|twitter|instagram|wikipedia)/i;

function hasDiagnosticSignal(value) {
  return DIAGNOSTIC_SIGNAL_PATTERN.test(value || "");
}

function isDiagnosticCandidate(candidate, brand) {
  const haystack = `${candidate.title || ""} ${candidate.url || ""}`;
  if (NON_DIAGNOSTIC_PATTERN.test(haystack)) return false;
  if (isManufacturerCandidate(candidate.url, brand)) return true;
  return hasDiagnosticSignal(haystack);
}

// A diagnostic source must name the exact model (when known) and actually carry
// troubleshooting content related to the reported symptom.
function documentSupportsDiagnostics(text, identity, question) {
  const haystack = normalizeSearchText(text);
  const normalizedModel = normalizeSearchText(identity.model);
  if (normalizedModel && !haystack.includes(normalizedModel)) return false;
  if (!normalizedModel && !identityMatchesDocument(text, identity)) return false;
  if (!hasDiagnosticSignal(text)) return false;

  const keywords = questionKeywords(question);
  if (!keywords.length) return true;
  return keywords.some((keyword) => haystack.includes(normalizeSearchText(keyword)));
}

function documentType(contentType, url) {
  const normalizedContentType = contentType.toLowerCase();
  if (normalizedContentType.includes("pdf") || /\.pdf(?:[?#]|$)/i.test(url)) {
    return "pdf";
  }
  if (normalizedContentType.includes("html")) return "html";
  if (normalizedContentType.startsWith("text/")) return "text";
  return "unknown";
}

function htmlToText(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function readResponseBuffer(response, maxBytes) {
  const reader = response.body?.getReader();
  if (!reader) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > maxBytes) throw new Error("Response exceeds size limit");
    return buffer;
  }

  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error("Response exceeds size limit");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function identityMatchesDocument(text, { brand, product, model, category }) {
  const haystack = normalizeSearchText(text);
  const normalizedBrand = normalizeSearchText(brand);
  if (normalizedBrand && !haystack.includes(normalizedBrand)) return false;

  const normalizedModel = normalizeSearchText(model);
  if (normalizedModel && haystack.includes(normalizedModel)) return true;

  const ignored = new Set([
    normalizedBrand,
    normalizeSearchText(category),
    "camera",
    "cameras",
    "manual",
    "support",
    "user",
    "guide",
  ]);
  const productWords = normalizeSearchText(product)
    .split(" ")
    .filter((word) => word.length >= 3 && !ignored.has(word));
  if (!productWords.length) return Boolean(normalizedBrand);
  const matches = productWords.filter((word) => haystack.includes(word));
  return matches.length >= Math.min(2, productWords.length);
}

function buildDiscoveryQuery({ brand, product, model, category, question }, diagnostic) {
  if (diagnostic) {
    const exactIdentity = [brand, model || product].filter(Boolean).join(" ").trim();
    return [
      exactIdentity ? `"${exactIdentity}"` : "",
      model && product && normalize(model) !== normalize(product) ? product : "",
      category,
      question,
      "troubleshooting official support user manual service guide fix",
    ]
      .filter((value) => typeof value === "string" && value.trim())
      .join(" ");
  }

  return [
    brand,
    model || product,
    category,
    question,
    "manual support troubleshooting error code",
  ]
    .filter((value) => typeof value === "string" && value.trim())
    .join(" ");
}

async function discoverSources(identity, question, diagnostic = false) {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) return [];

  const query = buildDiscoveryQuery({ ...identity, question }, diagnostic);
  try {
    const response = await fetchWithRetry(
      "https://api.tavily.com/search",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          search_depth: "basic",
          max_results: MAX_SEARCH_RESULTS,
          topic: "general",
          include_answer: false,
          include_raw_content: false,
        }),
      },
      1,
      SEARCH_TIMEOUT_MS,
    );
    const body = await response.json();
    return (body?.results || [])
      .map((result) => ({
        title: typeof result.title === "string" ? result.title : "",
        url: typeof result.url === "string" ? result.url : "",
      }))
      .filter((candidate) => candidate.url)
      .filter((candidate) => !diagnostic || isDiagnosticCandidate(candidate, identity.brand))
      .map((candidate) => ({
        ...candidate,
        domain: domainFor(candidate.url),
        manufacturer: identity.brand || null,
        discoveryMethod: isManufacturerCandidate(candidate.url, identity.brand)
          ? "manufacturer_search"
          : "web_search",
      }))
      .sort(
        (left, right) =>
          Number(right.discoveryMethod === "manufacturer_search") -
          Number(left.discoveryMethod === "manufacturer_search"),
      );
  } catch {
    return [];
  }
}

function registeredSourcesFor({ brand, product, model, category }) {
  const sources = trustedSourceRegistry[normalize(brand)] || [];
  const normalizedCategory = normalize(category);

  return sources.filter((source) => {
    const productMatches = matchesRegisteredValue(product, source.product);
    const modelMatches = matchesRegisteredValue(model, source.model);
    if (source.product && source.model && !productMatches && !modelMatches)
      return false;
    if (source.category && normalize(source.category) !== normalizedCategory)
      return false;
    return typeof source.title === "string" && typeof source.url === "string";
  });
}

function questionKeywords(question) {
  return normalize(question)
    .split(/[^a-z0-9]+/)
    .filter(
      (word) => word.length >= 4 && !questionStopWords.has(word),
    );
}

function selectRelevantExcerpt(text, question) {
  const keywords = questionKeywords(question);
  if (!keywords.length) return "";

  const lines = text
    .split(/\r?\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const chunks = [];

  for (let index = 0; index < lines.length; index += 3) {
    chunks.push(lines.slice(index, index + 6).join(" "));
  }

  const rankedChunks = chunks
    .map((chunk) => ({
      chunk,
      score: keywords.reduce(
        (score, keyword) =>
          score + (normalize(chunk).includes(keyword) ? 1 : 0),
        0,
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);

  if (!rankedChunks.length) return "";
  return rankedChunks[0].chunk.slice(0, MAX_EXCERPT_LENGTH);
}

async function fetchSource(
  source,
  question,
  identity,
  requireAssociation = false,
  requireDiagnosticRelevance = false,
) {
  try {
    if (isUnsafeUrl(source.url)) return null;
    const response = await fetchWithRetry(
      source.url,
      {
        method: "GET",
        headers: { Accept: "application/pdf, text/plain, text/html" },
      },
      1,
      SOURCE_TIMEOUT_MS,
    );
    const contentType = response.headers.get("content-type") || "";
    const type = documentType(contentType, source.url);
    if (type === "unknown") return null;
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_DOCUMENT_BYTES) return null;
    const buffer = await readResponseBuffer(response, MAX_DOCUMENT_BYTES);
    let text;

    if (type === "pdf") {
      const parsedPdf = await pdfParse(buffer);
      text = parsedPdf.text;
    } else {
      text = type === "html"
        ? htmlToText(buffer.toString("utf8"))
        : buffer.toString("utf8");
    }

    if (requireAssociation && !identityMatchesDocument(`${source.title} ${text}`, identity)) {
      return null;
    }
    if (
      requireDiagnosticRelevance &&
      !documentSupportsDiagnostics(`${source.title} ${text}`, identity, question)
    ) {
      return null;
    }
    const excerpt = selectRelevantExcerpt(text, question);
    if (!excerpt) return null;

    return {
      title: source.title,
      url: source.url,
      excerpt,
      domain: source.domain || domainFor(source.url),
      manufacturer: source.manufacturer || identity.brand || null,
      discoveryMethod: source.discoveryMethod || "curated_registry",
      productMatch: requireAssociation ? "strong" : "exact",
      documentType: type,
      diagnosticRelevance: requireDiagnosticRelevance ? "verified" : "not_required",
      verificationStatus: "verified",
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves trusted product documentation for a help question.
 *
 * This first implementation uses only the curated registry above. It does not
 * search the web or fabricate sources. A future provider can replace the
 * registry lookup while preserving this contract.
 */
export async function retrieveProductContext({
  brand,
  product,
  model,
  category,
  intent,
  question,
} = {}) {
  const diagnostic = normalize(intent) === "diagnose";
  const identity = { brand, product, model, category };
  const questionText = question?.trim() || "manual support troubleshooting";
  const registeredSources = registeredSourcesFor(identity).slice(0, MAX_SOURCES);

  if (registeredSources.length) {
    const sources = (
      await Promise.all(
        registeredSources.map((source) =>
          fetchSource(source, questionText, identity, false, diagnostic),
        ),
      )
    ).filter(Boolean);
    if (sources.length) {
      return {
        status: "trusted_sources",
        context: sources
          .map((source) => `${source.title}\n${source.excerpt}`)
          .join("\n\n"),
        sources,
      };
    }
    if (!diagnostic) {
      return { status: "source_unverified", context: "", sources: [] };
    }
  }

  const candidates = await discoverSources(identity, questionText, diagnostic);
  if (!candidates.length) {
    return {
      status: diagnostic ? "no_usable_diagnostic_source" : "no_source",
      context: "",
      sources: [],
    };
  }

  const sources = (
    await Promise.all(
      candidates.map((source) =>
        fetchSource(source, questionText, identity, true, diagnostic),
      ),
    )
  ).filter(Boolean).slice(0, MAX_SOURCES);
  const context = sources
    .map((source) => `${source.title}\n${source.excerpt}`)
    .join("\n\n");

  return {
    status: sources.length
      ? "trusted_sources"
      : diagnostic
        ? "no_usable_diagnostic_source"
        : "source_unverified",
    context,
    sources,
  };
}
