import { SKILLS, PROFICIENCY_LEVELS, getSkill } from "./catalog.js";
import { calculateAssessment, getRecommendedResources } from "./assessment.js";
import { loadProgress, saveProgress } from "./storage.js";

const app = document.querySelector("#app");
const status = document.querySelector("#app-status");
const LEVEL_ORDER = new Map(PROFICIENCY_LEVELS.map((level, index) => [level.name, index]));

let progress;
let view = "dashboard";
let assessment = null;
let resultSkillId = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function latestAttempt(skillId) {
  const attempts = progress.attempts[skillId] ?? [];
  return attempts.at(-1);
}

function getTrend(skillId) {
  const attempts = progress.attempts[skillId] ?? [];
  if (attempts.length < 2) return "First check-in";
  const change = attempts.at(-1).score - attempts.at(-2).score;
  if (change > 0) return "Moving up";
  if (change < 0) return "Keep building";
  return "Holding steady";
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error-message", isError);
}

function commitProgress(nextProgress, successMessage) {
  try {
    saveProgress(nextProgress);
  } catch (error) {
    console.error("Could not save learner progress.", error);
    setStatus("Progress could not be saved in this browser. Check available storage and try again.", true);
    return false;
  }
  progress = nextProgress;
  setStatus(successMessage);
  return true;
}

function pageShell(content) {
  const assessedCount = progress
    ? Object.values(progress.attempts).filter((attempts) => attempts.length > 0).length
    : 0;
  return `
    <div class="page">
      <header class="topbar">
        <button class="brand" data-action="home" aria-label="SkillPath home">
          <span class="brand-mark" aria-hidden="true">s</span>
          <span>skillpath</span>
        </button>
        <nav class="topnav" aria-label="Main navigation">
          <button class="nav-link ${view === "dashboard" ? "active" : ""}" data-action="home">My learning</button>
          <span class="nav-count">${assessedCount} of ${SKILLS.length} skills checked</span>
        </nav>
        <div class="profile-chip" aria-label="Your learning space"><span class="profile-dot">Y</span><span>Your learning</span></div>
      </header>
      ${content}
      <footer class="footer">
        <span>SkillPath</span>
        <span>Your results are saved in this browser.</span>
      </footer>
    </div>`;
}

