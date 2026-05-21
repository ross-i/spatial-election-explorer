<script>
  import { onMount, untrack } from 'svelte';
  import { store } from './store.svelte.js';
  import { run_election } from './bridge.js';
  import { gaussian, uniformRect, uniformDisc, surveyFromData } from './lib/pointGen.js';
  import { INDEXES, defaultRankings, rankingsToWeights, scoreRespondent } from './lib/surveyIndexes.js';
  import { makeLayer, toLayerBundle, formatLabel, layerColor, VOTER_LAYER_COLOR, CANDIDATE_LAYER_COLOR, SURVEY_CLICK_CANDIDATE_COLOR } from './lib/layerUtils.js';
  import PlotCanvas from './components/PlotCanvas.svelte';
  import ConfigPanel from './components/ConfigPanel.svelte';
  import DataPointsList from './components/DataPointsList.svelte';
  import TutorialPanel from './components/TutorialPanel.svelte';
  import WalkthroughOverlay from './components/WalkthroughOverlay.svelte';
  import { TUTORIALS } from './lib/tutorials.js';
  import CandidateProfiler from './components/CandidateProfiler.svelte';

  const ALL_QUESTIONS = INDEXES.flatMap(idx =>
    idx.questions.map(q => ({ ...q, indexLabel: idx.label }))
  );

  let selectedPoint = $state(null);
  let profilingOpen = $state(false);
  let openEditorIds = $state([]);
  let focusedPanelId = $state(null);

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

  function rePlotSurvey() {
    if (!store.surveyData) { alert('Survey data is still loading — please wait a moment.'); return; }
    if (!store.surveyXAxis || !store.surveyYAxis) { alert('Please select both X and Y axes first.'); return; }
    if (store.surveyXAxis === store.surveyYAxis) { alert('X and Y axes must be different indexes.'); return; }
    const xIndex = INDEXES.find(i => i.id === store.surveyXAxis);
    const yIndex = INDEXES.find(i => i.id === store.surveyYAxis);
    const rankings = store.surveyRankings ?? defaultRankings();
    const pts = surveyFromData(store.surveyData, xIndex, yIndex, rankings);
    if (!pts.length) { alert('No respondents had valid answers for both selected indexes.'); return; }
    const label = `Survey: ${xIndex.label} × ${yIndex.label} (${pts.length} respondents)`;
    store.layers = [...store.layers, makeLayer('voter', pts, label, { kind: 'survey' }, VOTER_LAYER_COLOR)];
    store.surveyWasDeleted = false;
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

  function candidatePosition(answers) {
    if (!store.surveyXAxis || !store.surveyYAxis || store.surveyXAxis === store.surveyYAxis) return { x: 0.5, y: 0.5 };
    const xIndex = INDEXES.find(i => i.id === store.surveyXAxis);
    const yIndex = INDEXES.find(i => i.id === store.surveyYAxis);
    const rankings = store.surveyRankings ?? defaultRankings();
    const x = scoreRespondent(answers, xIndex, rankingsToWeights(rankings[xIndex.id])) ?? 0.5;
    const y = scoreRespondent(answers, yIndex, rankingsToWeights(rankings[yIndex.id])) ?? 0.5;
    return { x, y };
  }

  function addCandidateLayer(answers, name, color = CANDIDATE_LAYER_COLOR) {
    const { x, y } = candidatePosition(answers);
    const pt = { x, y, _profile: { ...answers, _name: name } };
    store.layers = [...store.layers, makeLayer('candidate', [pt], name, { kind: 'survey_candidate' }, color)];
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

  function finalizeProfile(answers, name, color) {
    addCandidateLayer(answers, name || 'Candidate', color);
    profilingOpen = false;
    if (focusedPanelId === 'new') focusedPanelId = openEditorIds.length > 0 ? openEditorIds[openEditorIds.length - 1] : null;
  }

  function openEditorPanel(id) {
    if (!openEditorIds.includes(id)) {
      openEditorIds = openEditorIds.length >= 3 ? [...openEditorIds.slice(1), id] : [...openEditorIds, id];
    }
    focusedPanelId = id;
  }

  function closeEditor(id) {
    openEditorIds = openEditorIds.filter(x => x !== id);
    if (focusedPanelId === id) {
      focusedPanelId = openEditorIds.length > 0 ? openEditorIds[openEditorIds.length - 1] : (profilingOpen ? 'new' : null);
    }
  }

  function finalizeEdit(candidateId, answers, name) {
    const { x, y } = candidatePosition(answers);
    const pt = { x, y, _profile: { ...answers, _name: name } };
    store.layers = store.layers.map(l =>
      l.id === candidateId ? { ...l, points: [pt], label: name } : l
    );
    store.electionResult = null;
    closeEditor(candidateId);
  }

  function startEditCandidate(id) {
    openEditorPanel(id);
  }

  function renameCandidate(candidateId, name, color) {
    store.layers = store.layers.map(l =>
      l.id === candidateId ? { ...l, label: name, color } : l
    );
  }

  function liveUpdateEdit(candidateId, answers) {
    const layer = store.layers.find(l => l.id === candidateId);
    if (!layer) return;
    const { x, y } = candidatePosition(answers);
    const pt = { x, y, _profile: { ...answers, _name: layer.label } };
    store.layers = store.layers.map(l =>
      l.id === candidateId ? { ...l, points: [pt] } : l
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
    const myToken = ++generationToken;
    store.isGenerating = true;
    try {
      const result = await run_election(bundle, store.method, requested);
      if (myToken !== generationToken) return; // user canceled — drop the stale result
      store.electionResult = result;
    } finally {
      if (myToken === generationToken) store.isGenerating = false;
    }
  }

  let generationToken = 0;
  function cancelGeneration() {
    if (!store.isGenerating) return;
    generationToken++;
    store.isGenerating = false;
  }

  function clearAll() {
    cancelGeneration();
    store.layers = [];
    store.electionResult = null;
    store.addMode = null;
    store.selectingCenter = false;
    store.surveyXAxis = null;
    store.surveyYAxis = null;
    store.surveyWasDeleted = false;
  }

  // Per-tab session caches: switching tabs preserves the work in each tab
  // rather than erasing. Each entry holds the data the other tab doesn't care
  // about (layers, axes, distribution params, etc.) keyed by activeTab.
  const tabSnapshots = { synthetic: null, survey: null };

  function captureTabState() {
    return {
      layers: cloneLayers(store.layers),
      electionResult: store.electionResult,
      editingLayerId: store.editingLayerId,
      surveyXAxis: store.surveyXAxis,
      surveyYAxis: store.surveyYAxis,
      surveyRankings: store.surveyRankings ? { ...store.surveyRankings } : store.surveyRankings,
      surveyXRankOpen: store.surveyXRankOpen,
      surveyYRankOpen: store.surveyYRankOpen,
      distribution: store.distribution,
      centerX: store.centerX,
      centerY: store.centerY,
      stdDev: store.stdDev,
      rectWidth: store.rectWidth,
      rectHeight: store.rectHeight,
      discRadius: store.discRadius,
      pointType: store.pointType,
      count: store.count,
      method: store.method,
      numWinners: store.numWinners,
    };
  }

  function applyTabState(s) {
    untrack(() => {
      store.layers = s.layers;
      store.electionResult = s.electionResult;
      store.editingLayerId = s.editingLayerId;
      store.surveyXAxis = s.surveyXAxis;
      store.surveyYAxis = s.surveyYAxis;
      store.surveyRankings = s.surveyRankings;
      store.surveyXRankOpen = s.surveyXRankOpen;
      store.surveyYRankOpen = s.surveyYRankOpen;
      store.distribution = s.distribution;
      store.centerX = s.centerX;
      store.centerY = s.centerY;
      store.stdDev = s.stdDev;
      store.rectWidth = s.rectWidth;
      store.rectHeight = s.rectHeight;
      store.discRadius = s.discRadius;
      store.pointType = s.pointType;
      store.count = s.count;
      store.method = s.method;
      store.numWinners = s.numWinners;
    });
  }

  function blankTabState() {
    return {
      layers: [],
      electionResult: null,
      editingLayerId: null,
      surveyXAxis: null,
      surveyYAxis: null,
      surveyRankings: defaultRankings(),
      surveyXRankOpen: false,
      surveyYRankOpen: false,
      distribution: null,
      centerX: 0.5,
      centerY: 0.5,
      stdDev: 0.1,
      rectWidth: 0.3,
      rectHeight: 0.3,
      discRadius: 0.2,
      pointType: 'voter',
      count: 20,
      method: store.method,
      numWinners: store.numWinners,
    };
  }

  function handleSwitchTab(tab) {
    if (tab === store.activeTab) return;
    if (tab === 'synthetic') { openEditorIds = []; profilingOpen = false; focusedPanelId = null; }
    tabSnapshots[store.activeTab] = captureTabState();
    store.activeTab = tab;
    applyTabState(tabSnapshots[tab] ?? blankTabState());
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
        type === 'voter'
          ? VOTER_LAYER_COLOR
          : kind
            ? SURVEY_CLICK_CANDIDATE_COLOR
            : CANDIDATE_LAYER_COLOR;
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
    if (e.key === 'Escape' && selectedPoint) { e.preventDefault(); closePopup(); return; }
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
    const deleted = store.layers.find(l => l.id === id);
    if (deleted?.params?.kind === 'survey') store.surveyWasDeleted = true;
    store.layers = store.layers.filter(l => l.id !== id);
    store.electionResult = null;
    if (store.highlightedLayerId === id) store.highlightedLayerId = null;
    if (store.editingLayerId === id) { store.editingLayerId = null; store.distribution = null; }
    if (openEditorIds.includes(id)) closeEditor(id);
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

  let interactive = $derived(
    (!store.tutorialMode || !!TUTORIALS[store.activeTutorialIdx]?.walkthrough) &&
    (store.addMode !== null || store.selectingCenter)
  );

  /** Cancels an in-flight survey ranking/axis tween (new deps re-run the effect). */
  let cancelSurveyRankTween = null;
  const SURVEY_RANK_TWEEN_MS = 420;
  function easeOutCubic(t) {
    return 1 - (1 - t) ** 3;
  }

  // Delete position-placed survey candidates only when the axis topic actually changes
  let _prevXAxis = store.surveyXAxis;
  let _prevYAxis = store.surveyYAxis;
  $effect(() => {
    const xAxis = store.surveyXAxis;
    const yAxis = store.surveyYAxis;
    if (xAxis === _prevXAxis && yAxis === _prevYAxis) return;
    _prevXAxis = xAxis;
    _prevYAxis = yAxis;
    untrack(() => {
      store.layers = store.layers.filter(l =>
        !(l.params?.kind === 'survey_candidate' && !l.points.some(p => p._profile))
      );
      store.electionResult = null;
    });
  });

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

    if (store.activeTab !== 'survey') return;

    const surveyLayer = untrack(() => store.layers.find(l => l.params?.kind === 'survey'));
    const candidateLayers = untrack(() =>
      store.layers.filter(l => l.type === 'candidate' && l.points.some(p => p._profile))
    );

    let newSurveyPts = null;
    let newSurveyLabel = null;
    if (data) {
      newSurveyPts = surveyFromData(data, xIndex, yIndex, rk);
      newSurveyLabel = `Survey: ${xIndex.label} × ${yIndex.label} (${newSurveyPts.length} respondents)`;
    }

    if (!surveyLayer && !candidateLayers.length && !newSurveyPts?.length) return;

    untrack(() => {
      cancelSurveyRankTween?.();
      cancelSurveyRankTween = null;

      let layers = store.layers.map(l => {
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
      const prependedSurvey = !surveyLayer && newSurveyPts?.length;
      if (prependedSurvey) {
        layers = [
          makeLayer('voter', newSurveyPts, newSurveyLabel, { kind: 'survey' }, layerColor(layers.length)),
          ...layers,
        ];
      }

      store.electionResult = null;

      if (prependedSurvey) {
        store.layers = layers;
        return;
      }

      const oldSurveyPts = surveyLayer?.points ?? [];
      const hasSurveyAnim =
        Boolean(surveyLayer && newSurveyPts?.length > 0 && oldSurveyPts.length > 0);
      const hasCandAnim = candidateLayers.length > 0;

      if (!hasSurveyAnim && !hasCandAnim) {
        store.layers = layers;
        return;
      }

      const oldSurveyById = new Map(
        oldSurveyPts
          .filter((p) => p._respondent?.id != null)
          .map((p) => [String(p._respondent.id), { x: p.x, y: p.y }])
      );
      const oldCandByLayerId = new Map(
        candidateLayers.map((l) => [l.id, l.points.map((p) => ({ x: p.x, y: p.y }))])
      );

      let cancelled = false;
      cancelSurveyRankTween = () => {
        cancelled = true;
        cancelSurveyRankTween = null;
      };

      let start = null;
      function frame(now) {
        if (cancelled) return;
        if (start === null) start = now;
        const u = Math.min(1, (now - start) / SURVEY_RANK_TWEEN_MS);
        const t = easeOutCubic(u);
        const next = layers.map((l) => {
          if (surveyLayer && l.id === surveyLayer.id && newSurveyPts?.length) {
            const pts = newSurveyPts.map((np) => {
              const id = np._respondent?.id;
              if (id == null) return np;
              const old = oldSurveyById.get(String(id));
              if (!old) return np;
              return {
                ...np,
                x: old.x + (np.x - old.x) * t,
                y: old.y + (np.y - old.y) * t,
              };
            });
            return { ...l, points: pts, label: newSurveyLabel };
          }
          if (l.type === 'candidate' && l.points.some((p) => p._profile)) {
            const starts = oldCandByLayerId.get(l.id);
            const pts = l.points.map((p, i) => {
              if (!p._profile) return p;
              const old = starts?.[i];
              if (!old) return p;
              return {
                ...p,
                x: old.x + (p.x - old.x) * t,
                y: old.y + (p.y - old.y) * t,
              };
            });
            return { ...l, points: pts };
          }
          return l;
        });
        store.layers = next;
        if (u < 1) {
          requestAnimationFrame(frame);
        } else if (!cancelled) {
          store.layers = layers;
          cancelSurveyRankTween = null;
        }
      }
      requestAnimationFrame(frame);
    });
  });

  let axisInfo = $derived(
    (!store.tutorialMode || !!TUTORIALS[store.activeTutorialIdx]?.walkthrough) &&
    store.activeTab === 'survey' &&
    store.surveyXAxis && store.surveyYAxis && store.surveyXAxis !== store.surveyYAxis
      ? { x: INDEXES.find(i => i.id === store.surveyXAxis), y: INDEXES.find(i => i.id === store.surveyYAxis) }
      : null
  );

  let tutorialStep = $derived(
    TUTORIALS[store.activeTutorialIdx]?.steps[store.activeTutorialStep] ?? null
  );

  let isWalkthrough = $derived(
    store.tutorialMode && !!TUTORIALS[store.activeTutorialIdx]?.walkthrough
  );

  let userSnapshot = null;    // user's pre-tutorial app state
  let tutorialSnapshot = null; // walkthrough-internal state, kept between visits

  function cloneLayers(layers) {
    return layers.map(l => ({
      ...l,
      points: l.points.map(p => ({ ...p })),
      params: l.params ? { ...l.params } : l.params,
    }));
  }

  function captureState() {
    return {
      activeTab: store.activeTab,
      surveyXAxis: store.surveyXAxis,
      surveyYAxis: store.surveyYAxis,
      surveyRankings: store.surveyRankings ? { ...store.surveyRankings } : store.surveyRankings,
      surveyXRankOpen: store.surveyXRankOpen,
      surveyYRankOpen: store.surveyYRankOpen,
      layers: cloneLayers(store.layers),
      electionResult: store.electionResult,
      method: store.method,
      numWinners: store.numWinners,
    };
  }

  function applyState(s) {
    untrack(() => {
      store.activeTab = s.activeTab;
      store.surveyXAxis = s.surveyXAxis;
      store.surveyYAxis = s.surveyYAxis;
      store.surveyRankings = s.surveyRankings;
      store.surveyXRankOpen = s.surveyXRankOpen;
      store.surveyYRankOpen = s.surveyYRankOpen;
      store.layers = s.layers;
      store.electionResult = s.electionResult;
      store.method = s.method;
      store.numWinners = s.numWinners;
    });
  }

  function blankTutorialState() {
    return {
      activeTab: 'survey',
      surveyXAxis: null,
      surveyYAxis: null,
      surveyRankings: defaultRankings(),
      surveyXRankOpen: false,
      surveyYRankOpen: false,
      layers: [],
      electionResult: null,
      method: store.method,
      numWinners: store.numWinners,
    };
  }

  function exitTutorial() {
    store.tutorialMode = false;
    store.activeTutorialIdx = 0;
    store.activeTutorialStep = 0;
  }

  function enterWalkthrough() {
    userSnapshot = captureState();
    applyState(tutorialSnapshot ?? blankTutorialState());
  }

  function exitWalkthrough() {
    tutorialSnapshot = captureState();
    if (userSnapshot) applyState(userSnapshot);
    userSnapshot = null;
  }

  $effect.pre(() => {
    if (isWalkthrough) {
      if (!userSnapshot) enterWalkthrough();
    } else {
      if (userSnapshot) exitWalkthrough();
    }
  });

  let activeLayers = $derived(
    store.tutorialMode && !isWalkthrough ? (tutorialStep?.layers ?? []) : store.layers
  );

  let activeElectionResult = $derived(
    store.tutorialMode && !isWalkthrough ? (tutorialStep?.electionResult ?? null) : store.electionResult
  );

  let centerPreview = $derived((!store.tutorialMode || isWalkthrough) && store.activeTab === 'synthetic' && store.distribution !== null ? {
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

  function onResizeKey(e) {
    const STEP = 16;
    if (e.key === 'ArrowLeft') { panelWidth = Math.min(700, panelWidth + STEP); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { panelWidth = Math.max(260, panelWidth - STEP); e.preventDefault(); }
    else if (e.key === 'Home') { panelWidth = 700; e.preventDefault(); }
    else if (e.key === 'End') { panelWidth = 260; e.preventDefault(); }
  }

  /** Right column (config + data); used to clamp survey vertical split. */
  let rightPanelEl = $state(null);

  const SURVEY_STACK_HANDLE = 6;
  const SURVEY_STACK_MIN_TOP = 140;
  const SURVEY_STACK_MIN_DATA = 168;

  function clampSurveyStackTop(px) {
    const el = rightPanelEl;
    if (!el) return px;
    const total = el.getBoundingClientRect().height;
    const maxTop = total - SURVEY_STACK_MIN_DATA - SURVEY_STACK_HANDLE;
    return Math.round(Math.min(Math.max(SURVEY_STACK_MIN_TOP, maxTop), Math.max(SURVEY_STACK_MIN_TOP, px)));
  }

  $effect(() => {
    if (store.activeTab !== 'survey' || !rightPanelEl) return;
    const el = rightPanelEl;
    const ro = new ResizeObserver(() => {
      // Skip transient sub-minimum heights (e.g. devtools screenshot capture
      // temporarily reflows the viewport) — otherwise the clamp pins the top
      // panel to its minimum and the value persists after capture.
      const total = el.getBoundingClientRect().height;
      if (total < SURVEY_STACK_MIN_TOP + SURVEY_STACK_MIN_DATA + SURVEY_STACK_HANDLE) return;
      untrack(() => {
        store.surveyStackTopPx = clampSurveyStackTop(store.surveyStackTopPx);
      });
    });
    ro.observe(el);
    untrack(() => {
      store.surveyStackTopPx = clampSurveyStackTop(store.surveyStackTopPx);
    });
    return () => ro.disconnect();
  });

  function onSurveyStackResizeStart(e) {
    if (store.activeTab !== 'survey') return;
    e.preventDefault();
    const startY = e.clientY;
    const startH = store.surveyStackTopPx;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    function onMouseMove(ev) {
      store.surveyStackTopPx = clampSurveyStackTop(startH + (ev.clientY - startY));
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

  function onSurveyStackResizeKey(e) {
    const STEP = 12;
    if (e.key === 'ArrowDown') {
      store.surveyStackTopPx = clampSurveyStackTop(store.surveyStackTopPx + STEP);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      store.surveyStackTopPx = clampSurveyStackTop(store.surveyStackTopPx - STEP);
      e.preventDefault();
    } else if (e.key === 'Home') {
      store.surveyStackTopPx = clampSurveyStackTop(SURVEY_STACK_MIN_TOP);
      e.preventDefault();
    } else if (e.key === 'End') {
      const el = rightPanelEl;
      const total = el?.getBoundingClientRect().height ?? 600;
      store.surveyStackTopPx = clampSurveyStackTop(
        total - SURVEY_STACK_MIN_DATA - SURVEY_STACK_HANDLE
      );
      e.preventDefault();
    }
  }

  function popupTitle(pt) {
    if (pt._name !== undefined) return pt._name || 'Candidate';
    return `Respondent #${pt.id}`;
  }
</script>

<svelte:window oncontextmenu={onWindowContextMenu} onkeydown={onWindowKeydown} />

<div class="app">
  <div class="toolbar">
    <div class="toolbar-left" style:visibility={store.tutorialMode && !isWalkthrough ? 'hidden' : 'visible'}>
      <button
        class="toolbar-btn"
        class:active={store.addMode === 'voter'}
        disabled={store.activeTab === 'survey'}
        title="Add voter (press v)"
        onclick={() => toggleAddMode('voter')}>
        +voter<span class="kbd">v</span>
      </button>
      <button
        class="toolbar-btn"
        class:active={store.addMode === 'candidate'}
        disabled={store.activeTab === 'survey' && !(store.surveyXAxis && store.surveyYAxis && store.surveyXAxis !== store.surveyYAxis)}
        title="Add candidate (press c)"
        data-walkthrough="add-candidate-btn"
        onclick={() => toggleAddMode('candidate')}>
        +candidate<span class="kbd">c</span>
      </button>
    </div>
    <div class="toolbar-center">
      {#if store.addMode}
        <div class="mode-bubble" role="status">
          <span class="mode-dot"></span>
          <span>
            {#if store.addMode === 'candidate' && store.activeTab === 'survey'}
              <strong>Add candidate mode</strong> — click on the plot to place a candidate by position. <em>Note: candidates placed this way will be removed if you change the axis topics.</em>
            {:else}
              <strong>Add {store.addMode} mode</strong> — click on the plot to drop a {store.addMode}.
            {/if}
            <span class="mode-hint">Right-click (or press Esc) to exit.</span>
          </span>
        </div>
      {/if}
      <button
        class="toolbar-btn tutorial-btn"
        class:active={store.tutorialMode}
        onclick={() => { if (store.tutorialMode) exitTutorial(); else store.tutorialMode = true; }}>
        {store.tutorialMode ? '✕ exit tutorial' : '? tutorial'}
      </button>
    </div>
    <div class="toolbar-right" style:visibility={store.tutorialMode && !isWalkthrough ? 'hidden' : 'visible'}>
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
    <div class="plot-area" data-walkthrough="plot-area">
      <PlotCanvas
        layers={activeLayers}
        electionResult={activeElectionResult}
        showVoters={store.showVoters}
        showCandidates={store.showCandidates}
        {interactive}
        onPlotClick={handlePlotClick}
        onPointClick={store.addMode ? null : handlePointClick}
        {centerPreview}
        highlightedLayerId={store.highlightedLayerId}
        onCenterMove={moveCenterTo}
        {axisInfo}
      />
    </div>

    {#if profilingOpen || openEditorIds.length > 0}
      <div class="profiler-col">
        {#if profilingOpen}
          <CandidateProfiler
            panel={true}
            active={focusedPanelId === 'new'}
            onFocus={() => { focusedPanelId = 'new'; }}
            onFinalize={finalizeProfile}
            onCancel={() => { profilingOpen = false; if (focusedPanelId === 'new') focusedPanelId = openEditorIds.length > 0 ? openEditorIds[openEditorIds.length - 1] : null; }}
            initialAnswers={null}
            initialName={null}
            onLiveUpdate={null}
          />
        {/if}
        {#each openEditorIds as editorId}
          {@const editLayer = store.layers.find(l => l.id === editorId)}
          {@const editProfile = editLayer?.points[0]?._profile}
          {@const { _name, ...editAnswers } = editProfile ?? { _name: undefined }}
          <CandidateProfiler
            panel={true}
            active={focusedPanelId === editorId}
            onFocus={() => { focusedPanelId = editorId; }}
            onFinalize={(answers, name, color) => finalizeEdit(editorId, answers, name)}
            onCancel={() => closeEditor(editorId)}
            onRename={(name, color) => renameCandidate(editorId, name, color)}
            initialAnswers={editAnswers}
            initialName={_name ?? ''}
            onLiveUpdate={(answers) => liveUpdateEdit(editorId, answers)}
            displayName={editLayer?.label ?? ''}
            displayColor={editLayer?.color ?? null}
          />
        {/each}
      </div>
    {/if}

    <div
      class="resize-handle"
      role="slider"
      aria-orientation="vertical"
      aria-label="Resize side panel"
      aria-valuemin={260}
      aria-valuemax={700}
      aria-valuenow={panelWidth}
      tabindex="0"
      onmousedown={onResizeStart}
      onkeydown={onResizeKey}
    ></div>

    {#if store.tutorialMode && !isWalkthrough}
      <div class="right-panel" style:width="{panelWidth}px">
        <TutorialPanel onExit={exitTutorial} />
      </div>
    {:else}
      <div class="right-panel" bind:this={rightPanelEl} style:width="{panelWidth}px">
        <div
          class="config-area"
          class:config-area-survey={store.activeTab === 'survey'}
          style:flex={store.activeTab === 'survey' ? `0 0 ${store.surveyStackTopPx}px` : undefined}
        >
          <ConfigPanel onAddData={addData} onSelectCenter={startSelectCenter} onSwitchTab={handleSwitchTab} />
        </div>
        {#if store.activeTab === 'survey'}
          <div
            class="survey-stack-handle"
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize voter survey panel and candidate panel"
            tabindex="0"
            onmousedown={onSurveyStackResizeStart}
            onkeydown={onSurveyStackResizeKey}
          ></div>
        {/if}
        <div class="data-area">
          <DataPointsList
            onGenerate={generateElection}
            onCancel={cancelGeneration}
            onDelete={deleteLayer}
            onToggleVisibility={toggleLayerVisibility}
            onStartEdit={startEditLayer}
            onGenerateRandom={generateRandomCandidate}
            onOpenProfiler={() => { profilingOpen = true; focusedPanelId = 'new'; }}
            onEditCandidate={startEditCandidate}
            onRePlotSurvey={rePlotSurvey}
          />
        </div>
      </div>
    {/if}
  </div>
</div>

{#if isWalkthrough}
  <WalkthroughOverlay
    onExit={exitTutorial}
    onGenerateRandomCandidate={generateRandomCandidate}
    onAddData={addData}
  />
{/if}

{#if selectedPoint}
  <div
    class="popup-backdrop"
    role="presentation"
    onclick={(e) => { if (e.target === e.currentTarget) closePopup(); }}
  >
    <div
      class="popup"
      role="dialog"
      aria-modal="true"
      aria-label={popupTitle(selectedPoint)}
      tabindex="-1"
    >
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
  :global(.walkthrough-highlight) {
    outline: 3px solid #C96442 !important;
    outline-offset: 2px;
    box-shadow:
      inset 0 0 0 3px #C96442,
      inset 0 0 0 9px rgba(201,100,66,0.14),
      0 0 0 6px rgba(201,100,66,0.25);
    position: relative;
    z-index: 1000;
    transition: outline-color 0.15s, box-shadow 0.15s;
  }

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
  .toolbar-center { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; min-width: 0; }
  .tutorial-btn { font-style: italic; letter-spacing: 0.03em; }

  .toolbar-btn {
    display: inline-flex; align-items: center; gap: 4px;
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
    display: flex; align-items: center; gap: 8px;
    padding: 5px 12px; border-radius: 999px;
    background: #2D2B27; color: #F5F0E8; font-size: 11px;
    pointer-events: none;
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
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bubble-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(204,120,87,0.6); }
    70%  { box-shadow: 0 0 0 8px rgba(204,120,87,0); }
    100% { box-shadow: 0 0 0 0 rgba(204,120,87,0); }
  }

  .profiler-col {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 10px;
    padding: 12px;
    overflow-y: auto;
    border-left: 1px solid #D5CFC6;
    border-right: 1px solid #D5CFC6;
    background: #F5F0E8;
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
    max-height: 70%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .config-area.config-area-survey {
    min-height: 120px;
    max-height: none;
    flex-shrink: 0;
  }

  .survey-stack-handle {
    flex-shrink: 0;
    height: 6px;
    cursor: row-resize;
    background: #d5cfc6;
    transition: background 0.15s;
  }
  .survey-stack-handle:hover { background: #cc7857; }
  .survey-stack-handle:focus-visible {
    outline: 2px solid #cc7857;
    outline-offset: -2px;
  }

  .data-area { flex: 1; overflow: hidden; display: flex; flex-direction: column; min-height: 0; }

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
