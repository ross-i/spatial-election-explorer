<script>
  import { onMount } from 'svelte';
  import { store } from './store.svelte.js';
  import { run_election } from './bridge.js';
  import { gaussian, uniformRect, uniformDisc, survey } from './lib/pointGen.js';
  import { makeLayer, toLayerBundle, formatLabel } from './lib/layerUtils.js';
  import PlotCanvas from './components/PlotCanvas.svelte';
  import ConfigPanel from './components/ConfigPanel.svelte';
  import DataPointsList from './components/DataPointsList.svelte';
  import TutorialPanel from './components/TutorialPanel.svelte';
  import { TUTORIALS } from './lib/tutorials.js';

  onMount(() => {
    function beforeUnload(e) {
      if (store.layers.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  });

  function addData() {
    const tab = store.activeTab;
    let pts, label, params;

    if (tab === 'synthetic') {
      if (!store.distribution) { alert('Please select a distribution first.'); return; }

      const cx = Number(store.centerX), cy = Number(store.centerY);
      const n = Number(store.count);
      const type = store.pointType;

      if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
        alert('Count must be a positive integer.');
        return;
      }
      if (store.distribution === 'gaussian' && (Number(store.stdDev) < 0 || !Number.isFinite(Number(store.stdDev)))) {
        alert('Standard deviation must be ≥ 0.');
        return;
      }
      if (store.distribution === 'uniform_disc' && (Number(store.discRadius) < 0 || !Number.isFinite(Number(store.discRadius)))) {
        alert('Radius must be ≥ 0.');
        return;
      }
      if (store.distribution === 'uniform_rectangle' &&
          (Number(store.rectWidth) < 0 || Number(store.rectHeight) < 0 ||
           !Number.isFinite(Number(store.rectWidth)) || !Number.isFinite(Number(store.rectHeight)))) {
        alert('Width and height must be ≥ 0.');
        return;
      }

      if (store.distribution === 'gaussian') {
        pts = gaussian(cx, cy, store.stdDev, n);
        label = formatLabel({ kind: 'gaussian', cx, cy, sigma: store.stdDev, type, n });
        params = { kind: 'gaussian', cx, cy, sigma: Number(store.stdDev), type, n };
      } else if (store.distribution === 'uniform_rectangle') {
        pts = uniformRect(cx, cy, store.rectWidth, store.rectHeight, n);
        label = formatLabel({ kind: 'uniform_rectangle', cx, cy, w: store.rectWidth, h: store.rectHeight, type, n });
        params = { kind: 'uniform_rectangle', cx, cy, w: Number(store.rectWidth), h: Number(store.rectHeight), type, n };
      } else {
        pts = uniformDisc(cx, cy, store.discRadius, n);
        label = formatLabel({ kind: 'uniform_disc', cx, cy, r: store.discRadius, type, n });
        params = { kind: 'uniform_disc', cx, cy, r: Number(store.discRadius), type, n };
      }

      if (store.editingLayerId) {
        // Replace existing layer with freshly sampled points
        const id = store.editingLayerId;
        store.layers = store.layers.map(l =>
          l.id === id ? { ...makeLayer(type, pts, label, params), id } : l
        );
        store.editingLayerId = null;
        store.highlightedLayerId = null;
      } else {
        store.layers = [...store.layers, makeLayer(type, pts, label, params)];
      }
      store.distribution = null;

    } else if (tab === 'survey') {
      const n = Number(store.surveyCount);
      pts = survey(store.selectedIdeologies, n);
      label = formatLabel({ kind: 'survey', n });
      store.layers = [...store.layers, makeLayer('voter', pts, label)];

    } else if (tab === 'custom') {
      if (!store.uploadedFile) { alert('Please upload a JSON file first.'); return; }
      const raw = store.uploadedFile.data;
      const voters = raw.filter(p => p.type === 'voter').map(({ x, y }) => ({ x, y }));
      const candidates = raw.filter(p => p.type === 'candidate').map(({ x, y }) => ({ x, y }));
      const newLayers = [];
      if (voters.length) newLayers.push(makeLayer('voter', voters, formatLabel({ kind: 'custom', filename: store.uploadedFile.name })));
      if (candidates.length) newLayers.push(makeLayer('candidate', candidates, formatLabel({ kind: 'custom', filename: store.uploadedFile.name })));
      if (!newLayers.length) { alert('No valid points found in JSON.'); return; }
      store.layers = [...store.layers, ...newLayers];
    }

    store.electionResult = null;
  }

  async function generateElection() {
    const bundle = toLayerBundle(store.layers);
    if (!bundle.length) { alert('Add some data points first.'); return; }
    const hasCandidates = bundle.some(l => l.type === 'candidate');
    const hasVoters = bundle.some(l => l.type === 'voter');
    if (!hasCandidates || !hasVoters) { alert('Need both voter and candidate layers to run an election.'); return; }
    store.isGenerating = true;
    try {
      store.electionResult = await run_election(bundle, store.method, Number(store.numWinners));
    } finally {
      store.isGenerating = false;
    }
  }

  function clearAll() {
    store.layers = [];
    store.electionResult = null;
    store.addMode = null;
    store.selectingCenter = false;
  }

  function exportData() {
    const flat = store.layers.flatMap(l => l.points.map(p => ({ ...p, type: l.type })));
    const blob = new Blob([JSON.stringify(flat, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'saved_data.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handlePlotClick(x, y) {
    if (store.selectingCenter) {
      store.centerX = parseFloat(x.toFixed(3));
      store.centerY = parseFloat(y.toFixed(3));
      store.selectingCenter = false;
      return;
    }
    if (store.addMode) {
      const type = store.addMode;
      store.layers = [...store.layers, makeLayer(
        type,
        [{ x, y }],
        `${type.charAt(0).toUpperCase() + type.slice(1)}(${x.toFixed(2)},${y.toFixed(2)})`
      )];
      store.electionResult = null;
      store.addMode = null;
    }
  }

  function toggleAddMode(mode) {
    store.addMode = store.addMode === mode ? null : mode;
    store.selectingCenter = false;
  }

  function startSelectCenter() {
    store.selectingCenter = true;
    store.addMode = null;
  }

  function deleteLayer(id) {
    store.layers = store.layers.filter(l => l.id !== id);
    store.electionResult = null;
    if (store.highlightedLayerId === id) store.highlightedLayerId = null;
    if (store.editingLayerId === id) { store.editingLayerId = null; store.distribution = null; }
  }

  function toggleLayerVisibility(id) {
    store.layers = store.layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l);
  }

  function startEditLayer(id) {
    const layer = store.layers.find(l => l.id === id);
    if (!layer?.params) return;
    const p = layer.params;
    store.activeTab = 'synthetic';
    store.distribution = p.kind;
    store.centerX = p.cx;
    store.centerY = p.cy;
    store.pointType = p.type;
    store.count = p.n;
    if (p.kind === 'gaussian') store.stdDev = p.sigma;
    if (p.kind === 'uniform_rectangle') { store.rectWidth = p.w; store.rectHeight = p.h; }
    if (p.kind === 'uniform_disc') store.discRadius = p.r;
    store.editingLayerId = id;
    store.highlightedLayerId = id;
  }

  function moveCenterTo(x, y) {
    store.centerX = parseFloat(x.toFixed(3));
    store.centerY = parseFloat(y.toFixed(3));
  }

  let interactive = $derived(!store.tutorialMode && (store.addMode !== null || store.selectingCenter));

  let tutorialStep = $derived(
    TUTORIALS[store.activeTutorialIdx]?.steps[store.activeTutorialStep] ?? null
  );

  let activeLayers = $derived(
    store.tutorialMode ? (tutorialStep?.layers ?? []) : store.layers
  );

  let activeElectionResult = $derived(
    store.tutorialMode ? (tutorialStep?.electionResult ?? null) : store.electionResult
  );

  let centerPreview = $derived(!store.tutorialMode && store.activeTab === 'synthetic' && store.distribution !== null ? {
    x: Number(store.centerX),
    y: Number(store.centerY),
    distribution: store.distribution,
    stdDev: Number(store.stdDev),
    rectWidth: Number(store.rectWidth),
    rectHeight: Number(store.rectHeight),
    discRadius: Number(store.discRadius),
  } : null);

  let panelWidth = $state(380);
  let dragStartX = 0;
  let dragStartWidth = 0;

  function onResizeStart(e) {
    dragStartX = e.clientX;
    dragStartWidth = panelWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    function onMouseMove(e) {
      panelWidth = Math.min(700, Math.max(260, dragStartWidth + (dragStartX - e.clientX)));
    }
    function onMouseUp() {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
</script>

<div class="app">
  <div class="toolbar">
    <div class="toolbar-left" style:visibility={store.tutorialMode ? 'hidden' : 'visible'}>
      <button
        class="toolbar-btn"
        class:active={store.addMode === 'voter'}
        onclick={() => toggleAddMode('voter')}>
        +voter
      </button>
      <button
        class="toolbar-btn"
        class:active={store.addMode === 'candidate'}
        onclick={() => toggleAddMode('candidate')}>
        +candidate
      </button>
    </div>
    <div class="toolbar-center">
      <button
        class="toolbar-btn tutorial-btn"
        class:active={store.tutorialMode}
        onclick={() => { store.tutorialMode = !store.tutorialMode; }}>
        {store.tutorialMode ? '✕ exit tutorial' : '? tutorial'}
      </button>
    </div>
    <div class="toolbar-right" style:visibility={store.tutorialMode ? 'hidden' : 'visible'}>
      <button class="toolbar-btn" onclick={clearAll}>clear</button>
      <button class="toolbar-btn" onclick={exportData}>export</button>
    </div>
  </div>

  <div class="main">
    <div class="plot-area">
      <PlotCanvas
        layers={activeLayers}
        electionResult={activeElectionResult}
        showVoters={store.showVoters}
        showCandidates={store.showCandidates}
        {interactive}
        onPlotClick={handlePlotClick}
        {centerPreview}
        highlightedLayerId={store.highlightedLayerId}
        onCenterMove={moveCenterTo}
      />
    </div>

    <div class="resize-handle" onmousedown={onResizeStart}></div>

    {#if store.tutorialMode}
      <div class="right-panel" style:width="{panelWidth}px">
        <TutorialPanel onExit={() => { store.tutorialMode = false; }} />
      </div>
    {:else}
      <div class="right-panel" style:width="{panelWidth}px">
        <div class="config-area">
          <ConfigPanel onAddData={addData} onSelectCenter={startSelectCenter} />
        </div>
        <div class="data-area">
          <DataPointsList
            onGenerate={generateElection}
            onDelete={deleteLayer}
            onToggleVisibility={toggleLayerVisibility}
            onStartEdit={startEditLayer}
          />
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) { font-family: sans-serif; background: #F5F0E8; overflow: hidden; }

  .app { display: flex; flex-direction: column; height: 100vh; width: 100vw; }

  .toolbar {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 12px;
    flex-shrink: 0;
    background: #F5F0E8;
    border-bottom: 1px solid #D5CFC6;
    gap: 8px;
  }

  .toolbar-left, .toolbar-right { display: flex; gap: 6px; }
  .toolbar-center { position: absolute; left: 50%; transform: translateX(-50%); }
  .tutorial-btn { font-style: italic; letter-spacing: 0.03em; }

  .toolbar-btn {
    padding: 4px 12px;
    border: 1px solid #2D2B27;
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: #2D2B27;
    transition: background 0.1s, opacity 0.1s;
  }
  .toolbar-btn:hover { background: rgba(45,43,39,0.07); }
  .toolbar-btn.active { background: rgba(201,100,66,0.12); border-color: #C96442; color: #C96442; }

  .main { display: flex; flex: 1; overflow: hidden; }

  .plot-area { flex: 1; overflow: hidden; border: 1px solid #D5CFC6; border-right: none; background: #F5F0E8; }

  .resize-handle {
    width: 5px;
    flex-shrink: 0;
    cursor: col-resize;
    background: #D5CFC6;
    transition: background 0.15s;
  }
  .resize-handle:hover { background: #C96442; }

  .right-panel {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .config-area {
    flex: 0 0 auto;
    min-height: 320px;
    max-height: 55%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .data-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
</style>
