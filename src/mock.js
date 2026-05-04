export async function run_election(layers, method, num_winners) {
  const voters = layers.flatMap(l => l.type === 'voter' ? l.points : []);
  const candidates = layers.flatMap(l => l.type === 'candidate' ? l.points : []);
  const cx = voters.reduce((s, p) => s + p.x, 0) / (voters.length || 1);
  const cy = voters.reduce((s, p) => s + p.y, 0) / (voters.length || 1);
  const scored = candidates
    .map(p => ({ ...p, score: -Math.hypot(p.x - cx, p.y - cy) }))
    .sort((a, b) => b.score - a.score);
  const winnerIds = new Set(scored.slice(0, num_winners).map(p => p.id));
  return [{
    name: 'result',
    type: 'candidate',
    points: scored.map(p => ({ ...p, winner: winnerIds.has(p.id) }))
  }];
}