function renderDashboard() {
  const attempts = Object.values(progress.attempts).flat();
  const assessed = SKILLS.filter((skill) => latestAttempt(skill.id));
  const latestResources = assessed
    .map((skill) => ({
      skill,
      attempt: latestAttempt(skill.id),
      resources: getRecommendedResources(skill, latestAttempt(skill.id).level),
    }))
    .sort((a, b) => LEVEL_ORDER.get(a.attempt.level) - LEVEL_ORDER.get(b.attempt.level));
  const completedCount = progress.completedResources.length;

  const skillCards = SKILLS.map((skill) => {
    const attempt = latestAttempt(skill.id);
    const level = attempt?.level;
    return `
      <article class="skill-card">
        <div class="skill-card-top">
          <span class="category-label">${escapeHtml(skill.category)}</span>
          <span class="skill-icon ${skill.id}" aria-hidden="true">${skill.id === "javascript" ? "JS" : skill.id === "data-literacy" ? "D" : "C"}</span>
        </div>
        <h3>${escapeHtml(skill.name)}</h3>
        <p>${escapeHtml(skill.description)}</p>
        <div class="skill-meta">
          ${level
            ? `<span class="level-pill level-${level.toLowerCase()}">${escapeHtml(level)}</span><span class="skill-trend">${escapeHtml(getTrend(skill.id))}</span>`
            : `<span class="unassessed">Not assessed yet</span>`}
          <span class="duration">${escapeHtml(skill.duration)}</span>
        </div>
        <button class="button ${level ? "button-secondary" : "button-primary"} full-width" data-action="start" data-skill="${escapeHtml(skill.id)}">
          ${level ? "Retake assessment" : "Check your level"} <span aria-hidden="true">→</span>
        </button>
      </article>`;
  }).join("");

  const recommendations = latestResources.length
    ? latestResources.map(({ skill, attempt, resources }) => resources.map((resource) =>
      renderResourceCard(skill, resource, attempt.level)
    ).join("")).join("")
    : `<div class="empty-recommendations">
        <span class="empty-icon" aria-hidden="true">✦</span>
        <div><h3>Your next step will show up here</h3><p>Take an assessment to get a lesson matched to your current level.</p></div>
        <button class="text-button" data-action="start" data-skill="${SKILLS[0].id}">Try a skill check <span aria-hidden="true">→</span></button>
      </div>`;

  return pageShell(`
    <main>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow"><span class="eyebrow-dot"></span> A clearer way to grow</p>
          <h1>Know where you are.<br><span>Find what’s next.</span></h1>
          <p class="hero-description">A quick skill check gives you a useful starting point. Your next lesson is picked to help you keep moving.</p>
          <div class="hero-actions">
            <button class="button button-dark" data-action="start" data-skill="${SKILLS[0].id}">Start a skill check <span aria-hidden="true">↗</span></button>
            <span class="hero-note">No grades. Just a good next step.</span>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
          <div class="orbit-center"><span>your<br>potential</span><span class="orbit-star">✳</span></div>
          <div class="orbit-label label-top"><span class="mini-dot mint"></span> Know your level</div>
          <div class="orbit-label label-right"><span class="mini-dot yellow"></span> See progress</div>
          <div class="orbit-label label-bottom"><span class="mini-dot coral"></span> Learn what’s next</div>
          <span class="floating-spark spark-one">✳</span><span class="floating-spark spark-two">✦</span>
        </div>
      </section>

      <section class="stats-row" aria-label="Your learning overview">
        <div class="stat-card"><span class="stat-number">${assessed.length}<small>/${SKILLS.length}</small></span><span class="stat-label">skills checked</span><span class="stat-foot">Your starting points</span></div>
        <div class="stat-card"><span class="stat-number">${attempts.length}</span><span class="stat-label">check-ins</span><span class="stat-foot">Every retake counts</span></div>
        <div class="stat-card"><span class="stat-number">${completedCount}</span><span class="stat-label">lessons completed</span><span class="stat-foot">Small steps add up</span></div>
        <div class="stat-progress">
          <div class="stat-progress-heading"><span>Learning momentum</span><span class="progress-spark">↗</span></div>
          <p>${attempts.length ? "You’re building a clearer picture of your skills." : "One quick check is all it takes to begin."}</p>
          <div class="progress-track"><span style="width:${Math.min(100, assessed.length / SKILLS.length * 100)}%"></span></div>
          <span class="progress-caption">${assessed.length} skill${assessed.length === 1 ? "" : "s"} with a starting point</span>
        </div>
      </section>

      <section class="section-block" id="skills">
        <div class="section-heading">
          <div><p class="eyebrow">YOUR SKILLS</p><h2>Choose a place to start</h2><p class="section-subtitle">Each check is short, focused, and built around a different skill.</p></div>
          <span class="section-count">${SKILLS.length} skill checks <span aria-hidden="true">↘</span></span>
        </div>
        <div class="skill-grid">${skillCards}</div>
      </section>

      <section class="section-block recommendations-section" id="recommendations">
        <div class="section-heading">
          <div><p class="eyebrow">MADE FOR YOUR NEXT STEP</p><h2>Learning that meets you here</h2><p class="section-subtitle">Short lessons and practice, matched to your latest check-in.</p></div>
          <span class="recommendation-mark" aria-hidden="true">✳</span>
        </div>
        <div class="recommendation-grid">${recommendations}</div>
      </section>
    </main>`);
}

function renderResourceCard(skill, resource, level) {
  const complete = progress.completedResources.includes(resource.id);
  const takeaways = resource.takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  return `
    <article class="resource-card">
      <div class="resource-card-head">
        <span class="resource-type">${escapeHtml(resource.format)}</span>
        <span class="resource-duration">${escapeHtml(resource.duration)}</span>
      </div>
      <p class="resource-for">${escapeHtml(skill.name)} <span aria-hidden="true">·</span> For ${escapeHtml(level)}</p>
      <h3>${escapeHtml(resource.title)}</h3>
      <p class="resource-summary">${escapeHtml(resource.summary)}</p>
      <details class="lesson-details">
        <summary>Open lesson <span aria-hidden="true">＋</span></summary>
        <div class="lesson-content">
          <h4>Keep in mind</h4><ul>${takeaways}</ul>
          <h4>Try it</h4><p>${escapeHtml(resource.practice)}</p>
        </div>
      </details>
      <button class="button ${complete ? "button-complete" : "button-light"} full-width" data-action="complete-resource" data-resource="${escapeHtml(resource.id)}" ${complete ? "disabled" : ""}>
        ${complete ? "Completed ✓" : "Mark as complete"}
      </button>
    </article>`;
}

