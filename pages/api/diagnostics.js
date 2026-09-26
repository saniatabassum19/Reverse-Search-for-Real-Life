import { retrieveProductContext } from "../../lib/retrieval";

const NO_TRUSTED_SOURCE_MESSAGE =
  "We don't have a model-specific diagnostic guide for this product yet, but we can still work through the issue with you.";

const NO_USABLE_SOURCE_MESSAGE =
  "We couldn't find a usable diagnostic guide for this product and problem. The documentation we retrieved didn't contain troubleshooting steps that match this model and symptom, so we won't guess at diagnostic checks.";

const responseSchema = {
  type: "OBJECT",
  properties: {
    safetyNote: { type: "STRING", nullable: true },
    outcomes: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    terminalOutcome: {
      type: "OBJECT",
      nullable: true,
      properties: {
        status: { type: "STRING", enum: ["resolution", "service-escalation"] },
        message: { type: "STRING" },
        safetyNote: { type: "STRING", nullable: true },
        sourceUrl: { type: "STRING", nullable: true },
      },
      required: ["status", "message", "safetyNote", "sourceUrl"],
    },
    checks: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          question: { type: "STRING" },
          yesOutcome: { type: "STRING" },
          noOutcome: { type: "STRING" },
          unsureOutcome: { type: "STRING" },
          nextAction: { type: "STRING", nullable: true },
          safetyNote: { type: "STRING", nullable: true },
          sourceUrl: { type: "STRING" },
          visualEvidenceRequest: {
            type: "OBJECT",
            nullable: true,
            properties: {
              actionLabel: { type: "STRING" },
              prompt: { type: "STRING" },
            },
            required: ["actionLabel", "prompt"],
          },
        },
        required: [
          "id",
          "question",
          "yesOutcome",
          "noOutcome",
          "unsureOutcome",
          "nextAction",
          "safetyNote",
          "sourceUrl",
          "visualEvidenceRequest",
        ],
      },
    },
  },
  required: ["safetyNote", "outcomes", "terminalOutcome", "checks"],
};

