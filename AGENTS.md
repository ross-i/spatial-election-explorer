# Agent Guidelines


## Frontend work

If your task is frontend (UI, visualisation, Svelte components, styles):

- **Do not modify `src/bridge.js`, `src/worker.js`, or any file under `src/py/`.**

- Treat `bridge.js` as a fixed API boundary. The exported async functions and their
  TypeScript-style JSDoc types (`LayerBundle`, `ElectionResult`, etc.) are the contract
  you code against — do not change them.

- If you believe the backend API must change to complete your task, **stop and tell the
  user** rather than making the change yourself. The team discusses API changes together
  before they are made.

- You may record a proposed API change in `proposal.md` at the project root (create it
  if it does not exist, append to it if it does), but do not implement it.


## Backend work

If your task is backend (election logic, Python, Pyodide wiring):

- **Do not change existing message shapes in the `bridge.js` ↔ `worker.js` protocol.**
  The fields and semantics of `run_election`, `ready`, and `result` — including the `id`
  echo contract — are fixed and must not be altered. You may introduce new `type` values
  as part of adding a new capability, but only as part of completing the full chain
  described below; never add a new message type without the corresponding worker handler
  and bridge export.

- Work is confined to three things:

  1. **Write or edit Python** in `src/py/`.

  2. **Update `src/worker.js`** to call the new/changed Python (e.g. new
     `pyodide.globals.set` calls, new `type` branches in `self.onmessage`).

  3. **Add an async function to `src/bridge.js`** that exposes the new capability to the
     frontend — following the existing pattern of `postMessage` + pending-promise
     resolution.