function renderAssessment() {
  const skill = getSkill(assessment.skillId);
  const question = skill.questions[assessment.questionIndex];
  const selectedAnswer = assessment.answers[question.id];
  const questionNumber = assessment.questionIndex + 1;
  const progressPercent = questionNumber / skill.questions.length * 100;
  const answersMarkup = question.options.map((option, index) => `
    <label class="answer-option ${selectedAnswer === index ? "selected" : ""}">
      <input type="radio" name="answer" value="${index}" ${selectedAnswer === index ? "checked" : ""}>
      <span class="answer-radio" aria-hidden="true"></span>
      <span>${escapeHtml(option)}</span>
    </label>`).join("");

  return pageShell(`
    <main class="assessment-page">
      <button class="back-link" data-action="home"><span aria-hidden="true">←</span> Back to my learning</button>
      <section class="assessment-panel">
        <div class="assessment-heading">
          <span class="assessment-category">${escapeHtml(skill.category)} <span aria-hidden="true">·</span> Skill check</span>
          <span class="assessment-time">${escapeHtml(skill.duration.split("·")[0].trim())}</span>
          <h1>${escapeHtml(skill.name)}</h1>
          <p>${escapeHtml(skill.description)} There are no trick questions—choose the answer that feels right.</p>
        </div>
        <div class="question-progress">
          <div class="question-progress-label"><span>Question ${questionNumber} of ${skill.questions.length}</span><span>${Math.round(progressPercent)}%</span></div>
          <div class="progress-track"><span style="width:${progressPercent}%"></span></div>
        </div>
        <fieldset class="question-fieldset">
          <legend>${escapeHtml(question.prompt)}</legend>
          <div class="answer-list">${answersMarkup}</div>
        </fieldset>
        <div class="assessment-controls">
          <button class="button button-secondary" data-action="previous" ${assessment.questionIndex === 0 ? "disabled" : ""}>Back</button>
          <button class="button button-dark" data-action="next" ${selectedAnswer === undefined ? "disabled" : ""}>
            ${questionNumber === skill.questions.length ? "See my result" : "Next question"} <span aria-hidden="true">→</span>
          </button>
        </div>
        <p class="privacy-note"><span aria-hidden="true">⌑</span> Just for you. Your answers stay in this browser.</p>
      </section>
    </main>`);
}

function renderResult() {
  const skill = getSkill(resultSkillId);
  const attempts = progress.attempts[resultSkillId] ?? [];
  const result = attempts.at(-1);
  const previous = attempts.at(-2);
  const changeCopy = !previous
    ? "This is your starting point. You can retake this check whenever you like."
    : result.score > previous.score
      ? `That’s ${Math.round((result.score - previous.score) * 100)} percentage points up from your last check-in.`
      : result.score < previous.score
        ? "Your last check-in was higher. Use this as a signal for what to revisit—not a grade."
        : "Your result is holding steady. Keep practicing and check in again later.";
  const resources = getRecommendedResources(skill, result.level);
  const correct = result.correct;
  const levelIndex = LEVEL_ORDER.get(result.level);
  const nextLevel = PROFICIENCY_LEVELS[Math.min(levelIndex + 1, PROFICIENCY_LEVELS.length - 1)];

  return pageShell(`
    <main class="result-page">
      <button class="back-link" data-action="home"><span aria-hidden="true">←</span> Back to my learning</button>
      <section class="result-panel">
        <div class="result-banner">
          <div class="result-check" aria-hidden="true">✓</div>
          <p class="eyebrow">YOUR CHECK-IN IS COMPLETE</p>
          <h1>A useful place to begin.</h1>
          <p>This is a snapshot of what feels familiar right now. It’s a guide for learning, not a grade.</p>
        </div>
        <div class="result-details">
          <div class="result-level">
            <span class="result-label">${escapeHtml(skill.name)}</span>
            <div class="result-level-row"><span class="level-pill level-${result.level.toLowerCase()}">${escapeHtml(result.level)}</span><span class="result-score">${correct} of ${result.total} correct</span></div>
            <p>${escapeHtml(PROFICIENCY_LEVELS[levelIndex].description)}</p>
            <div class="level-scale" aria-label="Proficiency level: ${escapeHtml(result.level)}">
              ${PROFICIENCY_LEVELS.map((level) => `<span class="${level.name === result.level ? "current" : ""}">${escapeHtml(level.name)}</span>`).join("")}
            </div>
          </div>
          <div class="result-reflection"><span class="reflection-icon" aria-hidden="true">↗</span><p>${escapeHtml(changeCopy)}</p></div>
          <div class="result-recommendation">
            <div class="result-recommendation-heading"><div><p class="eyebrow">A GOOD NEXT STEP</p><h2>${levelIndex === PROFICIENCY_LEVELS.length - 1 ? "Stretch what you know" : `Build toward ${escapeHtml(nextLevel.name)}`}</h2></div><span class="recommendation-mark" aria-hidden="true">✳</span></div>
            <p class="result-recommendation-note">Picked for your ${escapeHtml(result.level.toLowerCase())} level in ${escapeHtml(skill.name)}.</p>
            ${resources.map((resource) => renderResourceCard(skill, resource, result.level)).join("")}
          </div>
          <div class="result-actions">
            <button class="button button-dark" data-action="home">See my learning plan <span aria-hidden="true">→</span></button>
            <button class="text-button" data-action="start" data-skill="${escapeHtml(skill.id)}">Retake check</button>
          </div>
        </div>
      </section>
    </main>`);
}

