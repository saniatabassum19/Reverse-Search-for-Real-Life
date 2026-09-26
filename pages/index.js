import { useRef, useState } from "react";

const UI_PREVIEW_ENABLED = process.env.NEXT_PUBLIC_UI_PREVIEW === "true";

const previewCanonResult = {
  brand: "Canon",
  product: "Canon EOS 250D DSLR Camera",
  model: "EOS 250D",
  category: "Cameras",
  confidence: "High",
  needsMoreInfo: false,
};

const previewUncertainResult = {
  brand: "OPPO",
  product: "Smartphone",
  model: null,
  category: "Mobile Phones",
  confidence: "medium",
  needsMoreInfo: true,
};

const previewHelpResult = {
  summary: "Preview answer only. This sample is not verified product guidance.",
  steps: [
    "Check the current mode and controls before changing any settings.",
    "Try one adjustment at a time, then test the result.",
    "Refer to the official manual for model-specific instructions.",
  ],
  warning: "This is sample preview content. Verify instructions before acting.",
  needsService: true,
  sources: [
    {
      title: "UI preview source — not a real document",
      excerpt: "Demo content only. No product documentation was retrieved.",
    },
  ],
};

const intents = [
  {
    key: "fix",
    title: "Fix a problem",
    description: "Troubleshoot something that's not working.",
    icon: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-3-3 2.4-2.4Z",
  },
  {
    key: "setup",
    title: "Set it up",
    description: "Get started with the right setup.",
    icon: "M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3M1 14h6m2-6h6m2 8h6",
  },
  {
    key: "learn",
    title: "Learn to use it",
    description: "Understand the controls and features.",
    icon: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Zm0 13.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8m-8 4h7",
  },
  {
    key: "ask",
    title: "Ask anything",
    description: "Ask a question in your own words.",
    icon: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z",
  },
  {
    key: "maintain",
    title: "Maintain it",
    description: "Keep it working reliably.",
    icon: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Zm-3-11 2 2 4-4",
  },
  {
    key: "tutorial",
    title: "Watch a tutorial",
    description: "Find a useful walkthrough.",
    icon: "m9 6 9 6-9 6V6Z",
  },
  {
    key: "manual",
    title: "Find the manual",
    description: "Find the official documentation.",
    icon: "M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Zm0 13.5A2.5 2.5 0 0 1 6.5 16H20M8 7h8m-8 4h8",
  },
];

const primaryIntents = intents.filter((intent) => intent.key !== "manual");
const manualIntent = intents.find((intent) => intent.key === "manual");
function IntentIcon({ path }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d={path} />
    </svg>
  );
}

