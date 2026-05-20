"use client";

import { FormEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Tab = "worksheet" | "plan" | "audit" | "prompt";

type GenerateLessonResponse = {
  normalized_request: { topic: string; request_id: string };
  learner_model: { current_state: string; target_state: string; transformation_goal: string };
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

export default function HomePage() {
  const [topic, setTopic] = useState("Attention as the Gate of Learning");
  const [audience, setAudience] = useState("Adult self-directed learner");
  const [currentState, setCurrentState] = useState("");
  const [depth, setDepth] = useState<"introductory" | "standard" | "advanced">("standard");
  const [domain, setDomain] = useState<string>("self");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateLessonResponse | null>(null);
  const [tab, setTab] = useState<Tab>("worksheet");

  const tabs: { id: Tab; label: string }[] = useMemo(
    () => [
      { id: "worksheet", label: "Worksheet" },
      { id: "plan", label: "Lesson Plan" },
      { id: "audit", label: "Audit" },
      { id: "prompt", label: "Prompt Transparency" }
    ],
    []
  );

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/lesson/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          requested_output_type: "worksheet",
          explicit_audience: audience || undefined,
          explicit_domain: domain || undefined,
          explicit_student_state: currentState || undefined,
          requested_depth: depth,
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
        <label>
          Topic
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            required
            style={inputStyle}
          />
        </label>
        <label>
          Audience
          <input value={audience} onChange={(e) => setAudience(e.target.value)} style={inputStyle} />
        </label>
        <label>
          Current learner state (optional)
          <textarea
            value={currentState}
            onChange={(e) => setCurrentState(e.target.value)}
            rows={2}
            style={inputStyle}
          />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label>
            Domain
            <select value={domain} onChange={(e) => setDomain(e.target.value)} style={inputStyle}>
              <option value="self">Self</option>
              <option value="trivium">Trivium</option>
              <option value="quadrivium">Quadrivium</option>
              <option value="science_analysis">Science / Analysis</option>
              <option value="engineering_art_architecture_craftsmanship">Engineering / Art / Craft</option>
              <option value="integration_theory_of_all">Integration</option>
            </select>
          </label>
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
        </div>
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
              <article className="worksheet">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.worksheet}</ReactMarkdown>
              </article>
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
