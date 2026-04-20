import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.mjs";

let pyodide;

async function init() {
  pyodide = await loadPyodide();
  const modules = import.meta.glob("./py/*.py", { query: "?raw", eager: true });

  await pyodide.loadPackage("numpy");
  for (const [path, module] of Object.entries(modules)) {
    const filename = path.split("/").pop();
    pyodide.FS.writeFile(`/home/pyodide/${filename}`, module.default);
  }

  self.postMessage({ type: "ready" });
}

self.onmessage = async (e) => {
  const { type, id, payload } = e.data;
  if (type === "run_election") {
    const { layers, method, num_winners } = payload;
    pyodide.globals.set("layers", layers);
    pyodide.globals.set("method", method);
    pyodide.globals.set("num_winners", num_winners);
    const result = await pyodide.runPythonAsync(`
      import json, elections
      json.dumps(elections.run_election(layers, method, num_winners))
    `);
    self.postMessage({ type: "result", id, result: JSON.parse(result) });
  }
};

init();

