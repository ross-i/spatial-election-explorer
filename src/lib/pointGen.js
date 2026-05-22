function clamp(v) { return Math.max(0, Math.min(1, v)); }

export function gaussian(cx, cy, sigma, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const u1 = Math.random(), u2 = Math.random();
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z2 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    pts.push({ x: clamp(cx + sigma * z1), y: clamp(cy + sigma * z2) });
  }
  return pts;
}

export function uniformRect(cx, cy, w, h, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push({
      x: clamp(cx + (Math.random() - 0.5) * w),
      y: clamp(cy + (Math.random() - 0.5) * h)
    });
  }
  return pts;
}

export function uniformDisc(cx, cy, r, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const theta = Math.random() * 2 * Math.PI;
    const rho = r * Math.sqrt(Math.random());
    pts.push({ x: clamp(cx + rho * Math.cos(theta)), y: clamp(cy + rho * Math.sin(theta)) });
  }
  return pts;
}

// Score all loaded respondents using user-ranked index weights.
// xIndex / yIndex: index objects from INDEXES.
// rankings: { indexId: [col, ...] } ordered by importance.
// Returns one {x, y} point per respondent with a valid score on both axes.
export function surveyFromData(respondents, xIndex, yIndex, rankings) {
  const { rankingsToWeights, scoreRespondent } = _surveyHelpers();
  const xWeights = rankingsToWeights(rankings[xIndex.id]);
  const yWeights = rankingsToWeights(rankings[yIndex.id]);
  const pts = [];
  for (const r of respondents) {
    const x = scoreRespondent(r, xIndex, xWeights);
    const y = scoreRespondent(r, yIndex, yWeights);
    if (x == null || y == null) continue;
    const jitter = () => (Math.random() - 0.5) * 0.009;
    pts.push({ x: clamp(x + jitter()), y: clamp(y + jitter()), _respondent: r });
  }
  return pts;
}

// Lazy import helper to avoid circular deps at module init time
function _surveyHelpers() {
  // These are pure functions — safe to inline here
  function rankingsToWeights(orderedCols) {
    const n = orderedCols.length;
    const raw = orderedCols.map((_, i) => n - i);
    const total = raw.reduce((a, b) => a + b, 0);
    const weights = {};
    orderedCols.forEach((col, i) => { weights[col] = raw[i] / total; });
    return weights;
  }
  function scoreRespondent(respondent, index, weights) {
    let weightedSum = 0, totalWeight = 0;
    for (const q of index.questions) {
      const raw = respondent[q.col];
      const score = raw != null ? q.coding[raw] : undefined;
      if (score == null || score === undefined) continue;
      const w = weights[q.col] ?? (1 / index.questions.length);
      weightedSum += score * w;
      totalWeight += w;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : null;
  }
  return { rankingsToWeights, scoreRespondent };
}

export function survey(_ideologyIndices, n) {
  return Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random() }));
}
