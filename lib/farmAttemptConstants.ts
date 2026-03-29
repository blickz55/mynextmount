/** Epic K.2 — max mounts that receive +1 attempt per save (matches top of farm list cap). */
export const K_ATTEMPT_INCREMENT_CAP = 50;

/** Epic K.2.3 — skip attempt bumps when the same collection is re-saved within this window (ms). */
export const K_ATTEMPT_SPAM_WINDOW_MS = 5 * 60 * 1000;

/** POST `/api/collection/farm-attempts` batch size cap (client sends farm list slice). */
export const FARM_ATTEMPT_LOOKUP_MAX_IDS = 500;
