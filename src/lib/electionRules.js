/** Voting rule ids sent to the worker (must match Python `elections.py` keys). */
export const ELECTION_METHOD_IDS = ['plurality', 'borda', 'IRV', 'bloc_plurality', 'STV'];

const LABELS = {
  plurality: 'Plurality',
  borda: 'Borda',
  IRV: 'IRV',
  bloc_plurality: 'Bloc Plurality',
  STV: 'STV',
};

/**
 * @param {string} id
 * @returns {string}
 */
export function electionMethodLabel(id) {
  if (LABELS[id]) return LABELS[id];
  return id
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(w => (w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}