function HelpAnswer({ result, question, object }) {
  if (!result) {
    return (
      <div className="answer-empty">
        <span className="answer-empty-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
            <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
          </svg>
        </span>
        <p>When you&apos;re ready, your guidance will appear here.</p>
      </div>
    );
  }

  return (
    <section className="answer-panel" aria-labelledby="answer-heading">
      <div className="answer-topline">
        <div className="answer-object">
          {object?.brand && <span className="product-brand">{object.brand}</span>}
          <span className="answer-object-name">
            {object?.model || object?.product || object?.category || "Your object"}
          </span>
          {object?.category && <span className="answer-object-type">{object.category}</span>}
        </div>
        <span className="answer-badge">Guidance</span>
      </div>
      <div className="question-quote">
        <span className="micro-label">YOUR QUESTION</span>
        <p>{question}</p>
      </div>
      <h3 id="answer-heading" className="answer-heading">Here&apos;s how</h3>
      <p className="answer-summary">{result.summary}</p>
      <ol className="answer-steps">
        {result.steps.map((step, index) => (
          <li key={`${index}-${step}`} className="answer-step">
            <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
            <p>{step}</p>
          </li>
        ))}
      </ol>
      {result.warning && (
        <div className="notice-panel notice-warning" role="note">
          <span className="micro-label">A NOTE OF CAUTION</span>
          <p>{result.warning}</p>
        </div>
      )}
      {result.needsService && (
        <div className="notice-panel notice-service" role="note">
          <span className="micro-label">NEXT STEP</span>
          <p>This may need attention from a qualified service professional.</p>
        </div>
      )}
      {Array.isArray(result.sources) && result.sources.length > 0 && (
        <div className="sources-block">
          <h4 className="sources-heading">Sources</h4>
          <ul className="source-list">
            {result.sources.map((source, index) => (
              <li className="source-item" key={`${source.url || source.title || "source"}-${index}`}>
                <div className="source-copy">
                  {source.title && <p className="source-title">{source.title}</p>}
                  {source.excerpt && <p className="source-excerpt">{source.excerpt}</p>}
                </div>
                {source.url && (
                  <a
                    className="source-link"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${source.title || "source"} in a new tab`}
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 3h7v7m-1-6-9 9" />
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    </svg>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function HelpError({ message, onRetry }) {
  const rateLimited = /429|resource_exhausted|rate.?limit|quota.?exceeded/i.test(
    message || "",
  );

  return (
    <div className="notice-panel notice-error" role="alert">
      <p>{rateLimited ? "AI requests are temporarily busy. Please try again in a moment." : "Something went wrong."}</p>
      <button type="button" className="text-action" onClick={onRetry}>Try again</button>
    </div>
  );
}

function formatConfidence(confidence) {
  if (!confidence) return null;
  return confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function DiagnosticOutcome({ outcome }) {
  if (!outcome) return null;

  return (
    <div className="diagnosis-check-note" role="status">
      <strong>Next step:</strong> {outcome.text}
      {outcome.safetyNote && (
        <span className="block mt-2">
          <strong>Safety:</strong> {outcome.safetyNote}
        </span>
      )}
      {outcome.sourceUrl && (
        <a
          href={outcome.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="text-action mt-2 inline-block"
        >
          Source: {outcome.sourceTitle || "Verified documentation"}
        </a>
      )}
    </div>
  );
}

function diagnosticOutcomeFor(check, answer) {
  return {
    text: check[`${answer}Outcome`],
    sourceTitle: check.source?.title || check.sourceTitle,
    sourceUrl: check.source?.url || check.sourceUrl,
    safetyNote: check.safetyNote,
  };
}

export default function Home() {
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const diagnosticEvidenceInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [diagnosticEvidenceFile, setDiagnosticEvidenceFile] = useState(null);
  const [diagnosticEvidencePreview, setDiagnosticEvidencePreview] = useState(null);
  const [diagnosticEvidenceError, setDiagnosticEvidenceError] = useState(null);
  const [diagnosticEvidenceLoading, setDiagnosticEvidenceLoading] = useState(false);
  const [diagnosticEvidenceObservation, setDiagnosticEvidenceObservation] = useState(null);
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticRequestError, setDiagnosticRequestError] = useState(null);
  const [diagnosticFallbackMessage, setDiagnosticFallbackMessage] = useState(null);
  const [diagnosticNoUsableSource, setDiagnosticNoUsableSource] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedIntent, setSelectedIntent] = useState(null);
  const [problem, setProblem] = useState("");
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpResult, setHelpResult] = useState(null);
  const [helpError, setHelpError] = useState(null);
  const [showLabelGuidance, setShowLabelGuidance] = useState(false);
  const [diagnosticSymptom, setDiagnosticSymptom] = useState("");
  const [diagnosticSession, setDiagnosticSession] = useState(null);

  function enterPreviewResult(uncertain = false) {
    clearDiagnosticEvidence();
    setDiagnosticLoading(false);
    setDiagnosticRequestError(null);
    setDiagnosticFallbackMessage(null);
    setFile(null);
    setPreview(null);
    setResult(uncertain ? previewUncertainResult : previewCanonResult);
    setError(null);
    setSelectedIntent(null);
    setProblem("");
    setHelpResult(null);
    setHelpError(null);
    setShowLabelGuidance(false);
    setDiagnosticSymptom("Camera won't take a photo");
    setDiagnosticSession(null);
  }

  function handleFile(e) {
    const selectedFile = e.target.files[0];
    e.target.value = "";
    if (!selectedFile) return;
    clearDiagnosticEvidence();
    setDiagnosticLoading(false);
    setDiagnosticRequestError(null);
    setDiagnosticFallbackMessage(null);
    setFile(selectedFile);
    setResult(null);
    setError(null);
    setSelectedIntent(null);
    setShowLabelGuidance(false);
    setDiagnosticSymptom("");
    setDiagnosticSession(null);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(selectedFile);
  }

  function resetScan() {
    clearDiagnosticEvidence();
    setDiagnosticLoading(false);
    setDiagnosticRequestError(null);
    setDiagnosticFallbackMessage(null);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setSelectedIntent(null);
    setShowLabelGuidance(false);
    setDiagnosticSymptom("");
    setDiagnosticSession(null);
  }

  function handleLabelPhoto() {
    resetScan();
    setTimeout(() => fileInputRef.current?.click(), 0);
  }

  function openGallery() {
    galleryInputRef.current?.click();
  }

  function clearDiagnosticEvidence() {
    setDiagnosticEvidenceFile(null);
    setDiagnosticEvidencePreview(null);
    setDiagnosticEvidenceError(null);
    setDiagnosticEvidenceLoading(false);
    setDiagnosticEvidenceObservation(null);
  }

  function openDiagnosticEvidence() {
    setDiagnosticEvidenceError(null);
    diagnosticEvidenceInputRef.current?.click();
  }

  function handleDiagnosticEvidenceFile(event) {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setDiagnosticEvidenceError("Please choose an image file.");
      return;
    }

    setDiagnosticEvidenceFile(selectedFile);
    setDiagnosticEvidencePreview(null);
    setDiagnosticEvidenceError(null);

    const reader = new FileReader();
    reader.onload = () => setDiagnosticEvidencePreview(reader.result);
    reader.onerror = () => {
      setDiagnosticEvidenceFile(null);
      setDiagnosticEvidenceError("This image could not be previewed. Please try again.");
    };
    reader.readAsDataURL(selectedFile);
  }

  function readDiagnosticEvidence() {
    return new Promise((resolve, reject) => {
      if (!diagnosticEvidenceFile) {
        reject(new Error("Choose an evidence photo first."));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = () => reject(new Error("This image could not be read. Please try again."));
      reader.readAsDataURL(diagnosticEvidenceFile);
    });
  }

  async function useDiagnosticEvidence() {
    if (!diagnosticEvidenceFile || !diagnosticSession || diagnosticEvidenceLoading) return;

    setDiagnosticEvidenceLoading(true);
    setDiagnosticEvidenceError(null);
    try {
      const data = await readDiagnosticEvidence();
      const check = diagnosticSession.checks[diagnosticSession.currentStep];
      const response = await fetch("/api/diagnostic-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object: diagnosticSession.object,
          check: {
            id: check.id,
            prompt: check.question,
            visualEvidenceRequest: check.visualEvidenceRequest,
          },
          image: {
            mimeType: diagnosticEvidenceFile.type,
            data,
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Evidence analysis failed. Please try again.");
      }

      setDiagnosticEvidenceObservation(result);
      setDiagnosticSession((session) =>
        session
          ? {
              ...session,
              visualEvidenceCaptured: true,
              visualEvidenceObservation: result,
              checks: session.checks.map((item, index) =>
                index === session.currentStep
                  ? {
                      ...item,
                      visualEvidenceCaptured: true,
                      visualEvidenceObservation: result,
                      visualEvidenceAnalysisSkipped: false,
                    }
                  : item,
              ),
            }
          : session,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setDiagnosticEvidenceError(
        message && !/fetch|network|json|unexpected/i.test(message)
          ? message
          : "Evidence analysis failed. Please try again.",
      );
    } finally {
      setDiagnosticEvidenceLoading(false);
    }
  }

  function continueWithoutEvidenceAnalysis() {
    setDiagnosticSession((session) =>
      session
        ? {
            ...session,
            visualEvidenceCaptured: true,
            visualEvidenceAnalysisSkipped: true,
            checks: session.checks.map((item, index) =>
              index === session.currentStep
                ? {
                    ...item,
                    visualEvidenceCaptured: true,
                    visualEvidenceObservation: null,
                    visualEvidenceAnalysisSkipped: true,
                  }
                : item,
            ),
          }
        : session,
    );
  }

  async function handleSubmit() {
    if (!file) return;
    setLoading(true);
    setError(null);
    if (UI_PREVIEW_ENABLED) {
      window.setTimeout(() => {
        setResult(previewCanonResult);
        setLoading(false);
      }, 450);
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(",")[1];
        const res = await fetch("/api/vision_gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        if (!res.ok) {
          const errorBody = await res.text();
          throw new Error(`HTTP ${res.status}: ${errorBody}`);
        }
        const data = await res.json();
        setResult(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleGetHelp() {
    if (!problem.trim() || !result) return;

    setHelpLoading(true);
    setHelpError(null);
    setHelpResult(null);

    try {
      if (UI_PREVIEW_ENABLED) {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
        setHelpResult(previewHelpResult);
        return;
      }

      const res = await fetch("/api/help", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          object: {
            brand: result.brand,
            product: result.product,
            model: result.model,
            category: result.category,
            confidence: result.confidence,
          },
          intent: selectedIntent,
          problem: problem.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const detail = data.details?.body;
        throw new Error(
          detail
            ? `${data.error || "Unable to get help"}: ${detail}`
            : data.error || "Unable to get help",
        );
      }

      setHelpResult(data);
    } catch (err) {
      setHelpError(err.message);
    } finally {
      setHelpLoading(false);
    }
  }

  function beginDiagnosticSession(flow) {
    clearDiagnosticEvidence();
    setDiagnosticSession({
      object: diagnosticObject,
      device: flow.device || diagnosticObject.model || diagnosticObject.product || "Identified object",
      symptom: diagnosticSymptom.trim(),
      checks: (flow.checks || []).map((check, index) => ({
        ...check,
        status: index === 0 ? "current" : "upcoming",
        result: null,
        visualEvidenceCaptured: false,
        visualEvidenceObservation: null,
        visualEvidenceAnalysisSkipped: false,
      })),
      currentStep: 0,
      lastOutcome: null,
      terminalOutcome: flow.terminalOutcome || null,
      visualEvidenceCaptured: false,
      outcome: flow.checks?.length ? null : "checks-complete",
    });
  }

  function completedDiagnosticContext(checks) {
    return checks
      .filter((check) => check.status === "completed")
      .slice(-6)
      .map((check) => ({
        id: check.id,
        question: check.question,
        status: check.status,
        result: check.result,
        visualEvidenceCaptured: check.visualEvidenceCaptured === true,
        visualEvidenceAnalysisSkipped: check.visualEvidenceAnalysisSkipped === true,
        visualEvidenceObservation: check.visualEvidenceObservation || null,
      }));
  }

  async function fetchDiagnosticPlan(previousChecks = []) {
    const response = await fetch("/api/diagnostics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        object: {
          brand: result.brand,
          product: result.product,
          model: result.model,
          category: result.category,
          confidence: result.confidence,
        },
        symptom: diagnosticSession?.symptom || diagnosticSymptom.trim(),
        previousChecks,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.status === "generation_unavailable") {
      throw new Error(data.error || "Diagnostic generation is temporarily unavailable.");
    }
    return data;
  }

  async function startDiagnostic() {
    if (!diagnosticSymptom.trim() || !result || diagnosticLoading) return;

    setDiagnosticLoading(true);
    setDiagnosticRequestError(null);
    setDiagnosticFallbackMessage(null);
    setDiagnosticNoUsableSource(false);
    setDiagnosticSession(null);

    try {
      const data = await fetchDiagnosticPlan();

      if (data.status === "generated_flow") {
        if (!data.flow || !data.flow.checks?.length) {
          setDiagnosticNoUsableSource(true);
          setDiagnosticFallbackMessage(
            data.message ||
              "The documentation we retrieved didn't contain troubleshooting steps for this model and problem.",
          );
          return;
        }
        beginDiagnosticSession(data.flow);
        return;
      }

      if (data.status === "no_usable_diagnostic_source") {
        setDiagnosticNoUsableSource(true);
        setDiagnosticFallbackMessage(data.message);
        return;
      }

      if (data.status === "no_trusted_source") {
        setDiagnosticFallbackMessage(data.message);
        return;
      }

      if (data.status === "generation_unavailable") {
        throw new Error(data.error || "Diagnostic generation is temporarily unavailable.");
      }

      throw new Error("Unable to start diagnosis.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setDiagnosticRequestError(
        message && !/fetch|network|json|unexpected/i.test(message)
          ? message
          : "Unable to start diagnosis. Please try again.",
      );
    } finally {
      setDiagnosticLoading(false);
    }
  }

  async function recordDiagnosticAnswer(answer) {
    if (!diagnosticSession || diagnosticSession.currentStep >= diagnosticSession.checks.length) return;
    clearDiagnosticEvidence();
    const currentIndex = diagnosticSession.currentStep;
    const currentCheck = diagnosticSession.checks[currentIndex];
    const completedChecks = diagnosticSession.checks.map((check, index) =>
      index === currentIndex
        ? { ...check, status: "completed", result: answer }
        : check,
    );
    const completedCount = completedChecks.filter((check) => check.status === "completed").length;
    setDiagnosticLoading(true);
    setDiagnosticRequestError(null);
    setDiagnosticSession((session) =>
      session
        ? {
            ...session,
            checks: completedChecks,
            currentStep: completedCount,
            lastOutcome: diagnosticOutcomeFor(currentCheck, answer),
            outcome: null,
          }
        : session,
    );

    try {
      const data = await fetchDiagnosticPlan(completedDiagnosticContext(completedChecks));
      if (data.status !== "generated_flow" || !data.flow) {
        throw new Error(data.message || "No further diagnostic guidance is available.");
      }
      const completedIds = new Set(completedChecks.map((check) => check.id));
      const nextChecks = (data.flow.checks || [])
        .filter((check) => !completedIds.has(check.id))
        .map((check, index) => ({
          ...check,
          status: index === 0 ? "current" : "upcoming",
          result: null,
          visualEvidenceCaptured: false,
          visualEvidenceObservation: null,
          visualEvidenceAnalysisSkipped: false,
        }));
      setDiagnosticSession((session) =>
        session
          ? {
              ...session,
              checks: [...completedChecks, ...nextChecks],
              currentStep: completedCount,
              terminalOutcome: data.flow.terminalOutcome || null,
              outcome: nextChecks.length ? null : "checks-complete",
            }
          : session,
      );
    } catch (error) {
      setDiagnosticRequestError(error.message || "Unable to continue diagnosis.");
      setDiagnosticSession((session) =>
        session
          ? {
              ...session,
              checks: completedChecks,
              currentStep: completedCount,
              outcome: completedCount >= completedChecks.length ? "checks-complete" : null,
            }
          : session,
      );
    } finally {
      setDiagnosticLoading(false);
    }
  }

  function goBackDiagnostic() {
    if (!diagnosticSession) return;
    if (diagnosticSession.currentStep === 0) {
      setDiagnosticSession(null);
      return;
    }

    setDiagnosticSession((session) => {
      if (!session) return session;
      const previousStep = session.currentStep - 1;
      return {
        ...session,
        currentStep: previousStep,
        lastOutcome: previousStep > 0
          ? diagnosticOutcomeFor(
              session.checks[previousStep - 1],
              session.checks[previousStep - 1].result,
            )
          : null,
        outcome: null,
        checks: session.checks.map((check, index) => ({
          ...check,
          status: index < previousStep
            ? "completed"
            : index === previousStep
              ? "current"
              : "upcoming",
          result: index < previousStep ? check.result : null,
        })),
      };
    });
  }

  function endDiagnostic() {
    setDiagnosticSession((session) =>
      session ? { ...session, outcome: "ended" } : session,
    );
  }

  async function handleStillNotWorking() {
    if (!diagnosticSession) return;
    const nextCheckIndex = diagnosticSession.checks.findIndex(
      (check) => check.status !== "completed",
    );

    if (nextCheckIndex >= 0) {
      clearDiagnosticEvidence();
      setDiagnosticSession((session) =>
        session
          ? {
              ...session,
              currentStep: nextCheckIndex,
              outcome: "narrowing-further",
            }
          : session,
      );
      return;
    }

    setDiagnosticLoading(true);
    setDiagnosticRequestError(null);
    try {
      const data = await fetchDiagnosticPlan(
        completedDiagnosticContext(diagnosticSession.checks),
      );
      if (data.status !== "generated_flow" || !data.flow) {
        throw new Error(data.message || "No further diagnostic guidance is available.");
      }
      const completedChecks = diagnosticSession.checks;
      const completedIds = new Set(completedChecks.map((check) => check.id));
      const nextChecks = (data.flow.checks || [])
        .filter((check) => !completedIds.has(check.id))
        .map((check, index) => ({
          ...check,
          status: index === 0 ? "current" : "upcoming",
          result: null,
          visualEvidenceCaptured: false,
          visualEvidenceObservation: null,
          visualEvidenceAnalysisSkipped: false,
        }));
      setDiagnosticSession((session) =>
        session
          ? {
              ...session,
              checks: [...completedChecks, ...nextChecks],
              currentStep: completedChecks.length,
              terminalOutcome: data.flow.terminalOutcome || null,
              outcome: nextChecks.length ? "narrowing-further" : "still-not-working",
            }
          : session,
      );
    } catch (error) {
      setDiagnosticRequestError(error.message || "Unable to continue diagnosis.");
      setDiagnosticSession((session) =>
        session ? { ...session, outcome: "still-not-working" } : session,
      );
    } finally {
      setDiagnosticLoading(false);
    }
  }

  function returnFromDiagnostic() {
    clearDiagnosticEvidence();
    setDiagnosticLoading(false);
    setDiagnosticRequestError(null);
    setDiagnosticFallbackMessage(null);
    setDiagnosticSession(null);
    setSelectedIntent(null);
  }

  const diagnosticObject = {
    brand: result?.brand || null,
    product: result?.product || null,
    model: result?.model || null,
    category: result?.category || null,
  };
  const diagnosticAvailable = Boolean(result);
  const uncertain = Boolean(
    result?.needsMoreInfo || result?.confidence === "low" || !result?.model,
  );
  const identifiedObject =
    [result?.brand, result?.product || result?.category]
      .filter(Boolean)
      .join(" ") || "this object";
  const title = result?.model || result?.product || result?.category || result?.brand;
  const normalizedProduct = result?.product?.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() || "";
  const productRepeatsIdentity = Boolean(
    result?.brand && result?.model &&
    normalizedProduct.includes(result.brand.toLowerCase()) &&
    normalizedProduct.includes(result.model.toLowerCase()),
  );
  const activeDiagnosticCheck = diagnosticSession?.checks?.[diagnosticSession.currentStep];
  const visualEvidenceRequest = activeDiagnosticCheck?.visualEvidenceRequest;
  const activeEvidenceCaptured = activeDiagnosticCheck?.visualEvidenceCaptured;
  const activeEvidenceObservation = activeDiagnosticCheck?.visualEvidenceObservation;
  const activeEvidenceSkipped = activeDiagnosticCheck?.visualEvidenceAnalysisSkipped;

  return (
    <main className="app-shell">
      <header className="site-header">
        <div>
          <span className="wordmark">REVERSE REAL LIFE</span>
          <span className="wordmark-detail">VISUAL FIELD GUIDE</span>
        </div>
          {result && (
            <button
              type="button"
              onClick={resetScan}
              className="secondary-action focus-ring"
            >
              New scan
            </button>
          )}
      </header>
      <div className="page-container">

        {!result ? (
          <section className="landing-screen" aria-labelledby="scan-heading">
            <div className="landing-copy">
              <p className="section-eyebrow mb-5">
                VISUAL FIELD GUIDE
              </p>
              <h1
                id="scan-heading"
                className="display-heading"
              >
                Show us something.<br />We&apos;ll help you figure it out.
              </h1>
              <p className="support-copy mt-5">
                Identify objects, understand what they do, and get practical
                guidance from trusted sources.
              </p>
              <p className="product-descriptor mt-5">
                Identify <span>·</span> Understand <span>·</span> Fix
              </p>
            </div>

            <label className={`capture-surface focus-ring${preview ? " capture-surface-selected" : ""}`} aria-label="Take a photo">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFile}
                className="sr-only"
              />
              {preview ? (
                <div className="capture-preview">
                  <img
                    src={preview}
                    alt="Selected object"
                  />
                  <span className="absolute bottom-4 left-4 rounded-md border border-white/80 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800">
                    Change photo
                  </span>
                </div>
              ) : (
                <div className="capture-prompt">
                  <div className="capture-icon mb-5">
                    <svg
                      aria-hidden="true"
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h2l1.2-2h4.6l1.2 2h2A1.5 1.5 0 0 1 18 7.5v9A1.5 1.5 0 0 1 16.5 18h-11A1.5 1.5 0 0 1 4 16.5v-9Z" />
                      <circle cx="12" cy="12" r="3.5" />
                    </svg>
                  </div>
                  <span className="capture-primary-label text-lg font-semibold text-slate-900">
                    Take a photo
                  </span>
                  <span className="capture-desktop-label text-lg font-semibold text-slate-900">
                    Upload an image
                  </span>
                  <span className="mt-2 text-sm text-slate-500">
                    Use your camera to identify the object.
                  </span>
                </div>
              )}
            </label>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="sr-only"
            />
            <button
              type="button"
              onClick={openGallery}
              className="gallery-action secondary-action focus-ring"
            >
              Upload from gallery
            </button>

            {file && !loading && (
              <button
                type="button"
                onClick={handleSubmit}
                className="primary-action scan-submit focus-ring"
              >
                Identify object
              </button>
            )}

            {loading && (
              <div
                className="scan-status loading-state"
                role="status"
              >
                <span className="loading-indicator" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-slate-900">
                    Looking closely…
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Identifying the object
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div
                className="scan-status scan-error notice-panel notice-error"
                role="alert"
              >
                <p className="font-semibold">
                  {/429|resource_exhausted|rate.?limit|quota.?exceeded/i.test(error || "")
                    ? "AI requests are temporarily busy. Please try again in a moment."
                    : "Something went wrong."}
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="text-action focus-ring"
                >
                  Try again
                </button>
              </div>
            )}

            <p className="scan-tip text-center text-xs leading-5 text-slate-500">
              For the clearest result, include the whole object and any visible
              labels.
            </p>

            {UI_PREVIEW_ENABLED && (
              <aside className="preview-controls" aria-label="Development UI previews">
                <div>
                  <p className="section-eyebrow">LOCAL UI PREVIEW</p>
                  <p className="preview-controls-copy">
                    Sample screens only. No Gemini requests are made in this mode.
                  </p>
                </div>
                <div className="preview-control-actions">
                  <button
                    type="button"
                    className="secondary-action focus-ring"
                    onClick={() => enterPreviewResult()}
                  >
                    Preview Canon product
                  </button>
                  <button
                    type="button"
                    className="secondary-action focus-ring"
                    onClick={() => enterPreviewResult(true)}
                  >
                    Preview uncertain match
                  </button>
                </div>
              </aside>
            )}
          </section>
        ) : (
          <section aria-labelledby="result-heading">
            <div className="product-workspace">
              <div className="product-photo-frame">
                {preview ? (
                  <img src={preview} alt="Scanned object" />
                ) : (
                  <div className="grid h-full min-h-[260px] place-items-center text-sm text-slate-500">
                    Product image
                  </div>
                )}
              </div>
              <div className="product-details">
                {UI_PREVIEW_ENABLED && (
                  <span className="preview-badge">LOCAL UI PREVIEW · NOT A REAL IDENTIFICATION</span>
                )}
                <p className="section-eyebrow">OBJECT IDENTIFIED</p>
                {result.brand && <p className="product-brand mt-4">{result.brand}</p>}
                <h1 id="result-heading" className="product-name">
                  {result.model || title || "Object identified"}
                </h1>
                {result.category && <p className="product-type">{result.category}</p>}
                {result.product &&
                  !productRepeatsIdentity &&
                  result.product !== result.model &&
                  result.product !== result.category &&
                  result.product !== result.brand && (
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                      {result.product}
                    </p>
                  )}
                {formatConfidence(result.confidence) && (
                  <p className="confidence-status">
                    <span className="confidence-dot" aria-hidden="true" />
                    {formatConfidence(result.confidence)} confidence
                  </p>
                )}
              </div>
            </div>
            {uncertain && (showLabelGuidance ? (
              <div className="guidance-panel mt-6">
                <button
                  type="button"
                  onClick={() => setShowLabelGuidance(false)}
                  className="text-action focus-ring"
                >
                  ← Back
                </button>
                <div className="mt-6">
                  <p className="section-eyebrow">
                    MODEL IDENTIFICATION
                  </p>
                  <h2 className="mt-3 font-serif text-2xl font-normal text-slate-950 sm:text-3xl">
                    Find the model number
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                    Look on the back of the device, inside the SIM tray area,
                    in Settings → About device, or on the original box.
                  </p>
                  <button
                    type="button"
                    onClick={handleLabelPhoto}
                    className="primary-action focus-ring mt-7 w-full"
                  >
                    Take photo of label
                  </button>
                </div>
              </div>
            ) : (
              <div className="uncertainty-panel mt-6">
                <p className="section-eyebrow">
                  NOT QUITE SURE YET
                </p>
                <h2 className="mt-3 font-serif text-2xl font-normal text-slate-950 sm:text-3xl">
                  We found {identifiedObject}, but we couldn&apos;t identify the
                  exact model.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                  A model-specific photo will help us give you more accurate
                  answers and guidance.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={resetScan}
                    className="primary-action focus-ring px-5"
                  >
                    Take another photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLabelGuidance(true)}
                    className="secondary-action focus-ring px-5"
                  >
                    Show the model label
                  </button>
                </div>
              </div>
            ))}
            {uncertain && (
              <p className="mt-5 text-xs leading-5 text-slate-500">
                General guidance is available now. Exact steps may vary by
                model.
              </p>
            )}
            {helpLoading && selectedIntent !== null && !["manual", "tutorial"].includes(selectedIntent) && (
              <div className="loading-state mb-5" role="status">
                <span className="loading-indicator" aria-hidden="true" />
                <span>
                  <strong className="block text-slate-900">Working through that…</strong>
                  <span className="mt-1 block">Checking the available guidance</span>
                </span>
              </div>
            )}
            {selectedIntent === null ? (
              <div className="mt-8">
                <div className="mb-5">
                  <p className="section-eyebrow">WHAT&apos;S NEXT</p>
                  <h2 className="mt-2 font-serif text-3xl font-normal text-slate-950">
                    What would you like to do?
                  </h2>
                </div>

                <div className="intent-grid">
                  {primaryIntents.map((intent) => (
                    <button
                      type="button"
                      key={intent.key}
                      onClick={() => setSelectedIntent(intent.key)}
                      className={`intent-card focus-ring${intent.key === "ask" ? " intent-card-featured" : ""}`}
                    >
                      <span className="intent-icon">
                        <IntentIcon path={intent.icon} />
                      </span>
                      <span>
                        <span className="intent-card-title">{intent.title}</span>
                        <span className="intent-card-description">
                          {intent.description}
                        </span>
                      </span>
                    </button>
                  ))}
                  {diagnosticAvailable && (
                    <button
                      type="button"
                      onClick={() => {
                        setDiagnosticSession(null);
                        setSelectedIntent("diagnose");
                      }}
                      className="intent-card focus-ring diagnosis-intent-card"
                    >
                      <span className="intent-icon">
                        <IntentIcon path="M9 12l2 2 4-4m5 2a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
                      </span>
                      <span>
                        <span className="intent-card-title">Diagnose the problem</span>
                        <span className="intent-card-description">
                          Work through the issue step by step.
                        </span>
                      </span>
                    </button>
                  )}
                </div>
                {manualIntent && (
                  <button
                    type="button"
                    onClick={() => setSelectedIntent(manualIntent.key)}
                    className="intent-secondary focus-ring"
                  >
                    <span className="intent-icon">
                      <IntentIcon path={manualIntent.icon} />
                    </span>
                    <span className="intent-card-title">{manualIntent.title}</span>
                    <span className="intent-card-description">
                      {manualIntent.description}
                    </span>
                    <span className="intent-secondary-arrow" aria-hidden="true">→</span>
                  </button>
                )}
              </div>
            ) : selectedIntent === "diagnose" ? (
              <div className="diagnosis-flow mt-10">
                {!diagnosticSession ? (
                  <>
                    <button
                      type="button"
                      onClick={returnFromDiagnostic}
                      className="text-action focus-ring"
                    >
                      ← Back to object
                    </button>

                    <section className="diagnosis-symptom-panel mt-6">
                      <p className="section-eyebrow">GUIDED DIAGNOSTICS · LOCAL DEMO</p>
                      <h2 className="mt-3 font-serif text-3xl font-normal text-slate-950">
                        Guided diagnosis
                      </h2>
                      <p className="support-copy mt-3 text-sm">
                        {(!diagnosticNoUsableSource && diagnosticFallbackMessage) ||
                          "We'll retrieve trustworthy guidance and work through the issue with you."}
                      </p>
                      {diagnosticNoUsableSource && diagnosticFallbackMessage && (
                        <div className="notice-panel" role="status">
                          <h3>We couldn&apos;t find a usable diagnostic guide</h3>
                          <p>{diagnosticFallbackMessage}</p>
                          <p>
                            Try describing the problem differently, or check the
                            manufacturer&apos;s official support page for this model.
                          </p>
                        </div>
                      )}
                      <label
                        htmlFor="diagnostic-symptom"
                        className="mt-6 block text-sm font-semibold text-slate-900"
                      >
                        What is happening?
                      </label>
                      <textarea
                        id="diagnostic-symptom"
                        value={diagnosticSymptom}
                        onChange={(event) => setDiagnosticSymptom(event.target.value)}
                        rows={3}
                        className="field-input mt-3 p-4 text-sm leading-6"
                      />
                      {diagnosticLoading && (
                        <div className="loading-state mt-5" role="status">
                          <span className="loading-indicator" aria-hidden="true" />
                          <span>Checking available diagnostic guidance…</span>
                        </div>
                      )}
                      {diagnosticRequestError && (
                        <div className="notice-panel notice-error" role="alert">
                          <p>{diagnosticRequestError}</p>
                          <button
                            type="button"
                            onClick={startDiagnostic}
                            className="text-action focus-ring"
                          >
                            Try again
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={startDiagnostic}
                        disabled={!diagnosticSymptom.trim() || diagnosticLoading}
                        className="primary-action focus-ring mt-5 w-full"
                      >
                        Start diagnosis
                      </button>
                    </section>
                  </>
                ) : (
                  <>
                    <div className="diagnosis-toolbar">
                      <button
                        type="button"
                        onClick={goBackDiagnostic}
                        className="text-action focus-ring"
                      >
                        Back
                      </button>
                      {diagnosticSession.outcome !== "ended" &&
                        diagnosticSession.currentStep < diagnosticSession.checks.length && (
                          <button
                            type="button"
                            onClick={endDiagnostic}
                            className="text-action focus-ring"
                          >
                            End diagnosis
                          </button>
                        )}
                    </div>

                    <header className="diagnosis-header">
                      <p className="section-eyebrow">DIAGNOSIS</p>
                      <h2>{diagnosticSession.device}</h2>
                      <p>{diagnosticSession.symptom}</p>
                    </header>

                    {diagnosticSession.outcome === "ended" ? (
                      <section className="diagnosis-completion mt-6" aria-live="polite">
                        <p className="section-eyebrow">SESSION ENDED</p>
                        <h3>Diagnosis ended</h3>
                        <p>
                          These local demo checks do not confirm a cause or verify a repair.
                        </p>
                        <div className="diagnosis-outcome-actions">
                            <DiagnosticOutcome outcome={diagnosticSession.lastOutcome} />
                          <button
                            type="button"
                            onClick={() => setDiagnosticSession((session) => ({ ...session, outcome: null }))}
                            className="primary-action focus-ring"
                          >
                            Resume diagnosis
                          </button>
                          <button
                            type="button"
                            onClick={returnFromDiagnostic}
                            className="secondary-action focus-ring"
                          >
                            Back to object
                          </button>
                        </div>
                      </section>
                    ) : (
                      <div className="diagnosis-layout mt-6">
                        <ol className="diagnosis-timeline" aria-label="Diagnostic progress">
                          {diagnosticSession.checks.map((check, index) => (
                            <li
                              key={check.id}
                              className={`diagnosis-timeline-item diagnosis-${check.status}`}
                              aria-current={check.status === "current" ? "step" : undefined}
                            >
                              <span className="diagnosis-step-marker" aria-hidden="true">
                                {check.status === "completed" ? "✓" : check.status === "current" ? "→" : "○"}
                              </span>
                              <span className="diagnosis-step-copy">
                                <span className="diagnosis-step-label">
                                  {check.status === "completed"
                                    ? `Check ${index + 1} · ${check.result}`
                                    : check.status === "current"
                                      ? `Current check · ${index + 1} of ${diagnosticSession.checks.length}`
                                      : `Upcoming · ${index + 1}`}
                                </span>
                                <span className="diagnosis-step-question">{check.question}</span>
                              </span>
                            </li>
                          ))}
                        </ol>

                        {diagnosticSession.currentStep < diagnosticSession.checks.length ? (
                          <section className="diagnosis-check-card" aria-live="polite">
                            <p className="section-eyebrow">
                              CHECK {diagnosticSession.currentStep + 1} OF {diagnosticSession.checks.length}
                            </p>
                            <h3>
                              {diagnosticSession.checks[diagnosticSession.currentStep].question}
                            </h3>
                            {visualEvidenceRequest && (
                              <>
                                <input
                                  ref={diagnosticEvidenceInputRef}
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={handleDiagnosticEvidenceFile}
                                  className="sr-only"
                                />
                                {!diagnosticEvidencePreview && !activeEvidenceCaptured && (
                                  <div className="diagnosis-check-note">
                                    <p>{visualEvidenceRequest.prompt}</p>
                                    <button
                                      type="button"
                                      onClick={openDiagnosticEvidence}
                                      className="text-action focus-ring mt-2"
                                    >
                                      {visualEvidenceRequest.actionLabel}
                                    </button>
                                  </div>
                                )}
                                {diagnosticEvidencePreview && (
                                  <div className="mt-4">
                                    <div className="capture-preview">
                                      <img src={diagnosticEvidencePreview} alt="Diagnostic visual evidence" />
                                    </div>
                                    {diagnosticEvidenceLoading && (
                                      <div className="loading-state mt-3" role="status">
                                        <span className="loading-indicator" aria-hidden="true" />
                                        <span>Reading the evidence…</span>
                                      </div>
                                    )}
                                    {activeEvidenceObservation ? (
                                      <p className="diagnosis-check-note" role="status">
                                        <strong>Observation ({activeEvidenceObservation.confidence} confidence):</strong>{" "}
                                        {activeEvidenceObservation.observation}
                                        {activeEvidenceObservation.visibleEvidence?.length > 0 && (
                                          <span className="block mt-2">
                                            <strong>Visible evidence:</strong>{" "}
                                            {activeEvidenceObservation.visibleEvidence.join(" ")}
                                          </span>
                                        )}
                                        {activeEvidenceObservation.cannotDetermine?.length > 0 && (
                                          <span className="block mt-2">
                                            <strong>Cannot determine:</strong>{" "}
                                            {activeEvidenceObservation.cannotDetermine.join(" ")}
                                          </span>
                                        )}
                                        {activeEvidenceObservation.suggestedNextAction && (
                                          <span className="block mt-2">
                                            <strong>Suggested next action:</strong>{" "}
                                            {activeEvidenceObservation.suggestedNextAction}
                                          </span>
                                        )}
                                        {activeEvidenceObservation.safetyNote && (
                                          <span className="block mt-2">
                                            <strong>Safety:</strong>{" "}
                                            {activeEvidenceObservation.safetyNote}
                                          </span>
                                        )}
                                      </p>
                                    ) : activeEvidenceSkipped ? (
                                      <p className="diagnosis-check-note" role="status">
                                        Continuing without AI analysis. The photo does not establish the cause.
                                      </p>
                                    ) : (
                                      <div className="diagnosis-outcome-actions mt-3">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            clearDiagnosticEvidence();
                                            openDiagnosticEvidence();
                                          }}
                                          className="secondary-action focus-ring"
                                        >
                                          Retake
                                        </button>
                                        <button
                                          type="button"
                                          onClick={useDiagnosticEvidence}
                                          className="primary-action focus-ring"
                                        >
                                          Use this photo
                                        </button>
                                      </div>
                                    )}
                                    {diagnosticEvidenceError && (
                                      <div className="notice-panel notice-error" role="alert">
                                        <p>{diagnosticEvidenceError}</p>
                                        <div className="diagnosis-outcome-actions">
                                          <button
                                            type="button"
                                            onClick={useDiagnosticEvidence}
                                            className="secondary-action focus-ring"
                                            disabled={diagnosticEvidenceLoading}
                                          >
                                            Try again
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              clearDiagnosticEvidence();
                                              openDiagnosticEvidence();
                                            }}
                                            className="secondary-action focus-ring"
                                          >
                                            Retake photo
                                          </button>
                                          <button
                                            type="button"
                                            onClick={continueWithoutEvidenceAnalysis}
                                            className="text-action focus-ring"
                                          >
                                            Continue without AI analysis
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {diagnosticEvidenceError && !diagnosticEvidencePreview && (
                                  <p className="diagnosis-check-note" role="alert">
                                    {diagnosticEvidenceError}
                                  </p>
                                )}
                              </>
                            )}
                            <p className="diagnosis-check-note">
                              Check the object, then choose the answer that best matches what you see.
                            </p>
                            {diagnosticLoading && (
                              <div className="loading-state mt-3" role="status">
                                <span className="loading-indicator" aria-hidden="true" />
                                <span>Reasoning about the next check…</span>
                              </div>
                            )}
                            {diagnosticSession.outcome === "narrowing-further" && (
                              <p className="diagnosis-outcome-note" role="status">
                                Let&apos;s narrow it down further. We still have another check to try.
                              </p>
                            )}
                            <DiagnosticOutcome outcome={diagnosticSession.lastOutcome} />
                            <div className="diagnosis-answer-list">
                              {[
                                ["yes", "Yes"],
                                ["no", "No"],
                                ["unsure", "I'm not sure"],
                              ].map(([answer, label]) => (
                                <button
                                  key={answer}
                                  type="button"
                                  onClick={() => recordDiagnosticAnswer(answer)}
                                  disabled={diagnosticLoading}
                                  className="diagnosis-answer focus-ring"
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </section>
                        ) : (
                          <section className="diagnosis-completion" aria-live="polite">
                            <p className="section-eyebrow">DIAGNOSIS</p>
                            {diagnosticSession.checks.some((check) => check.status === "completed") ? (
                              <>
                                <h3>Diagnostic checks complete</h3>
                                <p>
                                  {diagnosticSession.terminalOutcome?.message || "The available checks are complete. They do not establish a cause or confirm that the object is fixed."}
                                </p>
                              </>
                            ) : (
                              <>
                                <h3>We couldn&apos;t find a usable diagnostic guide</h3>
                                <p>
                                  No diagnostic checks were run. The documentation we retrieved did not
                                  contain troubleshooting steps relevant to this model and problem, so we
                                  are not able to guide a diagnosis.
                                </p>
                              </>
                            )}
                            {diagnosticSession.terminalOutcome && (
                              <DiagnosticOutcome
                                outcome={{
                                  text: diagnosticSession.terminalOutcome.message,
                                  sourceTitle: diagnosticSession.terminalOutcome.sourceTitle,
                                  sourceUrl: diagnosticSession.terminalOutcome.sourceUrl,
                                  safetyNote: diagnosticSession.terminalOutcome.safetyNote,
                                }}
                              />
                            )}
                            <DiagnosticOutcome outcome={diagnosticSession.lastOutcome} />
                            <div className="diagnosis-outcome-actions">
                              <button
                                type="button"
                                onClick={startDiagnostic}
                                className="secondary-action focus-ring"
                              >
                                Try another check
                              </button>
                              <button
                                type="button"
                                onClick={() => setDiagnosticSession((session) => ({ ...session, outcome: "user-reported-fixed" }))}
                                className="secondary-action focus-ring"
                              >
                                I fixed it
                              </button>
                              <button
                                type="button"
                                onClick={handleStillNotWorking}
                                className="secondary-action focus-ring"
                              >
                                Still not working
                              </button>
                            </div>
                            {diagnosticSession.outcome === "user-reported-fixed" && (
                              <p className="diagnosis-outcome-note" role="status">
                                You reported that it&apos;s working. This demo does not verify the repair.
                              </p>
                            )}
                            {diagnosticSession.outcome === "still-not-working" && (
                              <p className="diagnosis-outcome-note" role="status">
                                We couldn&apos;t confirm the cause from the available checks. Follow the documented next step or contact the manufacturer&apos;s service center if the problem persists.
                              </p>
                            )}
                            {diagnosticSession.outcome === "narrowing-further" && (
                              <p className="diagnosis-outcome-note" role="status">
                                Let&apos;s narrow it down further. We still have another check to try.
                              </p>
                            )}
                          </section>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : selectedIntent === "ask" ? (
              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIntent(null);
                    setProblem("");
                    setHelpResult(null);
                    setHelpError(null);
                  }}
                  className="text-action focus-ring"
                >
                  ← Back to object
                </button>

                <div className="help-workspace mt-6">
                  <div className="question-panel">
                  <p className="section-eyebrow">
                    {intents.find((intent) => intent.key === selectedIntent)?.title}
                  </p>

                  <h2 className="mt-3 font-serif text-3xl font-normal text-slate-950">
                    Ask anything
                  </h2>

                  <p className="support-copy mt-3 text-sm">
                    Ask a natural-language question about the identified object
                    and get a clear, practical answer.
                  </p>

                  <div className="mt-7">
                    <label
                      htmlFor="ask-question"
                      className="text-sm font-semibold text-slate-900"
                    >
                      Your question
                    </label>
                    <textarea
                      id="ask-question"
                      value={problem}
                      onChange={(e) => setProblem(e.target.value)}
                      rows={4}
                      placeholder="Can I use this camera with my iPhone?"
                      className="field-input mt-3 p-4 text-sm leading-6"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleGetHelp}
                    disabled={!problem.trim() || helpLoading}
                    className="primary-action focus-ring mt-5 w-full"
                  >
                    {helpLoading ? "Working…" : "Get answer"}
                  </button>

                  {helpError && (
                    <HelpError message={helpError} onRetry={handleGetHelp} />
                  )}
                </div>
                  <HelpAnswer result={helpResult} question={problem} object={result} />
                </div>
              </div>
            ) : selectedIntent === "fix" ? (
              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIntent(null);
                    setProblem("");
                    setHelpResult(null);
                    setHelpError(null);
                  }}
                  className="text-action focus-ring"
                >
                  ← Back to object
                </button>

                <div className="help-workspace mt-6">
                  <div className="question-panel">
                  <p className="section-eyebrow">
                    Fix a problem
                  </p>

                  <h2 className="mt-3 font-serif text-3xl font-normal text-slate-950">
                    What&apos;s going wrong?
                  </h2>

                  <p className="support-copy mt-3 text-sm">
                    Tell me what&apos;s happening and I&apos;ll help you figure
                    out what to try.
                  </p>

                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    aria-label="Describe the problem"
                    rows={4}
                    placeholder="For example: It turns on, but there is no sound."
                    className="field-input mt-5 p-4 text-sm leading-6"
                  />

                  <button
                    type="button"
                    onClick={handleGetHelp}
                    disabled={!problem.trim() || helpLoading}
                    className="primary-action focus-ring mt-5 w-full"
                  >
                    {helpLoading ? "Working…" : "Get help"}
                  </button>

                  {helpError && (
                    <HelpError message={helpError} onRetry={handleGetHelp} />
                  )}
                </div>
                  <HelpAnswer result={helpResult} question={problem} object={result} />
                </div>
              </div>
            ) : selectedIntent === "setup" ? (
              // NEW setup screen
              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIntent(null);
                    setProblem("");
                    setHelpResult(null);
                    setHelpError(null);
                  }}
                  className="text-action focus-ring"
                >
                  ← Back to object
                </button>

                <div className="help-workspace mt-6">
                  <div className="question-panel">
                  <p className="section-eyebrow">
                    Set it up
                  </p>

                  <h2 className="mt-3 font-serif text-3xl font-normal text-slate-950">
                    What are you trying to set up?
                  </h2>

                  <p className="support-copy mt-3 text-sm">
                    Tell me what you&apos;re trying to do and I&apos;ll walk you
                    through it.
                  </p>

                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    aria-label="Describe what you want to set up"
                    rows={4}
                    placeholder="For example: I want to connect this TV to Wi-Fi."
                    className="field-input mt-5 p-4 text-sm leading-6"
                  />

                  <button
                    type="button"
                    onClick={handleGetHelp}
                    disabled={!problem.trim() || helpLoading}
                    className="primary-action focus-ring mt-5 w-full"
                  >
                    {helpLoading ? "Working…" : "Get setup help"}
                  </button>

                  {helpError && (
                    <HelpError message={helpError} onRetry={handleGetHelp} />
                  )}
                </div>
                  <HelpAnswer result={helpResult} question={problem} object={result} />
                </div>
              </div>
            ) : selectedIntent === "learn" ? (
              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIntent(null);
                    setProblem("");
                    setHelpResult(null);
                    setHelpError(null);
                  }}
                  className="text-action focus-ring"
                >
                  ← Back to object
                </button>

                <div className="help-workspace mt-6">
                  <div className="question-panel">
                  <p className="section-eyebrow">
                    Learn to use it
                  </p>

                  <h2 className="mt-3 font-serif text-3xl font-normal text-slate-950">
                    What do you want to know?
                  </h2>

                  <p className="support-copy mt-3 text-sm">
                    Tell me what you&apos;re trying to do and I&apos;ll explain
                    how it works.
                  </p>

                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    aria-label="Ask what you would like to learn"
                    rows={4}
                    placeholder="For example: How do I change the picture settings?"
                    className="field-input mt-5 p-4 text-sm leading-6"
                  />

                  <button
                    type="button"
                    onClick={handleGetHelp}
                    disabled={!problem.trim() || helpLoading}
                    className="primary-action focus-ring mt-5 w-full"
                  >
                    {helpLoading ? "Working…" : "Get help"}
                  </button>

                  {helpError && (
                    <HelpError message={helpError} onRetry={handleGetHelp} />
                  )}
                </div>
                  <HelpAnswer result={helpResult} question={problem} object={result} />
                </div>
              </div>
            ) : selectedIntent === "maintain" ? (
              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIntent(null);
                    setProblem("");
                    setHelpResult(null);
                    setHelpError(null);
                  }}
                  className="text-action focus-ring"
                >
                  ← Back to object
                </button>

                <div className="help-workspace mt-6">
                  <div className="question-panel">
                  <p className="section-eyebrow">
                    Maintain it
                  </p>

                  <h2 className="mt-3 font-serif text-3xl font-normal text-slate-950">
                    How do you want to take care of it?
                  </h2>

                  <p className="support-copy mt-3 text-sm">
                    Tell me what you want to maintain or check and I&apos;ll
                    guide you through it.
                  </p>

                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    aria-label="Describe what you want to maintain"
                    rows={4}
                    placeholder="For example: How should I clean this TV screen?"
                    className="field-input mt-5 p-4 text-sm leading-6"
                  />

                  <button
                    type="button"
                    onClick={handleGetHelp}
                    disabled={!problem.trim() || helpLoading}
                    className="primary-action focus-ring mt-5 w-full"
                  >
                    {helpLoading ? "Working…" : "Get maintenance help"}
                  </button>

                  {helpError && (
                    <HelpError message={helpError} onRetry={handleGetHelp} />
                  )}
                </div>
                  <HelpAnswer result={helpResult} question={problem} object={result} />
                </div>
              </div>
            ) : selectedIntent === "manual" ? (
              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => setSelectedIntent(null)}
                  className="text-action focus-ring"
                >
                  ← Back to object
                </button>

                <div className="question-panel mt-6">
                  <p className="section-eyebrow">
                    Find the manual
                  </p>

                  <h2 className="mt-3 font-serif text-3xl font-normal text-slate-950">
                    Looking for the manual?
                  </h2>

                  <p className="support-copy mt-3 text-sm">
                    I&apos;ll search for documentation for this exact object.
                  </p>

                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(
                      `${result.brand || ""} ${result.product || ""} ${
                        result.model || ""
                      } manual`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="primary-action focus-ring mt-6 w-full"
                  >
                    Search for the manual
                  </a>
                </div>
              </div>
            ) : selectedIntent === "tutorial" ? (
              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => setSelectedIntent(null)}
                  className="text-action focus-ring"
                >
                  ← Back to object
                </button>

                <div className="question-panel mt-6">
                  <p className="section-eyebrow">
                    Watch a tutorial
                  </p>

                  <h2 className="mt-3 font-serif text-3xl font-normal text-slate-950">
                    What do you want to learn?
                  </h2>

                  <p className="support-copy mt-3 text-sm">
                    I&apos;ll find tutorials for this exact object.
                  </p>

                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(
                      `${result.brand || ""} ${result.product || ""} ${
                        result.model || ""
                      } tutorial`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="primary-action focus-ring mt-6 w-full"
                  >
                    Search YouTube
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-10">
                <button
                  type="button"
                  onClick={() => setSelectedIntent(null)}
                  className="text-action focus-ring"
                >
                  ← Back to object
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
