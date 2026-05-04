/** @type {import('./bridge.js').LayerBundle} */
export const dummyLayers = [
  {
    name: "Layer A",
    type: "candidate",
    points: [
      { id: "a1", weight: 1, x: 0.2, y: 0.4 },
      { id: "a2", weight: 1, x: 0.5, y: 0.7 },
      { id: "a3", weight: 1, x: 0.9, y: 0.1 },
    ],
  },
  {
    name: "Layer B",
    type: "voter",
    points: [
      { id: "b1", weight: 2, x: 0.3, y: 0.3 },
      { id: "b2", weight: 1, x: 0.6, y: 0.6 },
      { id: "b3", weight: 1, x: 0.1, y: 0.9 },
      { id: "b4", weight: 1, x: 0.8, y: 0.2 },
    ],
  },
];
