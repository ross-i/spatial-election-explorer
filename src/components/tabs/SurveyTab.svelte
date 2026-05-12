<script>
  import { store } from '../../store.svelte.js';
  import { INDEXES, defaultRankings } from '../../lib/surveyIndexes.js';

  if (!store.surveyRankings) {
    store.surveyRankings = defaultRankings();
  }

  if (!store.surveyData) {
    fetch('/survey_data.json')
      .then(r => r.json())
      .then(d => { store.surveyData = d; });
  }

  let xOpen = $state(false);
  let yOpen = $state(false);

  let xAxis = $derived(store.surveyXAxis);
  let yAxis = $derived(store.surveyYAxis);

  function setAxis(axis, id) {
    if (axis === 'x') {
      if (id === store.surveyYAxis) store.surveyYAxis = store.surveyXAxis;
      store.surveyXAxis = id;
      xOpen = true;
    } else {
      if (id === store.surveyXAxis) store.surveyXAxis = store.surveyYAxis;
      store.surveyYAxis = id;
      yOpen = true;
      xOpen = false;
    }
  }

  let dragging = $state(null);

  function onDragStart(indexId, col) { dragging = { indexId, col }; }

  function onDrop(indexId, targetCol) {
    if (!dragging || dragging.indexId !== indexId || dragging.col === targetCol) return;
    const order = [...store.surveyRankings[indexId]];
    const from = order.indexOf(dragging.col);
    const to   = order.indexOf(targetCol);
    order.splice(from, 1);
    order.splice(to, 0, dragging.col);
    store.surveyRankings = { ...store.surveyRankings, [indexId]: order };
    dragging = null;
  }

  function onDragOver(e) { e.preventDefault(); }

  function resetRankings(indexId) {
    store.surveyRankings = { ...store.surveyRankings, [indexId]: defaultRankings()[indexId] };
  }

  function rankLabel(i, total) {
    const w = (total - i) / ((total * (total + 1)) / 2);
    return Math.round(w * 100) + '%';
  }

  function indexById(id) {
    return INDEXES.find(i => i.id === id);
  }
</script>

