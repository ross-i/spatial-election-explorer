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

export function survey(ideologyIndices, n) {
  return Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random() }));
}
