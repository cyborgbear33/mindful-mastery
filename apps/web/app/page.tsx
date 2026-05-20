"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const [topic, setTopic] = useState("Attention as the Gate of Learning");
  const [audience, setAudience] = useState("Adult self-directed learner");
  const [currentKnowledgeContext, setCurrentKnowledgeContext] = useState("");
  const [depth, setDepth] = useState<Depth>("standard");
  const [domain, setDomain] = useState<DomainId>("self");
  const [subdomainInput, setSubdomainInput] = useState("");
  const [showSubdomainSuggestions, setShowSubdomainSuggestions] = useState(false);
  const [worksheetResponseFormat, setWorksheetResponseFormat] =
    useState<WorksheetResponseFormat>("auto");
  const [ontology, setOntology] = useState<DomainOntology | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateLessonResponse | null>(null);
  const [tab, setTab] = useState<Tab>("worksheet");
  const worksheetRef = useRef<HTMLElement>(null);
  const subdomainBlurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (!ontology) return [];
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
    setSubdomainInput("");
    setShowSubdomainSuggestions(false);
  }, [domain]);

  useEffect(() => {
    return () => {
      if (subdomainBlurTimeout.current) {
        clearTimeout(subdomainBlurTimeout.current);
      }
    };
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const explicitSubdomain = resolveSubdomainValue(subdomainInput, subdomainOptions);

    try {
      const response = await fetch(`${API_URL}/lesson/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          topic_source: "free_text",
          requested_output_type: "worksheet",
          explicit_audience: audience || undefined,
          explicit_domain: domain || undefined,
          explicit_subdomain: explicitSubdomain,
          current_knowledge_context: currentKnowledgeContext || undefined,
          requested_depth: depth,
          worksheet_response_format: worksheetResponseFormat,
          user_constraints: []
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `API error ${response.status}`);
      }

      const data = (await response.json()) as GenerateLessonResponse;
      setResult(data);
      setTab("worksheet");
      setCopyStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      setError(
        `API unavailable or generation failed: ${message}. Ensure the API is running with CURSOR_API_KEY or use the fake adapter in tests.`
      );
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const copyWorksheetMarkdown = async () => {
    if (!result?.worksheet) return;

    try {
      await navigator.clipboard.writeText(result.worksheet);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("failed");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  };

  const exportWorksheetPdf = async () => {
    if (!worksheetRef.current || !result?.worksheet) return;

    setExportingPdf(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const filename = `${result.normalized_request.topic.replace(/[^\w\s-]/g, "").trim() || "worksheet"}.pdf`;

      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        })
        .from(worksheetRef.current)
        .save();
    } catch {
      setError("PDF export failed. Try copying the markdown instead.");
    } finally {
      setExportingPdf(false);
    }
  };

  return (
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
            Domain
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value as DomainId)}
              style={inputStyle}
            >
              <option value="self">Self</option>
              <option value="trivium">Trivium</option>
              <option value="quadrivium">Quadrivium</option>
              <option value="science_analysis">Science / Analysis</option>
              <option value="engineering_art_architecture_craftsmanship">Engineering / Art / Craft</option>
              <option value="integration_theory_of_all">Integration</option>
            </select>
          </label>
          <label style={{ position: "relative" }}>
            Subdomain (optional)
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
            Topic
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              style={inputStyle}
              placeholder="What should this worksheet cover?"
            />
          </label>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
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
            Response format
            <select
              value={worksheetResponseFormat}
              onChange={(e) =>
                setWorksheetResponseFormat(e.target.value as WorksheetResponseFormat)
              }
              style={inputStyle}
            >
              <option value="auto">AI decides (auto)</option>
              <option value="open_ended">Open-ended</option>
              <option value="fill_in">Fill-in</option>
              <option value="multiple_choice">Multiple choice</option>
              <option value="true_false">True/False</option>
              <option value="mixed">Mixed</option>
              <option value="quiz">Quiz</option>
              <option value="test">Test</option>
            </select>
          </label>
        </div>
        <label>
          Current knowledge context (optional)
          <textarea
            value={currentKnowledgeContext}
            onChange={(e) => setCurrentKnowledgeContext(e.target.value)}
            rows={2}
            style={inputStyle}
            placeholder="Example: I can use ratios in recipes but cannot model them formally."
          />
        </label>
        <label>
          Audience
          <input value={audience} onChange={(e) => setAudience(e.target.value)} style={inputStyle} />
        </label>
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Generating…" : "Generate Worksheet"}
        </button>
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

      {result && (
        <section>
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

          <div
            style={{
              padding: "1.25rem",
              background: "#1a1d23",
              borderRadius: 8,
              minHeight: 300
            }}
          >
            {tab === "worksheet" && (
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
                    onClick={() => exportWorksheetPdf()}
                    disabled={exportingPdf}
                    style={secondaryButtonStyle}
                  >
                    {exportingPdf ? "Exporting…" : "Export PDF"}
                  </button>
                </div>
                <article ref={worksheetRef} className="worksheet">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.worksheet}</ReactMarkdown>
                </article>
              </>
            )}
            {tab === "plan" && (
              <pre style={{ overflow: "auto", fontSize: "0.85rem" }}>
                {JSON.stringify(result.lesson_plan, null, 2)}
              </pre>
            )}
            {tab === "audit" && (
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
            {tab === "prompt" && (
              <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>{result.llm_prompt}</pre>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

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