<div class="tab-content">

  <!-- Survey source selector -->
  <div class="survey-header">
    <span class="survey-bold">Survey</span>
    <select class="survey-select">
      <option>Fall 2014 Statewide IL Poll</option>
    </select>
  </div>
  {#if store.surveyData}
    <div class="data-note">{store.surveyData.length} respondents loaded</div>
  {:else}
    <div class="data-note loading">Loading survey data…</div>
  {/if}

  <!-- X axis -->
  <div class="axis-section">
    <div class="axis-row">
      <span class="axis-tag x-tag">X</span>
      <div class="axis-pills">
        {#each INDEXES as idx}
          <button
            class="pill {xAxis === idx.id ? 'active-x' : ''} {yAxis === idx.id ? 'faded' : ''}"
            onclick={() => { if (yAxis !== idx.id) setAxis('x', idx.id); }}
          >{idx.label}</button>
        {/each}
      </div>
      {#if xAxis}
        <button class="collapse-btn" onclick={() => xOpen = !xOpen}>
          {xOpen ? '▲' : '▼'}
        </button>
      {/if}
    </div>

    {#if xOpen && xAxis}
      {@const idx = indexById(xAxis)}
      {@const rankings = store.surveyRankings?.[idx.id] ?? idx.questions.map(q => q.col)}
      <div class="rank-panel">
        <div class="direction-hint">0 ← {idx.lowLabel} &nbsp;...&nbsp; {idx.highLabel} → 1</div>
        <div class="rank-hint">drag to re-rank — top = most important to voters</div>
        <ul class="rank-list">
          {#each rankings as col, i}
            {@const q = idx.questions.find(q => q.col === col)}
            <li
              class="rank-item {dragging?.col === col ? 'dragging' : ''}"
              draggable="true"
              ondragstart={() => onDragStart(idx.id, col)}
              ondragover={onDragOver}
              ondrop={() => onDrop(idx.id, col)}
            >
              <span class="rank-num">{i + 1}</span>
              <span class="rank-q">{q?.label ?? col}</span>
              <span class="rank-weight">{rankLabel(i, rankings.length)}</span>
            </li>
          {/each}
        </ul>
        <button class="reset-btn" onclick={() => resetRankings(idx.id)}>reset order</button>
      </div>
    {:else if !xAxis}
      <div class="placeholder">Choose an index for the x-axis to rank question importance.</div>
    {/if}
  </div>

  <!-- Y axis -->
  <div class="axis-section">
    <div class="axis-row">
      <span class="axis-tag y-tag">Y</span>
      <div class="axis-pills">
        {#each INDEXES as idx}
          <button
            class="pill {yAxis === idx.id ? 'active-y' : ''} {xAxis === idx.id ? 'faded' : ''}"
            onclick={() => { if (xAxis !== idx.id) setAxis('y', idx.id); }}
          >{idx.label}</button>
        {/each}
      </div>
      {#if yAxis}
        <button class="collapse-btn" onclick={() => yOpen = !yOpen}>
          {yOpen ? '▲' : '▼'}
        </button>
      {/if}
    </div>

    {#if yOpen && yAxis}
      {@const idx = indexById(yAxis)}
      {@const rankings = store.surveyRankings?.[idx.id] ?? idx.questions.map(q => q.col)}
      <div class="rank-panel">
        <div class="direction-hint">0 ← {idx.lowLabel} &nbsp;...&nbsp; {idx.highLabel} → 1</div>
        <div class="rank-hint">drag to re-rank — top = most important to voters</div>
        <ul class="rank-list">
          {#each rankings as col, i}
            {@const q = idx.questions.find(q => q.col === col)}
            <li
              class="rank-item {dragging?.col === col ? 'dragging' : ''}"
              draggable="true"
              ondragstart={() => onDragStart(idx.id, col)}
              ondragover={onDragOver}
              ondrop={() => onDrop(idx.id, col)}
            >
              <span class="rank-num">{i + 1}</span>
              <span class="rank-q">{q?.label ?? col}</span>
              <span class="rank-weight">{rankLabel(i, rankings.length)}</span>
            </li>
          {/each}
        </ul>
        <button class="reset-btn" onclick={() => resetRankings(idx.id)}>reset order</button>
      </div>
    {:else if !yAxis}
      <div class="placeholder">Choose an index for the y-axis to rank question importance.</div>
    {/if}
  </div>

  {#if xAxis && yAxis && xAxis === yAxis}
    <div class="warn">X and Y must be different indexes.</div>
  {/if}

</div>

<style>
  .tab-content { display: flex; flex-direction: column; gap: 12px; }

  .survey-header { display: flex; align-items: center; gap: 8px; }
  .survey-bold { font-weight: 700; font-size: 13px; }
  .survey-select {
    font-size: 12px; padding: 2px 6px; border: 1px solid #C0BAB2;
    border-radius: 3px; background: #FAF7F2; color: #2D2B27; cursor: pointer;
  }

  .data-note { font-size: 11px; color: #6b7280; }
  .data-note.loading { color: #9ca3af; font-style: italic; }

  .axis-section {
    border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;
  }

  .axis-row {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 10px; background: #f9fafb;
  }
  .axis-tag {
    font-size: 11px; font-weight: bold; width: 18px; height: 18px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 3px; flex-shrink: 0;
  }
  .x-tag { background: #C96442; color: white; }
  .y-tag { background: #C96442; color: white; }

  .axis-pills { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; }
  .pill {
    font-size: 12px; padding: 2px 8px; border-radius: 12px;
    border: 1px solid #ccc; background: white; cursor: pointer;
    transition: opacity 0.1s;
  }
  .pill:hover { border-color: #888; }
  .active-x { background: #C96442; color: white; border-color: #C96442; }
  .active-y { background: #C96442; color: white; border-color: #C96442; }
  .pill.faded { background: #e5e7eb; color: #9ca3af; border-color: #d1d5db; cursor: not-allowed; pointer-events: none; }

  .collapse-btn {
    background: none; border: none; cursor: pointer;
    font-size: 10px; color: #9ca3af; padding: 0 2px; flex-shrink: 0;
  }
  .collapse-btn:hover { color: #6b7280; }

  .rank-panel { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }
  .placeholder {
    padding: 10px; font-size: 12px; color: #9ca3af;
    font-style: italic; text-align: center;
  }

  .direction-hint { font-size: 10px; color: #9ca3af; font-style: italic; }
  .rank-hint { font-size: 11px; color: #6b7280; }

  .rank-list { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
  .rank-item {
    display: flex; align-items: center; gap: 8px;
    background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px;
    padding: 4px 8px; cursor: grab; font-size: 12px; user-select: none;
  }
  .rank-item:active { cursor: grabbing; }
  .rank-item.dragging { opacity: 0.4; }
  .rank-num { font-weight: bold; color: #6b7280; width: 14px; flex-shrink: 0; }
  .rank-q { flex: 1; }
  .rank-weight { font-size: 11px; color: #9ca3af; flex-shrink: 0; }

  .reset-btn {
    font-size: 11px; color: #6b7280; background: none; border: none;
    cursor: pointer; padding: 0; text-decoration: underline; align-self: flex-end;
  }
  .reset-btn:hover { color: #111; }

  .warn { font-size: 12px; color: #dc2626; }
</style>
