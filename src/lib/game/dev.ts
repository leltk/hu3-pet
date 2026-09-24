export const TEST_MODE = process.env.HU3_PET_TEST_MODE === "true";

export const GAME_TIMERS = {
  rankedMs: TEST_MODE ? 15_000 : 30 * 60 * 1000,
  trainingCooldownMs: TEST_MODE ? 0 : 30_000,
  offlineSimulationMs: 2 * 60 * 60 * 1000,
} as const;