function render() {
  if (!progress) {
    app.innerHTML = pageShell(`<main class="fatal-message"><h1>Your saved progress could not be loaded.</h1><p>It has not been overwritten. Check this browser’s storage settings and reload to try again.</p></main>`);
    return;
  }
  app.innerHTML = view === "assessment"
    ? renderAssessment()
    : view === "result"
      ? renderResult()
      : renderDashboard();
}

function startAssessment(skillId) {
  const skill = getSkill(skillId);
  if (!skill) {
    setStatus("That skill check is unavailable.", true);
    return;
  }
  assessment = { skillId, questionIndex: 0, answers: {} };
  view = "assessment";
  setStatus("");
  render();
}

function finishAssessment() {
  const skill = getSkill(assessment.skillId);
  let outcome;
  try {
    outcome = calculateAssessment(skill, assessment.answers);
  } catch (error) {
    setStatus(error.message, true);
    return;
  }

  const currentAttempts = progress.attempts[skill.id] ?? [];
  const nextProgress = {
    ...progress,
    attempts: {
      ...progress.attempts,
      [skill.id]: [...currentAttempts, outcome].slice(-10),
    },
  };
  if (!commitProgress(nextProgress, "Your check-in is saved in this browser.")) return;
  resultSkillId = skill.id;
  assessment = null;
  view = "result";
  render();
}

app.addEventListener("change", (event) => {
  if (!event.target.matches('input[name="answer"]') || view !== "assessment") return;
  const skill = getSkill(assessment.skillId);
  const question = skill.questions[assessment.questionIndex];
  assessment.answers[question.id] = Number(event.target.value);
  document.querySelectorAll(".answer-option").forEach((option) => option.classList.remove("selected"));
  event.target.closest(".answer-option").classList.add("selected");
  document.querySelector('[data-action="next"]').disabled = false;
});

app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;

  switch (button.dataset.action) {
    case "home":
      view = "dashboard";
      assessment = null;
      setStatus("");
      render();
      break;
    case "start":
      startAssessment(button.dataset.skill);
      break;
    case "previous":
      if (assessment.questionIndex > 0) {
        assessment.questionIndex -= 1;
        render();
      }
      break;
    case "next": {
      const skill = getSkill(assessment.skillId);
      if (assessment.questionIndex === skill.questions.length - 1) {
        finishAssessment();
      } else {
        assessment.questionIndex += 1;
        render();
      }
      break;
    }
    case "complete-resource": {
      const resourceId = button.dataset.resource;
      const nextProgress = {
        ...progress,
        completedResources: [...new Set([...progress.completedResources, resourceId])],
      };
      if (commitProgress(nextProgress, "Lesson marked complete. Nice work.")) render();
      break;
    }
  }
});

try {
  progress = loadProgress();
} catch (error) {
  console.error("Could not load learner progress.", error);
  progress = null;
  setStatus("Saved progress could not be loaded. It has not been overwritten.", true);
}
if (!progress) progress = null;
render();
