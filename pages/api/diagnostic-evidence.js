const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb",
    },
  },
};

const responseSchema = {
  type: "OBJECT",
  properties: {
    observation: { type: "STRING" },
    confidence: { type: "STRING", enum: ["high", "medium", "low"] },
    visibleEvidence: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    cannotDetermine: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    suggestedNextAction: { type: "STRING", nullable: true },
    safetyNote: { type: "STRING", nullable: true },
  },
  required: [
    "observation",
    "confidence",
    "visibleEvidence",
    "cannotDetermine",
    "suggestedNextAction",
    "safetyNote",
  ],
};

const systemPrompt = `
You interpret one user-supplied diagnostic photograph for a real-world object.
Return only JSON matching the provided schema.

Rules:
- Describe only what is actually visible in the supplied image.
- Clearly distinguish visible evidence from inference in observation.
- Do not invent hidden information or claim certainty when the image is ambiguous.
- Do not diagnose internal hardware from an external photograph.
- Do not provide repair, disassembly, electrical, battery, or other unsafe instructions.
- Do not override the diagnostic check or decide the user's diagnostic outcome.
- Use suggestedNextAction only for a cautious, observable next step already implied by the check.
- Use safetyNote for uncertainty, handling cautions, or service escalation.
- If the image is unclear, use low confidence and explain what cannot be determined.
`;

function getImageData(image) {
  if (!image || typeof image !== "object" || Array.isArray(image)) return null;
  const mimeType = image.mimeType?.trim();
  const data = image.data?.replace(/\s/g, "");
  if (!/^image\/(jpeg|png|gif|webp)$/i.test(mimeType || "")) return null;
  if (!data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;

  const bytes = Buffer.from(data, "base64");
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return null;
  return { mimeType, data };
}

function validateRequest(body) {
  const object = body?.object;
  const check = body?.check;
  const image = getImageData(body?.image);
  if (!object || typeof object !== "object" || Array.isArray(object)) {
    return { error: "Object identification is required", code: "INVALID_OBJECT" };
  }
  if (!check || typeof check !== "object" || typeof check.id !== "string") {
    return { error: "Diagnostic check is required", code: "INVALID_CHECK" };
  }
  if (!image) {
    return { error: "Invalid or oversized image", code: "INVALID_IMAGE" };
  }
  return { object, check, image };
}

function validateResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (typeof value.observation !== "string" || !value.observation.trim()) return null;
  if (![
    "high",
    "medium",
    "low",
  ].includes(value.confidence)) return null;
  if (
    !Array.isArray(value.visibleEvidence) ||
    value.visibleEvidence.some((item) => typeof item !== "string") ||
    !Array.isArray(value.cannotDetermine) ||
    value.cannotDetermine.some((item) => typeof item !== "string")
  ) return null;
  if (
    value.suggestedNextAction !== null &&
    typeof value.suggestedNextAction !== "string"
  ) return null;
  if (value.safetyNote !== null && typeof value.safetyNote !== "string") return null;

  return {
    observation: value.observation,
    confidence: value.confidence,
    visibleEvidence: value.visibleEvidence,
    cannotDetermine: value.cannotDetermine,
    suggestedNextAction: value.suggestedNextAction,
    safetyNote: value.safetyNote,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const request = validateRequest(req.body || {});
  if (request.error) {
    return res.status(400).json(request);
  }

  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const geminiModel = process.env.GEMINI_MODEL?.trim();
  if (!geminiKey || !geminiModel) {
    return res.status(503).json({
      error: "Gemini API configuration is missing",
      code: "MISSING_GEMINI_CONFIG",
    });
  }

  const { object, check, image } = request;
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    geminiModel,
  )}:generateContent`;
  const userPrompt = `
Object:
Brand: ${object.brand || "Unknown"}
Product: ${object.product || "Unknown"}
Model: ${object.model || "Unknown"}
Category: ${object.category || "Unknown"}

Diagnostic check:
ID: ${check.id}
Question: ${check.prompt || check.question || "Inspect the visible condition."}
Evidence request: ${JSON.stringify(check.visualEvidenceRequest || {})}
`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: `${systemPrompt}\n\n${userPrompt}` },
          { inline_data: { mime_type: image.mimeType, data: image.data } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  };

  let response;
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
    return res.status(502).json({
      error: "Gemini evidence analysis failed",
      code: "GEMINI_API_ERROR",
    });
  }

  if (!response.ok) {
    return res.status(response.status === 429 ? 429 : 502).json({
      error: response.status === 429
        ? "Evidence analysis is temporarily busy. Please try again."
        : "Gemini evidence analysis failed",
      code: response.status === 429 ? "GEMINI_RATE_LIMITED" : "GEMINI_API_ERROR",
    });
  }

  let responseBody;
  try {
    responseBody = await response.json();
  } catch {
    return res.status(502).json({
      error: "Gemini returned an invalid evidence response",
      code: "INVALID_GEMINI_RESPONSE",
    });
  }

  const candidateText = responseBody?.candidates?.[0]?.content?.parts
    ?.filter((part) => typeof part.text === "string")
    .map((part) => part.text)
    .join("");
  if (!candidateText) {
    return res.status(502).json({
      error: "Gemini returned an invalid evidence response",
      code: "INVALID_GEMINI_RESPONSE",
    });
  }

  try {
    const result = validateResult(JSON.parse(candidateText));
    if (!result) throw new Error("Invalid evidence shape");
    return res.status(200).json(result);
  } catch {
    return res.status(502).json({
      error: "Gemini returned malformed evidence JSON",
      code: "INVALID_GEMINI_RESPONSE",
    });
  }
}