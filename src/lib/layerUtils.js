export function makeLayer(type, pts, labelStr, params = null) {
  return {
    id: crypto.randomUUID(),
    label: labelStr,
    type,
    points: pts,
    visible: true,
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
      if (p.winner) ids.add(p.id);
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
