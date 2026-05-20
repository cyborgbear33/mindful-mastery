import { randomUUID } from "node:crypto";
import {
  AUDIT_CATEGORIES,
  AuditResult,
  LessonPlanObject
} from "../lesson-types";

const scoreFromContent = (content: string, keywords: string[]): number => {
  const lower = content.toLowerCase();
  const hits = keywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
  if (hits >= keywords.length * 0.7) return 4;
  if (hits >= keywords.length * 0.4) return 3;
  if (hits >= 1) return 2;
  return content.trim().length > 20 ? 1 : 0;
};

export const auditLesson = (input: {
  lessonPlan: LessonPlanObject;
  worksheet: string;
  schemaPass: boolean;
}): AuditResult => {
  const { lessonPlan, worksheet, schemaPass } = input;
  const combined = [
    worksheet,
    lessonPlan.topic_model.why_it_matters,
    lessonPlan.lesson_blueprint.theoretical_overview.content,
    lessonPlan.lesson_blueprint.integration.content,
    lessonPlan.lesson_blueprint.capability_statement.content
  ].join("\n");

  const categoryScores = AUDIT_CATEGORIES.map((category) => {
    let score = 2;
    let notes: string | undefined;

    switch (category) {
      case "Domain Placement":
        score = lessonPlan.constitutional_alignment.primary_domain ? 4 : 0;
        break;
      case "Student Current-State Modeling":
        score =
          lessonPlan.student_model.current_knowledge_context.length >= 30
            ? 3
            : scoreFromContent(
                lessonPlan.student_model.current_knowledge_context,
                ["knowledge", "context", "current"]
              );
        if (lessonPlan.student_model.confidence_of_inference === "explicit") score = Math.max(score, 3);
        break;
      case "Student Target-State Modeling":
        score =
          lessonPlan.student_model.target_knowledge_context.length >= 30
            ? 3
            : scoreFromContent(
                lessonPlan.student_model.target_knowledge_context,
                ["target", "knowledge", "capable"]
              );
        if (lessonPlan.student_model.confidence_of_inference === "explicit") score = Math.max(score, 3);
        break;
      case "Transformation-of-Mind Goal":
        score = scoreFromContent(lessonPlan.constitutional_alignment.transformation_goal, ["move", "from", "toward"]);
        break;
      case "Why-It-Matters Framing":
        score = scoreFromContent(lessonPlan.topic_model.why_it_matters, ["matters", "because", "learning"]);
        break;
      case "Core Definitions":
        score = lessonPlan.topic_model.definitions.length >= 1 ? 3 : 0;
        if (lessonPlan.topic_model.definitions.length >= 2) score = 4;
        break;
      case "Key Distinctions":
        score = lessonPlan.topic_model.distinctions.length >= 1 ? 3 : 0;
        if (lessonPlan.topic_model.distinctions.length >= 2) score = 4;
        break;
      case "Theoretical Overview":
        score = scoreFromContent(lessonPlan.lesson_blueprint.theoretical_overview.content, ["principle", "governs", "because"]);
        break;
      case "Abstract / Formal Layer":
        score = scoreFromContent(lessonPlan.lesson_blueprint.abstract_or_formal_structure.content, ["structure", "form", "model"]);
        break;
      case "Real-World Manifestation":
        score = scoreFromContent(lessonPlan.lesson_blueprint.real_manifestation.content, ["observe", "real", "notice"]);
        break;
      case "Application / Embodiment":
        score = lessonPlan.lesson_blueprint.worksheet_blueprint.exercises.length >= 1 ? 3 : 1;
        if (worksheet.toLowerCase().includes("exercise")) score = Math.max(score, 3);
        break;
      case "Common Errors and Corrections":
        score =
          lessonPlan.student_model.confusions && lessonPlan.student_model.confusions.length > 0
            ? 3
            : scoreFromContent(combined, ["confus", "error", "mistake", "distinction"]);
        break;
      case "Integration with the Greater Whole":
        score = scoreFromContent(lessonPlan.lesson_blueprint.integration.content, ["domain", "whole", "integrat", "architecture", "learning"]);
        break;
      case "Capability Gained":
        score = scoreFromContent(lessonPlan.lesson_blueprint.capability_statement.content, ["able", "capable", "can"]);
        break;
      case "Constitutional Style Fidelity":
        score = schemaPass && !worksheet.toLowerCase().includes("motivat") ? 3 : 2;
        break;
      default:
        score = 2;
    }

    if (score < 2) {
      notes = "Below functional threshold";
    }

    return { category, score, notes };
  });

  const fourLayer = lessonPlan.constitutional_alignment.four_layer_integrity;
  const fourLayerPass =
    fourLayer.principle_present &&
    fourLayer.form_present &&
    fourLayer.manifestation_present &&
    fourLayer.embodiment_present;

  const missingSections = categoryScores
    .filter((c) => c.score < 2)
    .map((c) => c.category);

  const avgScore =
    categoryScores.reduce((sum, c) => sum + c.score, 0) / categoryScores.length;
  const constitutionalPass = missingSections.length === 0 && fourLayerPass && avgScore >= 2;

  let summaryRating: AuditResult["summary_rating"] = "constitutional_failure";
  if (avgScore >= 3.5 && fourLayerPass) summaryRating = "constitutionally_excellent";
  else if (avgScore >= 3 && fourLayerPass) summaryRating = "constitutionally_strong";
  else if (avgScore >= 2 && fourLayerPass) summaryRating = "constitutionally_functional";
  else if (avgScore >= 1.5) summaryRating = "weak_but_salvageable";

  const fragmentationRisk: AuditResult["fragmentation_risk"] =
    missingSections.length >= 4 ? "high" : missingSections.length >= 2 ? "medium" : "low";

  return {
    audit_id: randomUUID(),
    lesson_id: lessonPlan.spec_metadata.lesson_id,
    schema_pass: schemaPass,
    constitutional_pass: constitutionalPass,
    missing_sections: missingSections,
    fragmentation_risk: fragmentationRisk,
    category_scores: categoryScores,
    four_layer_integrity_pass: fourLayerPass,
    summary_rating: summaryRating,
    recommended_revision_actions: missingSections.map((s) => `Strengthen: ${s}`),
    drift_notes: constitutionalPass ? undefined : "Audit detected constitutional gaps."
  };
};
