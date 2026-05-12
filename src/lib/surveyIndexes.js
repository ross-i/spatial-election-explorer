// Each question maps raw CSV values → [0,1] score.
// null = exclude respondent from this question's contribution (DK / skip).
// High score = liberal/reform end; low score = conservative end.
// Direction labels describe what HIGH means on the axis.

export const INDEXES = [
  {
    id: 'gov',
    label: 'Role of Government',
    highLabel: 'More gov. involvement / pro-reform',
    lowLabel: 'Smaller gov. / status quo',
    questions: [
      {
        col: 'tax_temp_inc',
        label: 'Keep income tax increase',
        coding: { '1': 1, '2': 0.67, '3': 0.33, '4': 0 },
        valueLabels: { '1': 'Strongly favor (keep increase)', '2': 'Somewhat favor', '3': 'Somewhat oppose', '4': 'Strongly oppose (let it expire)', '9': "Don't know" },
      },
      {
        col: 'gen14_minwage',
        label: 'Raise minimum wage to $10',
        coding: { '1': 1, '2': 0.67, '3': 0.33, '4': 0 },
        valueLabels: { '1': 'Strongly favor', '2': 'Somewhat favor', '3': 'Somewhat oppose', '4': 'Strongly oppose', '9': "Don't know" },
      },
      {
        col: 'redist_neutral',
        label: 'Neutral arbiter on redistricting panel',
        coding: { '1': 1, '2': 0.67, '3': 0.33, '4': 0 },
        valueLabels: { '1': 'Strongly favor', '2': 'Somewhat favor', '3': 'Somewhat oppose', '4': 'Strongly oppose', '9': "Don't know" },
      },
      {
        col: 'redist_commis',
        label: 'Independent redistricting commission',
        coding: { '1': 1, '2': 0.67, '3': 0.33, '4': 0 },
        valueLabels: { '1': 'Strongly favor', '2': 'Somewhat favor', '3': 'Somewhat oppose', '4': 'Strongly oppose', '9': "Don't know" },
      },
      {
        col: 'cf_lim_judg',
        label: 'Limit judicial campaign contributions',
        coding: { '1': 1, '2': 0.67, '3': 0.33, '4': 0 },
        valueLabels: { '1': 'Strongly favor', '2': 'Somewhat favor', '3': 'Somewhat oppose', '4': 'Strongly oppose', '9': "Don't know" },
      },
      {
        col: 'cf_pub_judg',
        label: 'Public funding for judicial races',
        coding: { '1': 1, '2': 0.67, '3': 0.33, '4': 0 },
        valueLabels: { '1': 'Strongly favor', '2': 'Somewhat favor', '3': 'Somewhat oppose', '4': 'Strongly oppose', '9': "Don't know" },
      },
    ],
  },
  {
    id: 'social',
    label: 'Social Issues',
    highLabel: 'More conservative',
    lowLabel: 'More liberal (pro-choice, pro-LGBTQ)',
    questions: [
      {
        col: 'abort_leg',
        label: 'Abortion legality',
        coding: { '1': 0, '2': 0.5, '3': 1 },
        valueLabels: { '1': 'Legal under all circumstances', '2': 'Legal under some circumstances', '3': 'Illegal in all circumstances', '9': "Don't know" },
      },
      {
        col: 'lg_coup_rts',
        label: 'Rights for gay/lesbian couples',
        coding: { '1': 0, '2': 0.5, '3': 1 },
        valueLabels: { '1': 'Should be able to marry', '2': 'Civil unions only', '3': 'No legal recognition', '9': "Don't know" },
      },
      {
        col: 'gen14_insbc',
        label: 'Mandate birth control coverage',
        coding: { '1': 0, '2': 0.33, '3': 0.67, '4': 1 },
        valueLabels: { '1': 'Strongly favor', '2': 'Somewhat favor', '3': 'Somewhat oppose', '4': 'Strongly oppose', '9': "Don't know" },
      },
    ],
  },
  {
    id: 'guns',
    label: 'Guns',
    highLabel: 'Pro gun control / anti-mandatory minimum',
    lowLabel: 'Pro gun rights / pro-mandatory minimum',
    questions: [
      {
        col: 'gun_own',
        label: 'Gun rights vs. control',
        coding: { '1': 0, '2': 1 },
        valueLabels: { '1': 'Protecting right to own guns', '2': 'Controlling/regulating ownership', '9': "Don't know" },
      },
      {
        col: 'gun_concealsafe',
        label: 'Feel safer with concealed carry law',
        coding: { '1': 0, '2': 1, '8': null },
        valueLabels: { '1': 'More safe', '2': 'Less safe', '8': 'No change', '9': "Don't know" },
      },
      {
        col: 'gun_85percent',
        label: 'Felons serve 85% of sentence for gun crimes',
        coding: { '1': 0, '2': 1 },
        valueLabels: { '1': 'Support (85% rule)', '2': 'Oppose', '9': "Don't know" },
      },
      {
        col: 'gun_bigmin',
        label: 'Increase mandatory minimum 2→3 yrs',
        coding: { '1': 0, '2': 0.33, '3': 0.67, '4': 1 },
        valueLabels: { '1': 'Strongly favor', '2': 'Somewhat favor', '3': 'Somewhat oppose', '4': 'Strongly oppose', '9': "Don't know" },
      },
    ],
  },
];

// Build a lookup: indexId → question order (array of col names, rank 0 = most important)
// Default: equal weight (original order)
export function defaultRankings() {
  const out = {};
  for (const idx of INDEXES) {
    out[idx.id] = idx.questions.map(q => q.col);
  }
  return out;
}

// Convert rank order → normalized weights.
// Rank 0 = most important gets highest weight (linear decay).
export function rankingsToWeights(orderedCols) {
  const n = orderedCols.length;
  const raw = orderedCols.map((_, i) => n - i); // n, n-1, ..., 1
  const total = raw.reduce((a, b) => a + b, 0);
  const weights = {};
  orderedCols.forEach((col, i) => {
    weights[col] = raw[i] / total;
  });
  return weights;
}

// Score a single respondent on one index given a weights map {col: weight}.
// Returns null if the respondent has no valid answers for this index.
export function scoreRespondent(respondent, index, weights) {
  let weightedSum = 0;
  let totalWeight = 0;
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