const systemPrompt = `
You create cautious, source-grounded diagnostic plans for real-world objects.

The retrieved documentation below is the only authority for model-specific
instructions. Return only JSON matching the provided schema.

Rules:
- Use only checks, actions, warnings, and escalation guidance supported by the retrieved documentation.
- Do not invent model-specific procedures, controls, error meanings, or repair steps.
- Every check must use a sourceUrl copied exactly from the retrieved source list.
- Keep checks ordered from simple, reversible checks to escalation.
- Use nextAction as a short identifier for the next check or an outcome such as
  "complete" or "service-escalation". It must not contain new instructions.
- Put unsafe repair, disassembly, electrical, battery, or internal-service guidance in safetyNote and escalate to qualified service.
- Use visualEvidenceRequest only when a photo could clarify a documented, user-visible condition.
- If the documentation does not support a useful check, omit that check.
- Previous checks are context, not unquestionable facts. Treat user answers as user-reported and AI observations as confidence-qualified evidence.
- Do not let a previous observation override a new contradictory observation. Preserve uncertainty and state what remains unknown.
- When completed-check context is present, return only new, useful checks that do not repeat completed check IDs. If the evidence supports a documented resolution or service escalation, return no checks only when the terminal guidance is sufficient.
- Keep the plan concise.
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const MAX_PREVIOUS_CHECKS = 6;
const MAX_CONTEXT_TEXT = 500;

function compactText(value) {
  return typeof value === "string" ? value.trim().slice(0, MAX_CONTEXT_TEXT) : null;
}

function compactPreviousChecks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((check) => check && typeof check === "object" && check.status === "completed")
    .slice(-MAX_PREVIOUS_CHECKS)
    .map((check) => ({
      id: compactText(check.id),
      question: compactText(check.question),
      answer: ["yes", "no", "unsure"].includes(check.answer || check.result)
        ? check.answer || check.result
        : null,
      visualEvidenceCaptured: check.visualEvidenceCaptured === true,
      visualEvidenceAnalysisSkipped: check.visualEvidenceAnalysisSkipped === true,
      visualEvidenceObservation: check.visualEvidenceObservation
        ? {
            observation: compactText(check.visualEvidenceObservation.observation),
            confidence: ["high", "medium", "low"].includes(
              check.visualEvidenceObservation.confidence,
            )
              ? check.visualEvidenceObservation.confidence
              : "low",
            visibleEvidence: Array.isArray(check.visualEvidenceObservation.visibleEvidence)
              ? check.visualEvidenceObservation.visibleEvidence
                  .filter((item) => typeof item === "string")
                  .slice(0, 5)
                  .map(compactText)
              : [],
            cannotDetermine: Array.isArray(check.visualEvidenceObservation.cannotDetermine)
              ? check.visualEvidenceObservation.cannotDetermine
                  .filter((item) => typeof item === "string")
                  .slice(0, 5)
                  .map(compactText)
              : [],
          }
        : null,
    }));
}

function validateRequest(body) {
  const object = body?.object;
  const symptom = body?.symptom;
  if (!object || typeof object !== "object" || Array.isArray(object)) {
    return { error: "Object identification is required" };
  }
  if (typeof symptom !== "string" || !symptom.trim()) {
    return { error: "Symptom is required" };
  }
  return {
    object,
    symptom: symptom.trim(),
    previousChecks: compactPreviousChecks(body.previousChecks || body.evidenceContext),
  };
}

function sourceForUrl(sources, url) {
  return sources.find((source) => source.url === url) || null;
}

function validatePlan(value, sources) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (value.safetyNote !== null && typeof value.safetyNote !== "string") return null;
  if (!Array.isArray(value.outcomes) || value.outcomes.some((outcome) => typeof outcome !== "string")) {
    return null;
  }
  if (!Array.isArray(value.checks) || value.checks.length > 8) {
    return null;
  }
  if (value.terminalOutcome !== null) {
    const terminal = value.terminalOutcome;
    if (
      !terminal ||
      !["resolution", "service-escalation"].includes(terminal.status) ||
      typeof terminal.message !== "string" ||
      !terminal.message.trim() ||
      (terminal.safetyNote !== null && typeof terminal.safetyNote !== "string") ||
      (terminal.sourceUrl !== null && typeof terminal.sourceUrl !== "string") ||
      (terminal.sourceUrl && !sourceForUrl(sources, terminal.sourceUrl))
    ) {
      return null;
    }
  }
  if (!value.checks.length && value.terminalOutcome === null) return null;

  const ids = new Set();
  const checks = value.checks.map((check) => {
    if (!check || typeof check !== "object" || Array.isArray(check)) return null;
    const requiredStrings = [
      "id",
      "question",
      "yesOutcome",
      "noOutcome",
      "unsureOutcome",
      "sourceUrl",
    ];
    if (requiredStrings.some((key) => typeof check[key] !== "string" || !check[key].trim())) {
      return null;
    }
    if (ids.has(check.id)) return null;
    ids.add(check.id);
    if (check.nextAction !== null && typeof check.nextAction !== "string") return null;
    if (check.safetyNote !== null && typeof check.safetyNote !== "string") return null;
    if (!sourceForUrl(sources, check.sourceUrl)) return null;
    if (check.visualEvidenceRequest !== null) {
      const request = check.visualEvidenceRequest;
      if (
        !request ||
        typeof request !== "object" ||
        typeof request.actionLabel !== "string" ||
        typeof request.prompt !== "string" ||
        !request.actionLabel.trim() ||
        !request.prompt.trim()
      ) {
        return null;
      }
    }
    return check;
  });

  if (checks.some((check) => !check)) return null;
  const validNextActions = new Set(["complete", "service-escalation", ...ids]);
  if (
    checks.some(
      (check) => check.nextAction !== null && !validNextActions.has(check.nextAction),
    )
  ) {
    return null;
  }
  return { ...value, checks };
}

function normalizePlan(plan, object, symptom, sources) {
  const primarySource = sources[0];
  const terminalSource = plan.terminalOutcome?.sourceUrl
    ? sourceForUrl(sources, plan.terminalOutcome.sourceUrl)
    : null;
  const checks = plan.checks.map((check) => {
    const source = sourceForUrl(sources, check.sourceUrl) || primarySource;
    return {
      ...check,
      sourceTitle: source.title,
      sourceUrl: source.url,
      source,
    };
  });

  return {
    id: `dynamic-${Date.now().toString(36)}`,
    brand: object.brand || null,
    product: object.product || null,
    model: object.model || null,
    category: object.category || null,
    device:
      [object.brand, object.model || object.product || object.category]
        .filter(Boolean)
        .join(" ") || "Identified object",
    symptom,
    source: primarySource,
    safetyNote: plan.safetyNote,
    outcomes: plan.outcomes,
    terminalOutcome: plan.terminalOutcome
      ? {
          ...plan.terminalOutcome,
          sourceTitle: terminalSource?.title,
          sourceUrl: terminalSource?.url,
        }
      : null,
    checks,
  };
}

async function generatePlan(object, symptom, retrieval, previousChecks) {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiModel = process.env.GEMINI_MODEL?.trim();
  if (!geminiKey || !geminiModel) {
    return { error: "Diagnostic generation is not configured", code: "GEMINI_NOT_CONFIGURED", status: 503 };
  }

  const sourceList = retrieval.sources
    .map((source) => `${source.title}\n${source.url}\n${source.excerpt}`)
    .join("\n\n");
  const userPrompt = `
