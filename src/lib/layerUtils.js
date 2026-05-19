/** All voter layers use this fill (plot and UI). */
export const VOTER_LAYER_COLOR = '#61AAF2';

/** All candidate layers use this fill — same accent as primary buttons. */
export const CANDIDATE_LAYER_COLOR = '#CC7857';

export const LAYER_COLORS = [
  '#4B7BE5', // blue
  '#E5754B', // orange
  '#4DAF64', // green
  '#C94B9E', // pink
  '#8B4BE5', // purple
  '#C9A43A', // amber
  '#4BB5C9', // cyan
  '#E54B4B', // red
];

// 50 perceptually-distinct colors for survey candidates; only cycles on the 51st.
export const SURVEY_CANDIDATE_COLORS = [
  '#E63946', '#F4A261', '#2A9D8F', '#457B9D', '#8338EC',
  '#06D6A0', '#FB5607', '#3A86FF', '#FFBE0B', '#FF006E',
  '#118AB2', '#06A77D', '#FF6FA4', '#F77F00', '#FCBF49',
  '#A8DADC', '#BAD7E9', '#E07A5F', '#7B3F00', '#81B29A',
  '#F2CC8F', '#9D8DF1', '#2EC4B6', '#F72585', '#FF9F1C',
  '#CBFF8C', '#A7C957', '#1ABC9C', '#E74C3C', '#90BE6D',
  '#F39C12', '#27AE60', '#BC6C25', '#9B59B6', '#FF85A1',
  '#16A085', '#D35400', '#C0392B', '#B5838D', '#2C3E50',
  '#F1C40F', '#7F8C8D', '#6C5CE7', '#00B894', '#FD79A8',
  '#A29BFE', '#55EFC4', '#E17055', '#74B9FF', '#FDCB6E',
];

export function layerColor(index) {
  return LAYER_COLORS[index % LAYER_COLORS.length];
}

export function surveyCandidateColor(index) {
  return SURVEY_CANDIDATE_COLORS[index % SURVEY_CANDIDATE_COLORS.length];
}

export function makeLayer(type, pts, labelStr, params = null, color = null) {
  return {
    id: crypto.randomUUID(),
    label: labelStr,
    type,
    points: pts,
    visible: true,
    color,
    params
  };
}

export function layerToBundle(layer) {
  return {
    name: layer.label,
    type: layer.type,
    points: layer.points.map((p, i) => ({
      id: `${layer.id}-${i}`,
      weight: 1,
      x: p.x,
      y: p.y
    }))
  };
}

export function toLayerBundle(layers) {
  return layers.filter(l => l.visible).map(layerToBundle);
}

export function winnerSet(electionResult) {
  if (!electionResult) return new Set();
  const ids = new Set();
  for (const layer of electionResult) {
    for (const p of layer.points) {
      if (p.winner && p.id != null) ids.add(p.id);
    }
  }
  return ids;
}

/**
 * Candidate point ids that won, matching `layerToBundle` ids (`${layer.id}-${i}`).
 * When the result has no point ids (e.g. tutorial mock), infers winners by flattening
 * candidate layers in display order against a single merged result layer.
 *
 * @param {Array<{ id?: string, type: string, visible?: boolean, points: unknown[] }>} layers
 * @param {Array<{ points: Array<{ id?: string, winner?: boolean }> }> | null} electionResult
 * @returns {Set<string>}
 */
export function resolveWinnerIds(layers, electionResult) {
  const ids = winnerSet(electionResult);
  if (ids.size > 0 || !electionResult?.length) return ids;

  const candLayers = layers.filter(l => l.visible !== false && l.type === 'candidate');
  if (electionResult.length !== 1) return ids;

  const flat = electionResult[0].points;
  if (!flat.length) return ids;

  let j = 0;
  for (const layer of candLayers) {
    for (let i = 0; i < layer.points.length; i++) {
      if (j >= flat.length) return ids;
      if (flat[j].winner) ids.add(`${layer.id}-${i}`);
      j++;
    }
  }
  return ids;
}

export function formatLabel(config) {
  const { kind, cx, cy, sigma, w, h, r, type, n, filename } = config;
  const t = type === 'voter' ? 'v' : 'c';
  const fx = cx.toFixed(2), fy = cy.toFixed(2);
  if (kind === 'gaussian') return `G(${fx},${fy}) σ=${Number(sigma).toFixed(2)} ${t}×${n}`;
  if (kind === 'uniform_rectangle') return `R(${fx},${fy}) ${Number(w).toFixed(2)}×${Number(h).toFixed(2)} ${t}×${n}`;
  if (kind === 'uniform_disc') return `D(${fx},${fy}) r=${Number(r).toFixed(2)} ${t}×${n}`;
  if (kind === 'survey') return `Survey ×${n}`;
  if (kind === 'custom') return `Custom: ${filename}`;
  return 'Layer';
}
