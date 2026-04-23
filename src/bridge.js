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

// The `[key: string]: any` in each typedef means: any extra fields beyond the listed ones
// are also allowed, and will be passed through to the output unchanged. The Python layer
// treats unknown fields as opaque and does not strip them.

/** @typedef {{ id: string, weight: number, x: number, y: number, [key: string]: any }} Point */
/** @typedef {{ name: string, type: string, points: Point[], [key: string]: any }} PointsLayer */
/** @typedef {PointsLayer[]} LayerBundle */

/** @typedef {{ id: string, winner: boolean, score: number, x: number, y: number, [key: string]: any }} OutPoint */
/** @typedef {{ name: string, type: string, points: OutPoint[], [key: string]: any }} OutLayer */
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
