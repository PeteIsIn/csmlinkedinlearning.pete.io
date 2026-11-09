import { PROFICIENCY_LEVELS } from "./catalog.js";

export function calculateAssessment(skill, answers) {
  if (!skill?.questions?.length) {
    throw new Error("This skill does not have any assessment questions.");
  }

  const isComplete = skill.questions.every((question) =>
    Number.isInteger(answers[question.id]) &&
    answers[question.id] >= 0 &&
    answers[question.id] < question.options.length
  );
  if (!isComplete) {
    throw new Error("Answer every question before viewing your result.");
  }

  const correct = skill.questions.reduce(
    (total, question) => total + Number(answers[question.id] === question.answer),
    0
  );
  const total = skill.questions.length;
  const score = correct / total;
  const thresholds = skill.levelThresholds ?? Object.fromEntries(
    PROFICIENCY_LEVELS.map((band) => [band.name, band.minScore])
  );
  const validThresholds = thresholds &&
    typeof thresholds === "object" &&
    PROFICIENCY_LEVELS.every((band, index) =>
      Number.isFinite(thresholds[band.name]) &&
      thresholds[band.name] >= 0 &&
      thresholds[band.name] <= 1 &&
      (index === 0
        ? thresholds[band.name] === 0
        : thresholds[band.name] >= thresholds[PROFICIENCY_LEVELS[index - 1].name])
    );
  if (!validThresholds) {
    throw new Error("This skill has invalid proficiency thresholds.");
  }

  const level = [...PROFICIENCY_LEVELS]
    .reverse()
    .find((band) => score >= thresholds[band.name]);

  return {
    correct,
    total,
    score,
    level: level.name,
    completedAt: new Date().toISOString(),
  };
}

export function getRecommendedResources(skill, level) {
  return skill.resources.filter((resource) => resource.forLevel === level);
}