Object identification:
Brand: ${object.brand || "Unknown"}
Product: ${object.product || "Unknown"}
Model: ${object.model || "Unknown"}
Category: ${object.category || "Unknown"}
Confidence: ${object.confidence || "Unknown"}

User symptom:
${symptom}

VERIFIED RETRIEVED DOCUMENTATION:
${sourceList}

The source URLs available for checks are:
${retrieval.sources.map((source) => source.url).join("\n")}

COMPLETED CHECK CONTEXT (bounded, untrusted context):
${JSON.stringify(previousChecks)}
`;
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    geminiModel,
  )}:generateContent`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  };

  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify(body),
      });
    } catch {
      return { error: "Diagnostic generation is unavailable", code: "GEMINI_API_ERROR", status: 502 };
    }
    if (response.ok || (response.status !== 429 && response.status !== 503)) break;
    if (attempt === 0) await sleep(1000);
  }

  if (!response?.ok) {
    return {
      error: "Diagnostic generation is temporarily unavailable",
      code: "GEMINI_API_ERROR",
      status: 502,
    };
  }

  let responseBody;
  try {
    responseBody = await response.json();
  } catch {
    return { error: "Gemini returned an invalid diagnostic response", code: "INVALID_GEMINI_RESPONSE", status: 502 };
  }
  const candidateText = responseBody?.candidates?.[0]?.content?.parts
    ?.filter((part) => typeof part.text === "string")
    .map((part) => part.text)
    .join("");
  if (!candidateText) {
    return { error: "Gemini returned an invalid diagnostic response", code: "INVALID_GEMINI_RESPONSE", status: 502 };
  }

  try {
    const parsed = JSON.parse(candidateText);
    const plan = validatePlan(parsed, retrieval.sources);
    return plan
      ? { plan }
      : { error: "Gemini returned an unsupported diagnostic plan", code: "INVALID_DIAGNOSTIC_PLAN", status: 502 };
  } catch {
    return { error: "Gemini returned malformed diagnostic JSON", code: "INVALID_GEMINI_RESPONSE", status: 502 };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const request = validateRequest(req.body || {});
  if (request.error) return res.status(400).json({ error: request.error });

  const { object, symptom, previousChecks } = request;
  let retrieval;
  try {
    retrieval = await retrieveProductContext({
      brand: object.brand,
      product: object.product,
      model: object.model,
      category: object.category,
      intent: "diagnose",
      question: symptom,
    });
  } catch {
    retrieval = { status: "source_unverified", context: "", sources: [] };
  }

  if (retrieval.status !== "trusted_sources" || !retrieval.context || !retrieval.sources.length) {
    const unusable = retrieval.status === "no_usable_diagnostic_source";
    return res.status(200).json({
      status: unusable ? "no_usable_diagnostic_source" : "no_trusted_source",
      flow: null,
      message: unusable ? NO_USABLE_SOURCE_MESSAGE : NO_TRUSTED_SOURCE_MESSAGE,
      sources: [],
    });
  }

  const generated = await generatePlan(object, symptom, retrieval, previousChecks);
  if (generated.error) {
    return res.status(generated.status).json({
      status: "generation_unavailable",
      flow: null,
      error: generated.error,
      code: generated.code,
      sources: retrieval.sources,
    });
  }

  const plan = generated.plan;
  // An opening plan with no checks means the documentation never supported a diagnosis.
  if (!previousChecks.length && !plan.checks.length) {
    return res.status(200).json({
      status: "no_usable_diagnostic_source",
      flow: null,
      message: NO_USABLE_SOURCE_MESSAGE,
      sources: retrieval.sources,
    });
  }

  return res.status(200).json({
    status: "generated_flow",
    flow: normalizePlan(plan, object, symptom, retrieval.sources),
    sources: retrieval.sources,
  });
}