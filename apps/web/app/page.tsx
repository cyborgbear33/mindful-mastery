"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import rehypeKatex from "rehype-katex";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { normalizeWorksheetMarkdown } from "@/lib/normalize-worksheet-markdown";

type Tab = "worksheet" | "plan" | "audit" | "prompt";
type Depth = "introductory" | "standard" | "advanced";
type WorksheetResponseFormat =
  | "auto"
  | "open_ended"
  | "fill_in"
  | "multiple_choice"
  | "true_false"
  | "mixed"
  | "quiz"
  | "test";

type WorksheetContentMode = "full" | "practice_only" | "information_only";

type ContentModeOption = {
  id: WorksheetContentMode;
  label: string;
  description: string;
  icon: string;
};

const PRACTICE_FORMAT_OPTIONS: { id: WorksheetResponseFormat; label: string }[] = [
  { id: "auto", label: "Let AI choose" },
  { id: "open_ended", label: "Short answer" },
  { id: "fill_in", label: "Fill in the blank" },
  { id: "multiple_choice", label: "Multiple choice" },
  { id: "true_false", label: "True or false" },
  { id: "mixed", label: "Mix of types" },
  { id: "quiz", label: "Quiz style" },
  { id: "test", label: "Test style" }
];

const CONTENT_MODE_OPTIONS: ContentModeOption[] = [
  {
    id: "full",
    label: "Complete Worksheet",
    description: "Teaching information and practice problems together — best for a full lesson.",
    icon: "📘"
  },
  {
    id: "practice_only",
    label: "Practice Problems Only",
    description:
      "Dense, varied exercises across many problem types — great for homework, review, or quiz prep.",
    icon: "✏️"
  },
  {
    id: "information_only",
    label: "Lesson Information Only",
    description: "Definitions and explanations without exercises — use for reading or teaching notes.",
    icon: "📖"
  }
];

type DomainId =
  | "self"
  | "trivium"
  | "quadrivium"
  | "science_analysis"
  | "engineering_art_architecture_craftsmanship"
  | "integration_theory_of_all";

type OntologySubdomain = {
  id: string;
  label: string;
  complexity_index: number;
  complexity_band: "foundational" | "intermediate" | "advanced";
  description: string;
};

type DomainDefinition = {
  label: string;
  description: string;
  min_required_subdomains: number;
  subdomains: OntologySubdomain[];
};

type DomainOntology = {
  spec_name: string;
  spec_version: string;
  domains: Record<DomainId, DomainDefinition>;
};

