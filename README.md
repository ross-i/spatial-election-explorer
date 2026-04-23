# Spatial Election Explorer (SEE)

An interactive tool for simulating ranked-choice elections on the Euclidean plane.

## Stack
- Front-end: Svelte + D3 (node.JS)
- Server: Vite
- Algorithm Execution: Python running in the browser via [Pyodide](https://pyodide.org).

## Setup

```bash
npm install
npm run dev
```

## API

### `run_election(layers, method, num_winners)`

Imported from `./src/bridge.js`. Sends a job to the Pyodide web worker and returns a Promise that resolves with the election result once Python has finished. The worker loads automatically — you don't need to wait for it yourself.

```js
import { run_election } from "./bridge.js";

const result = await run_election(layers, "plurality", 1);
console.log(result);
```

#### Parameters

| Parameter | Type | Description |
|---|---|---|
| `layers` | `LayerBundle` | Input data (see below) |
| `method` | `string` | Election method (e.g. `"plurality"`) |
| `num_winners` | `number` | Number of seats to fill |

Supported values of `method`: `"plurality"`, `"borda"`, `"IRV"`, `"blocPlurality"`, `"STV"`.

#### Returns

`Promise<ElectionResult>` — an array of output layers, each with annotated points indicating winners and scores.

---

### Data types

#### `LayerBundle` — input

An array of `PointsLayer` objects:

```js
const layers = [
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
```

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Name for the layer |
| `type` | `string` | `"candidate"` or `"voter"` |
| `points[].id` | `string` | Unique point identifier |
| `points[].weight` | `number` | Number of voters at this point |
| `points[].x` | `number` | X coordinate |
| `points[].y` | `number` | Y coordinate |

Any additional fields included on a layer object or a point object beyond those listed above will be passed through unchanged by the Python layer and will appear in the corresponding output layer/point.

#### `ElectionResult` — output

An array of `OutLayer` objects; only includes candidate layers.

```js
[
  {
    name: "Layer1",
    type: "candidate",
    points: [
      { id: "a1", winner: true,  score: 1.0, x: 0.2, y: 0.4 },
      { id: "a2", winner: false, score: 1.0, x: 0.5, y: 0.7 },
      { id: "a3", winner: false, score: 1.0, x: 0.9, y: 0.1 },
    ],
  },
]
```

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Name for the layer |
| `type` | `string` | Layer type (always `"candidate"`) |
| `points[].id` | `string` | Unique point identifier |
| `points[].winner` | `boolean` | Whether this candidate won a seat |
| `points[].score` | `number` | Score assigned by the election method |
| `points[].x` | `number` | X coordinate |
| `points[].y` | `number` | Y coordinate |

Any extra metadata fields present on the input layers or points are preserved in the output — the Python code carries them through without inspecting or modifying them.
