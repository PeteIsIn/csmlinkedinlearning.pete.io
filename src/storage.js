export const STORAGE_KEY = "skillpath.progress.v1";

export function emptyProgress() {
  return { attempts: {}, completedResources: [] };
}

export function loadProgress(storage = globalThis.localStorage) {
  const saved = storage.getItem(STORAGE_KEY);
  if (saved === null) return emptyProgress();

  let progress;
  try {
    progress = JSON.parse(saved);
  } catch (error) {
    throw new Error("Saved progress could not be read. It has not been changed.", { cause: error });
  }

  const validAttempts = progress &&
    typeof progress.attempts === "object" &&
    progress.attempts !== null &&
    !Array.isArray(progress.attempts) &&
    Object.values(progress.attempts).every((attempts) =>
      Array.isArray(attempts) &&
      attempts.every((attempt) =>
        typeof attempt?.level === "string" &&
        Number.isFinite(attempt.score) &&
        Number.isInteger(attempt.correct) &&
        Number.isInteger(attempt.total) &&
        typeof attempt.completedAt === "string"
      )
    );
  const validCompletions = Array.isArray(progress?.completedResources) &&
    progress.completedResources.every((resourceId) => typeof resourceId === "string");

  if (!validAttempts || !validCompletions) {
    throw new Error("Saved progress has an unexpected format. It has not been changed.");
  }

  return progress;
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