type GenerateLessonResponse = {
  normalized_request: { topic: string; request_id: string };
  learner_model: {
    current_knowledge_context: string;
    target_knowledge_context: string;
    transformation_goal: string;
  };
  lesson_plan: Record<string, unknown>;
  llm_prompt: string;
  reasoning_context: Record<string, unknown>;
  worksheet: string;
  audit_result: {
    constitutional_pass: boolean;
    summary_rating: string;
    category_scores: { category: string; score: number }[];
    missing_sections: string[];
  };
  quality_metrics: {
    schema_valid: boolean;
    audit_pass: boolean;
    heading_count: number;
    required_section_coverage: number;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const defaultWorksheetDateValue = (): string => new Date().toISOString().slice(0, 10);

function RequiredMark() {
  return (
    <span style={{ color: "#f28b82", marginLeft: "0.15rem" }} aria-hidden="true">
      *
    </span>
  );
}

function RecommendedHint() {
  return (
    <span style={{ color: "#9aa0a6", fontWeight: 400, marginLeft: "0.35rem", fontSize: "0.85rem" }}>
      (recommended)
    </span>
  );
}

function resolveSubdomainValue(
  input: string,
  options: OntologySubdomain[]
): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  const byId = options.find((item) => item.id === trimmed);
  if (byId) return byId.id;

  const byLabel = options.find(
    (item) => item.label.toLowerCase() === trimmed.toLowerCase()
  );
  if (byLabel) return byLabel.id;

  return trimmed;
}

export default function HomePage() {
  const [topicFocus, setTopicFocus] = useState("");
  const [worksheetHeaderName, setWorksheetHeaderName] = useState("");
  const [worksheetHeaderDate, setWorksheetHeaderDate] = useState(defaultWorksheetDateValue);
  const [worksheetHeaderDescription, setWorksheetHeaderDescription] = useState("");
  const [currentKnowledgeContext, setCurrentKnowledgeContext] = useState("");
  const [depth, setDepth] = useState<Depth>("standard");
  const [domain, setDomain] = useState<DomainId | "">("");
  const [subdomainInput, setSubdomainInput] = useState("");
  const [showSubdomainSuggestions, setShowSubdomainSuggestions] = useState(false);
  const [worksheetResponseFormat, setWorksheetResponseFormat] =
    useState<WorksheetResponseFormat>("auto");
  const [worksheetContentMode, setWorksheetContentMode] =
    useState<WorksheetContentMode>("full");
  const [ontology, setOntology] = useState<DomainOntology | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateLessonResponse | null>(null);
  const [tab, setTab] = useState<Tab>("worksheet");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);
  const subdomainBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generateAbortRef = useRef<AbortController | null>(null);
  const loadingStartedAtRef = useRef<number | null>(null);

  const worksheetMarkdown = useMemo(
    () => (result?.worksheet ? normalizeWorksheetMarkdown(result.worksheet) : ""),
    [result?.worksheet]
  );

  const tabs: { id: Tab; label: string }[] = useMemo(
    () => [
      { id: "worksheet", label: "Worksheet" },
      { id: "plan", label: "Lesson Plan" },
      { id: "audit", label: "Audit" },
      { id: "prompt", label: "Prompt Transparency" }
    ],
    []
  );

  const subdomainOptions = useMemo(() => {
    if (!domain || !ontology) return [];
    return ontology.domains[domain]?.subdomains ?? [];
  }, [ontology, domain]);

  const filteredSubdomainOptions = useMemo(() => {
    const query = subdomainInput.trim().toLowerCase();
    if (!query) return subdomainOptions;
    return subdomainOptions.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
    );
  }, [subdomainInput, subdomainOptions]);

  const loadingPhases = useMemo(
    () => [
      "Preparing lesson context",
      "Planning worksheet structure",
      "Building exercises and examples",
      "Finalizing output"
    ],
    []
  );

  useEffect(() => {
    const loadOntology = async () => {
      try {
        const response = await fetch(`${API_URL}/ontology`);
        if (!response.ok) {
          throw new Error(`Failed to load ontology (${response.status})`);
        }
        const data = (await response.json()) as DomainOntology;
        setOntology(data);
      } catch {
        setOntology(null);
      }
    };

    loadOntology().catch(() => {
      // handled by local state update
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(0);
      setLoadingPhaseIndex(0);
      loadingStartedAtRef.current = null;
      return;
    }

    const progressProfile =
      worksheetContentMode === "practice_only"
        ? { maxProgress: 95, curveMs: 2800, phaseIntervalMs: 900 }
        : worksheetContentMode === "information_only"
          ? { maxProgress: 96, curveMs: 6000, phaseIntervalMs: 1200 }
          : { maxProgress: 96, curveMs: 12000, phaseIntervalMs: 1700 };

    const progressTimer = setInterval(() => {
      const start = loadingStartedAtRef.current ?? Date.now();
      const elapsedMs = Date.now() - start;
      const projected = Math.round(
        progressProfile.maxProgress * (1 - Math.exp(-elapsedMs / progressProfile.curveMs))
      );
      setLoadingProgress((prev) => Math.max(prev, Math.min(projected, progressProfile.maxProgress)));
    }, 300);

    const phaseTimer = setInterval(() => {
      setLoadingPhaseIndex((prev) => (prev + 1) % loadingPhases.length);
    }, progressProfile.phaseIntervalMs);

    return () => {
      clearInterval(progressTimer);
      clearInterval(phaseTimer);
    };
  }, [loading, loadingPhases, worksheetContentMode]);

  useEffect(() => {
    if (!showPrintPreview) {
      document.body.classList.remove("print-preview-active");
      return;
    }

    document.body.classList.add("print-preview-active");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowPrintPreview(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("print-preview-active");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showPrintPreview]);

  useEffect(() => {
    setSubdomainInput("");
    setShowSubdomainSuggestions(false);
  }, [domain]);

  useEffect(() => {
    return () => {
      document.body.classList.remove("print-preview-active");
      if (subdomainBlurTimeout.current) {
        clearTimeout(subdomainBlurTimeout.current);
      }
      generateAbortRef.current?.abort();
    };
  }, []);

  const stopGeneration = () => {
    generateAbortRef.current?.abort();
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    generateAbortRef.current?.abort();
    setShowPrintPreview(false);
    const controller = new AbortController();
    generateAbortRef.current = controller;
    loadingStartedAtRef.current = Date.now();
    setLoadingProgress(2);
    setLoadingPhaseIndex(0);
    setLoading(true);
    setError(null);

    const explicitSubdomain = resolveSubdomainValue(subdomainInput, subdomainOptions);
    if (!domain) {
      setError("Please select a domain.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/lesson/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          topic: topicFocus.trim() || undefined,
          topic_source: "free_text",
          requested_output_type: "worksheet",
          worksheet_header_name: worksheetHeaderName.trim() || undefined,
          worksheet_header_date: worksheetHeaderDate.trim() || undefined,
          worksheet_header_description: worksheetHeaderDescription.trim() || undefined,
          explicit_domain: domain,
          explicit_subdomain: explicitSubdomain,
          current_knowledge_context: currentKnowledgeContext || undefined,
          requested_depth: depth,
          worksheet_response_format:
            worksheetContentMode === "practice_only" ? worksheetResponseFormat : "auto",
          worksheet_content_mode: worksheetContentMode,
          user_constraints: []
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `API error ${response.status}`);
      }

      const data = (await response.json()) as GenerateLessonResponse;
      setResult(data);
      setLoadingProgress(100);
      setTab("worksheet");
      setCopyStatus("idle");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      const message = err instanceof Error ? err.message : "Request failed";
      const detail =
        message === "Failed to fetch"
          ? "Could not reach the lesson API. Restart it with pnpm dev:app if it stopped responding."
          : message;
      setError(
        `API unavailable or generation failed: ${detail} Ensure the API is running with CURSOR_API_KEY or use the fake adapter in tests.`
      );
      setResult(null);
    } finally {
      if (generateAbortRef.current === controller) {
        generateAbortRef.current = null;
      }
      loadingStartedAtRef.current = null;
      setLoading(false);
    }
  };

  const copyWorksheetMarkdown = async () => {
    if (!worksheetMarkdown) return;

    try {
      await navigator.clipboard.writeText(worksheetMarkdown);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("failed");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  };

  const openPrintPreview = () => {
    if (!worksheetMarkdown) return;
    setShowPrintPreview(true);
  };

  const closePrintPreview = () => {
    setShowPrintPreview(false);
  };

  const printFromPreview = () => {
    window.print();
  };

  return (
    <>
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.5rem" }}>
      <header style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem" }}>Mindful Mastery</h1>
        <p style={{ color: "#9aa0a6", marginTop: "0.5rem" }}>
          Constitution-bound lesson worksheet generator
        </p>
      </header>

      <form
        onSubmit={onSubmit}
        style={{
          display: "grid",
          gap: "1rem",
          padding: "1.25rem",
          background: "#1a1d23",
          borderRadius: 8,
          marginBottom: "1.5rem"
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <label>
            Name
            <input
              value={worksheetHeaderName}
              onChange={(e) => setWorksheetHeaderName(e.target.value)}
              style={inputStyle}
              placeholder="Student or class name"
            />
          </label>
          <label>
            Date
            <input
              type="date"
              value={worksheetHeaderDate}
              onChange={(e) => setWorksheetHeaderDate(e.target.value)}
              style={inputStyle}
            />
          </label>
          <label>
            Notes
            <input
              value={worksheetHeaderDescription}
              onChange={(e) => setWorksheetHeaderDescription(e.target.value)}
              style={inputStyle}
              placeholder="Period, assignment, or other notes"
            />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <label>
            Domain
            <RequiredMark />
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value as DomainId)}
              style={inputStyle}
              required
            >
              <option value="" disabled>
                Select a domain
              </option>
              <option value="self">Self</option>
              <option value="trivium">Trivium</option>
              <option value="quadrivium">Quadrivium</option>
              <option value="science_analysis">Science / Analysis</option>
              <option value="engineering_art_architecture_craftsmanship">Engineering / Art / Craft</option>
              <option value="integration_theory_of_all">Integration</option>
            </select>
          </label>
          <label style={{ position: "relative" }}>
            Subdomain
            <RecommendedHint />
            <input
              value={subdomainInput}
              onChange={(e) => {
                setSubdomainInput(e.target.value);
                setShowSubdomainSuggestions(true);
              }}
              onFocus={() => setShowSubdomainSuggestions(true)}
              onBlur={() => {
                subdomainBlurTimeout.current = setTimeout(() => {
                  setShowSubdomainSuggestions(false);
                }, 150);
              }}
              placeholder="Search or type a subdomain"
              style={inputStyle}
              autoComplete="off"
            />
            <span style={{ display: "block", marginTop: "0.35rem", color: "#9aa0a6", fontSize: "0.85rem" }}>
              Recommended scope within the selected domain.
            </span>
            {showSubdomainSuggestions && subdomainOptions.length > 0 && (
              <div style={suggestionPanelStyle}>
                {filteredSubdomainOptions.length === 0 && (
                  <div style={suggestionStyle}>
                    No match. Your typed text will be used.
                  </div>
                )}
                {filteredSubdomainOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    style={suggestionButtonStyle}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSubdomainInput(item.label);
                      setShowSubdomainSuggestions(false);
                    }}
                  >
                    {item.label} (c{item.complexity_index})
                  </button>
                ))}
              </div>
            )}
          </label>
          <label>
            Topic focus
            <RecommendedHint />
            <input
              value={topicFocus}
              onChange={(e) => setTopicFocus(e.target.value)}
              style={inputStyle}
              placeholder="Narrow the lesson, e.g. fractions on a number line"
            />
            <span style={{ display: "block", marginTop: "0.35rem", color: "#9aa0a6", fontSize: "0.85rem" }}>
              Optional focus within the domain and subdomain you selected above.
            </span>
          </label>
        </div>
        <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
          <legend style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
            What do you need?
          </legend>
          <p style={{ color: "#9aa0a6", margin: "0 0 0.75rem", fontSize: "0.95rem" }}>
            Choose the kind of handout to create. You can always generate another version later.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "0.75rem"
            }}
          >
            {CONTENT_MODE_OPTIONS.map((option) => {
              const selected = worksheetContentMode === option.id;
              const isPractice = option.id === "practice_only";

              if (isPractice && selected) {
                return (
                  <div
                    key={option.id}
                    style={{
                      ...contentModeCardStyle,
                      borderColor: "#3d5afe",
                      background: "#222a45",
                      boxShadow: "0 0 0 1px #3d5afe"
                    }}
                  >
                    <button
                      type="button"
                      aria-pressed
                      onClick={() => setWorksheetContentMode(option.id)}
                      style={contentModeCardButtonStyle}
                    >
                      <span style={{ fontSize: "1.35rem" }}>{option.icon}</span>
                      <strong style={{ display: "block", marginTop: "0.35rem" }}>{option.label}</strong>
                      <span
                        style={{
                          display: "block",
                          marginTop: "0.35rem",
                          color: "#b8bec7",
                          fontSize: "0.9rem",
                          lineHeight: 1.45
                        }}
                      >
                        {option.description}
                      </span>
                    </button>
                    <label style={{ display: "block", marginTop: "0.85rem" }}>
                      Practice problem format
                      <select
                        value={worksheetResponseFormat}
                        onChange={(e) =>
                          setWorksheetResponseFormat(e.target.value as WorksheetResponseFormat)
                        }
                        style={inputStyle}
                      >
                        {PRACTICE_FORMAT_OPTIONS.map((format) => (
                          <option key={format.id} value={format.id}>
                            {format.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              }

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setWorksheetContentMode(option.id);
                    if (option.id !== "practice_only") {
                      setWorksheetResponseFormat("auto");
                    }
                  }}
                  style={{
                    ...contentModeCardStyle,
                    cursor: "pointer",
                    borderColor: selected ? "#3d5afe" : "#3a3f4b",
                    background: selected ? "#222a45" : "#0f1115",
                    boxShadow: selected ? "0 0 0 1px #3d5afe" : "none"
                  }}
                >
                  <span style={{ fontSize: "1.35rem" }}>{option.icon}</span>
                  <strong style={{ display: "block", marginTop: "0.35rem" }}>{option.label}</strong>
                  <span
                    style={{
                      display: "block",
                      marginTop: "0.35rem",
                      color: "#b8bec7",
                      fontSize: "0.9rem",
                      lineHeight: 1.45
                    }}
                  >
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <label>
          Depth
          <select
            value={depth}
            onChange={(e) => setDepth(e.target.value as typeof depth)}
            style={inputStyle}
          >
            <option value="introductory">Introductory</option>
            <option value="standard">Standard</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
        <label>
          Current knowledge context
          <textarea
            value={currentKnowledgeContext}
            onChange={(e) => setCurrentKnowledgeContext(e.target.value)}
            rows={2}
            style={inputStyle}
            placeholder="Example: I can use ratios in recipes but cannot model them formally."
          />
        </label>
        <p style={{ color: "#9aa0a6", margin: 0, fontSize: "0.85rem" }}>
          <span style={{ color: "#f28b82" }}>*</span> Required ·{" "}
          <span style={{ fontWeight: 400 }}>(recommended)</span> suggested for better placement
        </p>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading
              ? "Generating…"
              : worksheetContentMode === "practice_only"
                ? "Generate Practice Problems"
                : worksheetContentMode === "information_only"
                  ? "Generate Lesson Information"
                  : "Generate Worksheet"}
          </button>
          {loading && (
            <button type="button" onClick={stopGeneration} style={stopButtonStyle}>
              Stop
            </button>
          )}
        </div>
      </form>

      {error && (
        <div
          style={{
            padding: "1rem",
            background: "#3b1f1f",
            borderRadius: 8,
            marginBottom: "1rem",
            color: "#f5c2c2"
          }}
        >
          {error}
        </div>
      )}

      {(result || loading) && (
        <section>
          {result && (
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  style={{
                    ...buttonStyle,
                    background: tab === t.id ? "#3d5afe" : "#2a2f3a",
                    padding: "0.5rem 1rem"
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              position: "relative",
              padding: "1.25rem",
              background: "#1a1d23",
              borderRadius: 8,
              minHeight: 300
            }}
          >
            {tab === "worksheet" && result && (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginBottom: "1rem",
                    flexWrap: "wrap",
                    alignItems: "center"
                  }}
                >
                  <button
                    type="button"
                    onClick={() => copyWorksheetMarkdown()}
                    style={secondaryButtonStyle}
                  >
                    {copyStatus === "copied"
                      ? "Copied!"
                      : copyStatus === "failed"
                        ? "Copy failed"
                        : "Copy Markdown"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPrintPreview()}
                    disabled={!worksheetMarkdown}
                    style={secondaryButtonStyle}
                  >
                    Export PDF
                  </button>
                </div>
                <article className="worksheet" style={worksheetArticleStyle}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {worksheetMarkdown}
                  </ReactMarkdown>
                </article>
              </>
            )}
            {tab === "plan" && result && (
              <pre style={{ overflow: "auto", fontSize: "0.85rem" }}>
                {JSON.stringify(result.lesson_plan, null, 2)}
              </pre>
            )}
            {tab === "audit" && result && (
              <div>
                <p>
                  <strong>Pass:</strong> {result.audit_result.constitutional_pass ? "Yes" : "No"} —{" "}
                  {result.audit_result.summary_rating}
                </p>
                <p>
                  <strong>Schema valid:</strong> {result.quality_metrics.schema_valid ? "Yes" : "No"}
                </p>
                <ul>
                  {result.audit_result.category_scores.map((c) => (
                    <li key={c.category}>
                      {c.category}: {c.score}/4
                    </li>
                  ))}
                </ul>
                {result.audit_result.missing_sections.length > 0 && (
                  <>
                    <strong>Missing sections:</strong>
                    <ul>
                      {result.audit_result.missing_sections.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            {tab === "prompt" && result && (
              <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>{result.llm_prompt}</pre>
            )}
            {!result && !loading && (
              <p style={{ color: "#9aa0a6", margin: 0 }}>
                Your generated worksheet will appear here.
              </p>
            )}
            {loading && (
              <div style={loadingOverlayStyle}>
                <div style={loadingPanelStyle}>
                  <strong style={{ display: "block", marginBottom: "0.35rem" }}>Generating handout…</strong>
                  <span style={{ color: "#b8bec7", fontSize: "0.9rem" }}>
                    {loadingPhases[loadingPhaseIndex]}
                  </span>
                  <div style={loadingBarTrackStyle}>
                    <div style={{ ...loadingBarFillStyle, width: `${loadingProgress}%` }} />
                  </div>
                  <span style={{ color: "#9aa0a6", fontSize: "0.82rem" }}>
                    {loadingProgress}% (estimated)
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </main>

    {showPrintPreview && (
      <div className="print-preview-overlay" role="dialog" aria-modal="true" aria-label="Print preview">
        <div className="print-preview-toolbar">
          <p>
            This preview stays open until you close it. Choose <strong>Print / Save as PDF</strong>, then pick
            &ldquo;Save as PDF&rdquo; in your browser&rsquo;s print dialog.
          </p>
          <button type="button" className="print-preview-primary" onClick={() => printFromPreview()}>
            Print / Save as PDF
          </button>
          <button type="button" onClick={() => closePrintPreview()}>
            Close
          </button>
        </div>
        <article className="print-preview-page">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
            {worksheetMarkdown}
          </ReactMarkdown>
        </article>
      </div>
    )}
    </>
  );
}

const worksheetArticleStyle: React.CSSProperties = {
  lineHeight: 1.6
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "0.35rem",
  padding: "0.6rem 0.75rem",
  background: "#0f1115",
  border: "1px solid #3a3f4b",
  borderRadius: 6,
  color: "#e8eaed",
  boxSizing: "border-box"
};

const buttonStyle: React.CSSProperties = {
  padding: "0.75rem 1.25rem",
  background: "#3d5afe",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "0.5rem 1rem",
  background: "#2a2f3a",
  color: "#e8eaed",
  border: "1px solid #3a3f4b",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
  fontSize: "0.9rem"
};

const stopButtonStyle: React.CSSProperties = {
  padding: "0.45rem 0.7rem",
  background: "transparent",
  color: "#f28b82",
  border: "1px solid #5c3a3a",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 500,
  fontSize: "0.82rem",
  lineHeight: 1.2
};

const contentModeCardStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.9rem 1rem",
  border: "1px solid #3a3f4b",
  borderRadius: 8,
  color: "#e8eaed"
};

const contentModeCardButtonStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: 0,
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer"
};

const suggestionPanelStyle: React.CSSProperties = {
  position: "absolute",
  top: "100%",
  left: 0,
  right: 0,
  marginTop: 6,
  border: "1px solid #3a3f4b",
  borderRadius: 6,
  background: "#0f1115",
  maxHeight: 220,
  overflowY: "auto",
  zIndex: 10
};

const suggestionStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem",
  color: "#cdd3da",
  fontSize: "0.9rem"
};

const suggestionButtonStyle: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  background: "transparent",
  border: "none",
  borderTop: "1px solid #242934",
  color: "#e8eaed",
  padding: "0.6rem 0.75rem",
  cursor: "pointer"
};

const loadingOverlayStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "rgba(15, 17, 21, 0.72)",
  borderRadius: 8,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "1rem",
  pointerEvents: "none",
  zIndex: 24
};

const loadingPanelStyle: React.CSSProperties = {
  width: "min(520px, 90%)",
  background: "rgba(26, 29, 35, 0.95)",
  border: "1px solid #3a3f4b",
  borderRadius: 8,
  padding: "0.9rem 1rem",
  boxShadow: "0 6px 20px rgba(0, 0, 0, 0.28)",
  color: "#e8eaed"
};

const loadingBarTrackStyle: React.CSSProperties = {
  marginTop: "0.7rem",
  marginBottom: "0.4rem",
  height: 8,
  borderRadius: 999,
  background: "#2a2f3a",
  overflow: "hidden"
};

const loadingBarFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, #3d5afe 0%, #6f86ff 100%)",
  transition: "width 280ms ease"
};
