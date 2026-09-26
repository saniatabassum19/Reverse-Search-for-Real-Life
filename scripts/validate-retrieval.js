const fs = require("fs");
const path = require("path");

const retrievalPath = path.join(__dirname, "..", "lib", "retrieval.js");
const source = fs.readFileSync(retrievalPath, "utf8");

const requiredFragments = [
  "trustedSourceRegistry",
  "TAVILY_API_KEY",
  "https:",
  "localhost",
  "MAX_DOCUMENT_BYTES",
  "verificationStatus: \"verified\"",
  "discoveryMethod",
  "manufacturer_search",
  "web_search",
  "trusted_sources",
  "no_source",
  "source_unverified",
  "const registeredSources = registeredSourcesFor(identity)",
  "const candidates = await discoverSources(identity, questionText)",
];

const missing = requiredFragments.filter((fragment) => !source.includes(fragment));
if (missing.length) {
  console.error(`Retrieval contract validation failed:\n- ${missing.join("\n- ")}`);
  process.exit(1);
}

if (source.includes("GEMINI_API_KEY") || source.includes("generateContent")) {
  console.error("Retrieval contract validation failed: Gemini coupling detected");
  process.exit(1);
}

console.log("Retrieval contract validation passed");