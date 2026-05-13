/** @typedef {{ id: string, label: string }} ElectionMethodOption */

/** Single-winner rules (num winners = 1). Ids match Python `elections.py` keys (case-insensitive). */
export const SINGLE_WINNER_METHODS = [
  { id: 'plurality', label: 'Plurality' },
  { id: 'borda', label: 'Borda' },
  { id: 'IRV', label: 'IRV' },
];

/** Multi-winner rules (num winners > 1). Labels reflect common names; ids still map to backend. */
export const MULTI_WINNER_METHODS = [
  { id: 'plurality', label: 'SNTV' },
  { id: 'bloc_plurality', label: 'Bloc Plurality' },
  { id: 'borda', label: 'k-Borda' },
  { id: 'IRV', label: 'IRV' },
  { id: 'STV', label: 'STV' },
];

/** All ids that may appear in the UI (union of both modes). */
export const ELECTION_METHOD_IDS = [
  ...new Set([...SINGLE_WINNER_METHODS, ...MULTI_WINNER_METHODS].map(o => o.id)),
];

/**
 * @param {number | string} numWinners
 * @returns {ElectionMethodOption[]}
 */
export function electionMethodsForNumWinners(numWinners) {
  const k = Number(numWinners);
  if (!Number.isFinite(k) || k <= 1) return SINGLE_WINNER_METHODS;
  return MULTI_WINNER_METHODS;
}

/**
 * @param {number | string} numWinners
 * @param {string} currentMethod
 * @returns {string}
 */
export function coerceElectionMethod(numWinners, currentMethod) {
  const opts = electionMethodsForNumWinners(numWinners);
  const ids = new Set(opts.map(o => o.id));
  if (ids.has(currentMethod)) return currentMethod;
  return opts[0].id;
}

/**
 * Human-readable name for a method id. When `numWinners` is omitted, defaults to single-winner labels.
 * @param {string} id
 * @param {number | string} [numWinners]
 * @returns {string}
 */
export function electionMethodLabel(id, numWinners = 1) {
  const opts = electionMethodsForNumWinners(numWinners);
  const hit = opts.find(o => o.id === id);
  if (hit) return hit.label;
  return id
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(w => (w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}
