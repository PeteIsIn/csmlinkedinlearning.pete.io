import test from "node:test";
import assert from "node:assert/strict";
import { SKILLS } from "../src/catalog.js";
import { calculateAssessment, getRecommendedResources } from "../src/assessment.js";
import { emptyProgress, loadProgress, saveProgress, STORAGE_KEY } from "../src/storage.js";

function answersFor(skill, correctCount) {
  return Object.fromEntries(skill.questions.map((question, index) => [
    question.id,
    index < correctCount ? question.answer : (question.answer + 1) % question.options.length,
  ]));
}

test("maps diagnostic scores to all four proficiency bands", () => {
  const skill = SKILLS[0];
  assert.equal(calculateAssessment(skill, answersFor(skill, 0)).level, "Beginner");
  assert.equal(calculateAssessment(skill, answersFor(skill, 1)).level, "Developing");
  assert.equal(calculateAssessment(skill, answersFor(skill, 2)).level, "Proficient");
  assert.equal(calculateAssessment(skill, answersFor(skill, 3)).level, "Advanced");
});

test("uses thresholds configured for the selected skill", () => {
  const skill = {
    ...SKILLS[0],
    levelThresholds: { Beginner: 0, Developing: 0.2, Proficient: 0.25, Advanced: 0.9 },
  };
  assert.equal(calculateAssessment(skill, answersFor(skill, 1)).level, "Proficient");
});

test("requires a complete set of valid answers", () => {
  const skill = SKILLS[0];
  assert.throws(() => calculateAssessment(skill, {}), /Answer every question/);
  assert.throws(() => calculateAssessment(skill, { ...answersFor(skill, 4), "js-1": 99 }), /Answer every question/);
});

test("recommends local resources matched to the assessed level", () => {
  const skill = SKILLS.find((item) => item.id === "data-literacy");
  const resources = getRecommendedResources(skill, "Developing");
  assert.equal(resources.length, 1);
  assert.equal(resources[0].id, "data-developing");
  assert.ok(resources[0].takeaways.length > 0);
});

test("saves and restores assessment history and completed resources", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const progress = {
    ...emptyProgress(),
    attempts: {
      javascript: [{
        correct: 3,
        total: 4,
        score: 0.75,
        level: "Advanced",
        completedAt: "2026-01-01T10:00:00.000Z",
      }],
    },
    completedResources: ["js-advanced"],
  };

  saveProgress(progress, storage);
  assert.equal(values.has(STORAGE_KEY), true);
  assert.deepEqual(loadProgress(storage), progress);
});

test("does not accept malformed saved progress", () => {
  const storage = {
    getItem: () => "{broken",
    setItem: () => assert.fail("Malformed progress must not be overwritten"),
  };
  assert.throws(() => loadProgress(storage), /Saved progress could not be read/);
});
