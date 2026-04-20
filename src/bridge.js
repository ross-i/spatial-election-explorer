// Worker message protocol
//
// bridge.js → worker.js
//   { type: "run_election", id: number, payload: { layers: LayerBundle, method: string, num_winners: number } }
//
// worker.js → bridge.js
//   { type: "ready" }                                -- sent once, after Pyodide and all .py files are loaded
//   { type: "result", id: number, result: ElectionResult } -- echoes the request id so bridge can resolve the right promise
//
// To swap the backend: reimplement worker.js to speak the same protocol. The ready/result
// message shapes are the only contract. `id` must be echoed back unchanged.

const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });

let resolveReady;
const ready = new Promise((resolve) => { resolveReady = resolve; });

const pending = new Map();
let nextId = 0;

worker.onmessage = (e) => {
  const { type, id, result } = e.data;
  if (type === "ready") {
    resolveReady();
  } else if (type === "result") {
    const resolve = pending.get(id);
    if (resolve) {
      resolve(result);
      pending.delete(id);
    }
  }
};

/** @typedef {{ id: string, weight: number, x: number, y: number }} Point */
/** @typedef {{ name: string, type: string, points: Point[]}} PointsLayer */
/** @typedef {PointsLayer[]} LayerBundle */

/** @typedef {{ id: string, winner: boolean, score: number, x: number, y: number }} OutPoint */
/** @typedef {{ name: string, type: string, points: OutPoint[] }} OutLayer */
/** @typedef {OutLayer[]} ElectionResult */

/**
 * @param {LayerBundle} layers
 * @param {string} method
 * @param {number} num_winners
  * @returns {Promise<ElectionResult>}
 */
export async function run_election(layers, method, num_winners) {
  await ready;
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    worker.postMessage({ type: "run_election", id, payload: { layers, method, num_winners } });
  });
}
