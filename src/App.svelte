<script>
  import { onMount, untrack } from 'svelte';
  import { store } from './store.svelte.js';
  import { run_election } from './bridge.js';
  import { gaussian, uniformRect, uniformDisc, surveyFromData } from './lib/pointGen.js';
  import { INDEXES, defaultRankings, rankingsToWeights, scoreRespondent } from './lib/surveyIndexes.js';
  import { makeLayer, toLayerBundle, formatLabel, layerColor, VOTER_LAYER_COLOR, CANDIDATE_LAYER_COLOR } from './lib/layerUtils.js';
  import PlotCanvas from './components/PlotCanvas.svelte';
  import ConfigPanel from './components/ConfigPanel.svelte';
  import DataPointsList from './components/DataPointsList.svelte';
  import TutorialPanel from './components/TutorialPanel.svelte';
  import { TUTORIALS } from './lib/tutorials.js';
  import CandidateProfiler from './components/CandidateProfiler.svelte';

  const ALL_QUESTIONS = INDEXES.flatMap(idx =>
    idx.questions.map(q => ({ ...q, indexLabel: idx.label }))
  );

  let selectedPoint = $state(null);
  let profilingOpen = $state(false);
  let editingCandidateId = $state(null);
  let pendingTab = $state(null);

  function handlePointClick(data) { selectedPoint = data; }
  function closePopup() { selectedPoint = null; }

  onMount(() => {
    function beforeUnload(e) {
      if (store.layers.length > 0) { e.preventDefault(); e.returnValue = ''; }
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
      if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) { alert('Count must be a positive integer.'); return; }
      if (store.distribution === 'gaussian' && (Number(store.stdDev) < 0 || !Number.isFinite(Number(store.stdDev)))) { alert('Standard deviation must be ≥ 0.'); return; }
      if (store.distribution === 'uniform_disc' && (Number(store.discRadius) < 0 || !Number.isFinite(Number(store.discRadius)))) { alert('Radius must be ≥ 0.'); return; }
      if (store.distribution === 'uniform_rectangle' && (Number(store.rectWidth) < 0 || Number(store.rectHeight) < 0 || !Number.isFinite(Number(store.rectWidth)) || !Number.isFinite(Number(store.rectHeight)))) { alert('Width and height must be ≥ 0.'); return; }

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

      const color = type === 'voter' ? VOTER_LAYER_COLOR : CANDIDATE_LAYER_COLOR;
      if (store.editingLayerId) {
        const id = store.editingLayerId;
        const existing = store.layers.find(l => l.id === id);
        const mergedColor = type === 'voter' ? VOTER_LAYER_COLOR : CANDIDATE_LAYER_COLOR;
        store.layers = store.layers.map(l =>
          l.id === id ? { ...makeLayer(type, pts, label, params, mergedColor), id } : l
        );
        store.editingLayerId = null;
        store.highlightedLayerId = null;
      } else {
        store.layers = [...store.layers, makeLayer(type, pts, label, params, color)];
      }
      store.distribution = null;

    } else if (tab === 'survey') {
      if (!store.surveyData) { alert('Survey data is still loading — please wait a moment.'); return; }
      if (!store.surveyXAxis || !store.surveyYAxis) { alert('Please select both X and Y axes first.'); return; }
      if (store.surveyXAxis === store.surveyYAxis) { alert('X and Y axes must be different indexes.'); return; }
      const xIndex = INDEXES.find(i => i.id === store.surveyXAxis);
      const yIndex = INDEXES.find(i => i.id === store.surveyYAxis);
      const rankings = store.surveyRankings ?? defaultRankings();
      pts = surveyFromData(store.surveyData, xIndex, yIndex, rankings);
      if (!pts.length) { alert('No respondents had valid answers for both selected indexes.'); return; }
      label = `Survey: ${xIndex.label} × ${yIndex.label} (${pts.length} respondents)`;
      const existing = store.layers.find(l => l.params?.kind === 'survey');
      if (existing) {
        store.layers = store.layers.map(l =>
          l.id === existing.id ? { ...l, points: pts, label, color: VOTER_LAYER_COLOR } : l
        );
      } else {
        store.layers = [...store.layers, makeLayer('voter', pts, label, { kind: 'survey' }, VOTER_LAYER_COLOR)];
      }

    }

    store.electionResult = null;
  }

  function importLayersFromJson(raw, filename) {
    const fileKind = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw.kind : null;
    const currentTab = store.activeTab;
    if (fileKind === 'synthetic' && currentTab === 'survey') {
      alert('This file is synthetic data, but you\'re on the Survey tab. Switch to the Synthetic tab before importing this file.');
      return;
    }
    if (fileKind === 'survey' && currentTab === 'synthetic') {
      alert('This file is survey data, but you\'re on the Synthetic tab. Switch to the Survey tab before importing this file.');
      return;
    }

    const newLayers = [];
    const isValidPt = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
    if (raw && Array.isArray(raw.layers)) {
      let importCandIdx = 0;
      raw.layers.forEach((l, idx) => {
        if (l.type !== 'voter' && l.type !== 'candidate') return;
        const pts = (l.points ?? []).filter(isValidPt);
        if (!pts.length) return;
        const candColor =
          l.type === 'candidate' && fileKind === 'survey'
            ? (l.color ?? layerColor(store.layers.length + importCandIdx++))
            : l.type === 'voter'
              ? VOTER_LAYER_COLOR
              : CANDIDATE_LAYER_COLOR;
        newLayers.push({
          id: crypto.randomUUID(),
          label: l.label ?? formatLabel({ kind: 'custom', filename }),
          type: l.type,
          points: pts,
          visible: l.visible ?? true,
          color: candColor,
          params: l.params ?? null,
        });
      });
    } else if (Array.isArray(raw)) {
      const voters = raw.filter(p => p.type === 'voter' && isValidPt(p)).map(({ type, ...rest }) => rest);
      const candidates = raw.filter(p => p.type === 'candidate' && isValidPt(p)).map(({ type, ...rest }) => rest);
      if (voters.length) newLayers.push(makeLayer('voter', voters, formatLabel({ kind: 'custom', filename }), null, VOTER_LAYER_COLOR));
      if (candidates.length) newLayers.push(makeLayer('candidate', candidates, formatLabel({ kind: 'custom', filename }), null, CANDIDATE_LAYER_COLOR));
    } else {
      alert('Unrecognized JSON shape — expected an export object or an array of {x, y, type} points.');
      return;
    }
    if (!newLayers.length) { alert('No valid points found in JSON.'); return; }

    if (fileKind === 'survey' && raw.survey) {
      if (raw.survey.xAxis) store.surveyXAxis = raw.survey.xAxis;
      if (raw.survey.yAxis) store.surveyYAxis = raw.survey.yAxis;
      if (raw.survey.rankings) store.surveyRankings = raw.survey.rankings;
    }

    store.layers = [...store.layers, ...newLayers];
    store.electionResult = null;
  }

  let importInput;
  function triggerImport() { importInput?.click(); }
  function handleImportChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        importLayersFromJson(data, file.name);
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  // --- Candidate generation (survey tab) ---

  function nextSurveyCandidateColor() {
    const n = store.layers.filter(l => l.type === 'candidate' && l.params?.kind === 'survey_candidate').length;
    return layerColor(n);
  }

  function candidatePosition(answers) {
    if (!store.surveyXAxis || !store.surveyYAxis || store.surveyXAxis === store.surveyYAxis) return { x: 0.5, y: 0.5 };
    const xIndex = INDEXES.find(i => i.id === store.surveyXAxis);
    const yIndex = INDEXES.find(i => i.id === store.surveyYAxis);
    const rankings = store.surveyRankings ?? defaultRankings();
    const x = scoreRespondent(answers, xIndex, rankingsToWeights(rankings[xIndex.id])) ?? 0.5;
    const y = scoreRespondent(answers, yIndex, rankingsToWeights(rankings[yIndex.id])) ?? 0.5;
    return { x, y };
  }

  function addCandidateLayer(answers, name) {
    const { x, y } = candidatePosition(answers);
    const pt = { x, y, _profile: { ...answers, _name: name } };
    store.layers = [...store.layers, makeLayer('candidate', [pt], name, { kind: 'survey_candidate' }, nextSurveyCandidateColor())];
    store.electionResult = null;
  }

  function generateRandomCandidate() {
    const answers = {};
    for (const idx of INDEXES) {
      for (const q of idx.questions) {
        const valid = Object.entries(q.coding).filter(([, v]) => v !== null).map(([k]) => k);
        answers[q.col] = valid[Math.floor(Math.random() * valid.length)];
      }
    }
    const n = store.layers.filter(l => l.type === 'candidate').length + 1;
    addCandidateLayer(answers, `Random Candidate ${n}`);
  }

  function finalizeProfile(answers, name) {
    if (editingCandidateId) {
      const { x, y } = candidatePosition(answers);
      const pt = { x, y, _profile: { ...answers, _name: name } };
      store.layers = store.layers.map(l =>
        l.id === editingCandidateId ? { ...l, points: [pt], label: name } : l
      );
      store.electionResult = null;
      editingCandidateId = null;
    } else {
      addCandidateLayer(answers, name || 'Candidate');
    }
    profilingOpen = false;
  }

  function startEditCandidate(id) {
    editingCandidateId = id;
    profilingOpen = true;
  }

  function liveUpdateCandidate(answers) {
    if (!editingCandidateId) return;
    const layer = store.layers.find(l => l.id === editingCandidateId);
    if (!layer) return;
    const { x, y } = candidatePosition(answers);
    const pt = { x, y, _profile: { ...answers, _name: layer.label } };
    store.layers = store.layers.map(l =>
      l.id === editingCandidateId ? { ...l, points: [pt] } : l
    );
    store.electionResult = null;
  }

  // --- Existing functionality (preserved) ---

  async function generateElection() {
    const bundle = toLayerBundle(store.layers);
    if (!bundle.length) { alert('Add some data points first.'); return; }
    const hasCandidates = bundle.some(l => l.type === 'candidate');
    const hasVoters = bundle.some(l => l.type === 'voter');
    if (!hasCandidates || !hasVoters) { alert('Need both voter and candidate layers to run an election.'); return; }
    const candidateCount = bundle
      .filter(l => l.type === 'candidate')
      .reduce((n, l) => n + l.points.length, 0);
    const requested = Number(store.numWinners);
    if (!Number.isFinite(requested) || requested < 1) { alert('Number of winners must be at least 1.'); return; }
    if (requested > candidateCount) {
      alert(`Cannot pick ${requested} winners from only ${candidateCount} candidate${candidateCount === 1 ? '' : 's'}.`);
      return;
    }
    store.isGenerating = true;
    try {
      store.electionResult = await run_election(bundle, store.method, requested);
    } finally {
      store.isGenerating = false;
    }
  }

  function clearAll() {
    store.layers = [];
    store.electionResult = null;
    store.addMode = null;
    store.selectingCenter = false;
    store.surveyXAxis = null;
    store.surveyYAxis = null;
  }

  function handleSwitchTab(tab) {
    if (tab === store.activeTab) return;
    if (store.layers.length === 0) {
      store.activeTab = tab;
      store.editingLayerId = null;
    } else {
      pendingTab = tab;
    }
  }

  function confirmSwitchTab() {
    store.layers = [];
    store.electionResult = null;
    store.editingLayerId = null;
    store.surveyXAxis = null;
    store.surveyYAxis = null;
    store.activeTab = pendingTab;
    pendingTab = null;
  }

  function exportData() {
    const kind = store.activeTab === 'survey' ? 'survey' : 'synthetic';
    const payload = {
      version: 2,
      kind,
      exportedAt: new Date().toISOString(),
      layers: store.layers.map(l => ({
        label: l.label,
        type: l.type,
        color: l.color,
        params: l.params,
        visible: l.visible,
        points: l.points,
      })),
    };
    if (kind === 'survey') {
      payload.survey = {
        source: 'Fall 2014 Statewide IL Poll',
        xAxis: store.surveyXAxis,
        yAxis: store.surveyYAxis,
        rankings: store.surveyRankings,
      };
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${kind}_data.json`;
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
      const kind = type === 'candidate' && store.activeTab === 'survey' ? { kind: 'survey_candidate' } : null;
      const plotColor =
        type === 'voter' ? VOTER_LAYER_COLOR : kind ? nextSurveyCandidateColor() : CANDIDATE_LAYER_COLOR;
      store.layers = [...store.layers, makeLayer(
        type, [{ x, y }],
        `${type.charAt(0).toUpperCase() + type.slice(1)}(${x.toFixed(2)},${y.toFixed(2)})`,
        kind,
        plotColor
      )];
      store.electionResult = null;
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

  function onWindowContextMenu(e) {
    if (store.addMode || store.selectingCenter) {
      e.preventDefault();
      store.addMode = null;
      store.selectingCenter = false;
    }
  }

  function isTypingTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  function onWindowKeydown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    if (store.tutorialMode) return;
    const k = e.key.toLowerCase();
    if (k === 'v') {
      if (store.activeTab === 'survey') return;
      e.preventDefault();
      toggleAddMode('voter');
    } else if (k === 'c') {
      if (store.activeTab === 'survey' && !(store.surveyXAxis && store.surveyYAxis && store.surveyXAxis !== store.surveyYAxis)) return;
      e.preventDefault();
      toggleAddMode('candidate');
    } else if (k === 'escape') {
      if (store.addMode || store.selectingCenter) {
        e.preventDefault();
        store.addMode = null;
        store.selectingCenter = false;
      }
    }
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
    store.centerX = p.cx; store.centerY = p.cy;
    store.pointType = p.type; store.count = p.n;
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

  $effect(() => {
    const rankings = store.surveyRankings;
    const xAxis = store.surveyXAxis;
    const yAxis = store.surveyYAxis;
    const data = store.surveyData;
    if (!xAxis || !yAxis || xAxis === yAxis) return;
    const xIndex = INDEXES.find(i => i.id === xAxis);
    const yIndex = INDEXES.find(i => i.id === yAxis);
    const rk = rankings ?? defaultRankings();
    const xWeights = rankingsToWeights(rk[xIndex.id]);
    const yWeights = rankingsToWeights(rk[yIndex.id]);

    const surveyLayer = untrack(() => store.layers.find(l => l.params?.kind === 'survey'));
    const candidateLayers = untrack(() =>
      store.layers.filter(l => l.type === 'candidate' && l.points.some(p => p._profile))
    );
    if (!surveyLayer && !candidateLayers.length) return;

    let newSurveyPts = null;
    let newSurveyLabel = null;
    if (data && surveyLayer) {
      newSurveyPts = surveyFromData(data, xIndex, yIndex, rk);
      newSurveyLabel = `Survey: ${xIndex.label} × ${yIndex.label} (${newSurveyPts.length} respondents)`;
    }

    untrack(() => {
      store.layers = store.layers.map(l => {
        if (surveyLayer && l.id === surveyLayer.id && newSurveyPts?.length) {
          return { ...l, points: newSurveyPts, label: newSurveyLabel };
        }
        if (l.type === 'candidate' && l.points.some(p => p._profile)) {
          const points = l.points.map(p => {
            if (!p._profile) return p;
            const x = scoreRespondent(p._profile, xIndex, xWeights) ?? 0.5;
            const y = scoreRespondent(p._profile, yIndex, yWeights) ?? 0.5;
            return { ...p, x, y };
          });
          return { ...l, points };
        }
        return l;
      });
      store.electionResult = null;
    });
  });

  let axisInfo = $derived(
    store.activeTab === 'survey' &&
    store.surveyXAxis && store.surveyYAxis && store.surveyXAxis !== store.surveyYAxis
      ? { x: INDEXES.find(i => i.id === store.surveyXAxis), y: INDEXES.find(i => i.id === store.surveyYAxis) }
      : null
  );

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

  function popupTitle(pt) {
    if (pt._name !== undefined) return pt._name || 'Candidate';
    return `Respondent #${pt.id}`;
  }
</script>

<svelte:window oncontextmenu={onWindowContextMenu} onkeydown={onWindowKeydown} />

<div class="app">
  <div class="toolbar">
    <div class="toolbar-left" style:visibility={store.tutorialMode ? 'hidden' : 'visible'}>
      <button
        class="toolbar-btn"
        class:active={store.addMode === 'voter'}
        disabled={store.activeTab === 'survey'}
        title="Add voter (press v)"
        onclick={() => toggleAddMode('voter')}>
        +voter <span class="kbd">v</span>
      </button>
      <button
        class="toolbar-btn"
        class:active={store.addMode === 'candidate'}
        disabled={store.activeTab === 'survey' && !(store.surveyXAxis && store.surveyYAxis && store.surveyXAxis !== store.surveyYAxis)}
        title="Add candidate (press c)"
        onclick={() => toggleAddMode('candidate')}>
        +candidate <span class="kbd">c</span>
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
      <button class="toolbar-btn" onclick={triggerImport} title="Import a previously exported JSON file">import</button>
      <button class="toolbar-btn" onclick={exportData}>export</button>
      <input
        bind:this={importInput}
        type="file" accept=".json"
        style="display:none"
        onchange={handleImportChange}
      >
    </div>
  </div>

  <div class="main">
    <div class="plot-area">
      {#if store.addMode}
        <div class="mode-bubble" role="status">
          <span class="mode-dot"></span>
          <span>
            <strong>Add {store.addMode} mode</strong> — click on the plot to drop a {store.addMode}.
            <span class="mode-hint">Right-click (or press Esc) to exit.</span>
          </span>
        </div>
      {/if}
      <PlotCanvas
        layers={activeLayers}
        electionResult={activeElectionResult}
        showVoters={store.showVoters}
        showCandidates={store.showCandidates}
        {interactive}
        onPlotClick={handlePlotClick}
        onPointClick={handlePointClick}
        {centerPreview}
        highlightedLayerId={store.highlightedLayerId}
        onCenterMove={moveCenterTo}
        {axisInfo}
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
          <ConfigPanel onAddData={addData} onSelectCenter={startSelectCenter} onSwitchTab={handleSwitchTab} />
        </div>
        <div class="data-area">
          <DataPointsList
            onGenerate={generateElection}
            onDelete={deleteLayer}
            onToggleVisibility={toggleLayerVisibility}
            onStartEdit={startEditLayer}
            onGenerateRandom={generateRandomCandidate}
            onOpenProfiler={() => { editingCandidateId = null; profilingOpen = true; }}
            onEditCandidate={startEditCandidate}
          />
        </div>
      </div>
    {/if}
  </div>
</div>

{#if profilingOpen}
  {@const editLayer = editingCandidateId ? store.layers.find(l => l.id === editingCandidateId) : null}
  {@const editProfile = editLayer?.points[0]?._profile}
  {@const { _name, ...editAnswers } = editProfile ?? { _name: undefined }}
  <CandidateProfiler
    onFinalize={finalizeProfile}
    onCancel={() => { profilingOpen = false; editingCandidateId = null; }}
    initialAnswers={editProfile ? editAnswers : null}
    initialName={editProfile ? (_name ?? '') : null}
    onLiveUpdate={editingCandidateId ? liveUpdateCandidate : null}
  />
{/if}

{#if pendingTab !== null}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="popup-backdrop" onclick={() => pendingTab = null}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="tab-confirm-modal" onclick={e => e.stopPropagation()}>
      <div class="tab-confirm-body">
        <p class="tab-confirm-msg">Data cannot transfer between tabs as the axes may not align. Do you want to reset the data and plot so you can work in the <strong>{pendingTab}</strong> tab?</p>
      </div>
      <div class="tab-confirm-btns">
        <button class="tab-confirm-cancel" onclick={() => pendingTab = null}>No, return to {store.activeTab}</button>
        <button class="tab-confirm-ok" onclick={confirmSwitchTab}>Yes, erase data</button>
      </div>
    </div>
  </div>
{/if}

{#if selectedPoint}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="popup-backdrop" onclick={closePopup}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="popup" onclick={e => e.stopPropagation()}>
      <div class="popup-header">
        <span class="popup-title">{popupTitle(selectedPoint)}</span>
        <button class="popup-close" onclick={closePopup}>✕</button>
      </div>
      <div class="popup-body">
        <table class="popup-table">
          <thead>
            <tr><th>Index</th><th>Question</th><th>Response</th></tr>
          </thead>
          <tbody>
            {#each ALL_QUESTIONS as q}
              {@const raw = selectedPoint[q.col]}
              {@const missing = raw == null || raw === '' || raw === '9'}
              {@const answer = (!raw || raw === '') ? 'No answer' : (q.valueLabels?.[raw] ?? `Unknown (${raw})`)}
              <tr class={missing ? 'missing' : ''}>
                <td class="idx-cell">{q.indexLabel}</td>
                <td>{q.label}</td>
                <td class="val-cell">{answer}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
{/if}

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
    padding: 4px 12px; border: 1px solid #2D2B27; border-radius: 4px;
    background: transparent; cursor: pointer; font-size: 12px; font-weight: 500;
    color: #2D2B27; transition: background 0.1s, opacity 0.1s;
  }
  .toolbar-btn:hover:not(:disabled) { background: rgba(45,43,39,0.07); }
  .toolbar-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .toolbar-btn.active { background: rgba(204,120,87,0.12); border-color: #CC7857; color: #CC7857; }
  .kbd {
    display: inline-block; margin-left: 4px; padding: 0 5px;
    border: 1px solid #C0BAB2; border-bottom-width: 2px; border-radius: 3px;
    background: #FAF7F2; color: #6B6560; font-size: 10px; font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height: 1.4;
  }
  .toolbar-btn.active .kbd { border-color: #CC7857; color: #CC7857; background: #fff; }

  .main { display: flex; flex: 1; overflow: hidden; }
  .plot-area { position: relative; flex: 1; overflow: hidden; border: 1px solid #D5CFC6; border-right: none; background: #F5F0E8; }
  .mode-bubble {
    position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
    display: flex; align-items: center; gap: 8px;
    padding: 7px 14px; border-radius: 999px;
    background: #2D2B27; color: #F5F0E8; font-size: 12px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.18);
    pointer-events: none; z-index: 10;
    animation: bubble-in 0.18s ease-out;
  }
  .mode-bubble strong { color: #fff; font-weight: 600; text-transform: capitalize; }
  .mode-dot {
    width: 8px; height: 8px; border-radius: 50%; background: #CC7857;
    box-shadow: 0 0 0 0 rgba(204,120,87,0.6);
    animation: bubble-pulse 1.4s ease-out infinite;
  }
  .mode-hint { opacity: 0.7; margin-left: 4px; }
  @keyframes bubble-in {
    from { opacity: 0; transform: translate(-50%, -6px); }
    to   { opacity: 1; transform: translate(-50%, 0); }
  }
  @keyframes bubble-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(204,120,87,0.6); }
    70%  { box-shadow: 0 0 0 8px rgba(204,120,87,0); }
    100% { box-shadow: 0 0 0 0 rgba(204,120,87,0); }
  }

  .resize-handle {
    width: 5px;
    flex-shrink: 0;
    cursor: col-resize;
    background: #D5CFC6;
    transition: background 0.15s;
  }
  .resize-handle:hover { background: #CC7857; }

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

  .tab-confirm-modal {
    background: #fff; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.22);
    width: min(420px, 92vw); overflow: hidden;
  }
  .tab-confirm-body { padding: 20px 20px 12px; }
  .tab-confirm-msg { font-size: 13px; line-height: 1.5; color: #2D2B27; }
  .tab-confirm-btns {
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 12px 16px; border-top: 1px solid #e5e7eb;
  }
  .tab-confirm-cancel {
    padding: 6px 14px; border: 1px solid #C0BAB2; border-radius: 4px;
    background: #FAF7F2; color: #2D2B27; cursor: pointer; font-size: 12px; font-weight: 500;
  }
  .tab-confirm-cancel:hover { background: #EDE8DF; }
  .tab-confirm-ok {
    padding: 6px 14px; border: none; border-radius: 4px;
    background: #CC7857; color: #fff; cursor: pointer; font-size: 12px; font-weight: 600;
  }
  .tab-confirm-ok:hover { background: #B8634A; }

  .popup-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center; z-index: 100;
  }
  .popup {
    background: #fff; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.22);
    width: min(560px, 92vw); max-height: 80vh; display: flex; flex-direction: column; overflow: hidden;
  }
  .popup-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
  }
  .popup-title { font-weight: bold; font-size: 14px; }
  .popup-close { background: none; border: none; cursor: pointer; font-size: 16px; color: #6b7280; padding: 0 2px; line-height: 1; }
  .popup-close:hover { color: #111; }
  .popup-body { overflow-y: auto; }
  .popup-table { width: 100%; border-collapse: collapse; font-size: 12px; }
  .popup-table thead th {
    text-align: left; padding: 6px 12px; background: #f9fafb;
    font-size: 11px; font-weight: 600; color: #6b7280;
    text-transform: uppercase; letter-spacing: 0.04em;
    border-bottom: 1px solid #e5e7eb; position: sticky; top: 0;
  }
  .popup-table tbody tr { border-bottom: 1px solid #f3f4f6; }
  .popup-table tbody tr:hover { background: #f9fafb; }
  .popup-table tbody tr.missing { color: #9ca3af; }
  .popup-table td { padding: 6px 12px; vertical-align: top; }
  .idx-cell { color: #6b7280; font-size: 11px; white-space: nowrap; }
  .val-cell { font-weight: 500; }
</style>
