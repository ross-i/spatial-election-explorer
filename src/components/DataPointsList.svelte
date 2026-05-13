<script>
  import { store } from '../store.svelte.js';
  import { ELECTION_METHOD_IDS, electionMethodLabel } from '../lib/electionRules.js';
  import pencilIcon from '../assets/pencil.svg';
  import eyeIcon from '../assets/eye.svg';
  import eyeOffIcon from '../assets/eye-off.svg';
  import trashIcon from '../assets/trash.svg';

  const { onGenerate, onDelete, onToggleVisibility, onStartEdit, onGenerateRandom, onOpenProfiler, onEditCandidate } = $props();
</script>

<div class="data-panel">
  <div class="panel-header">
    <span class="panel-title">Data Points</span>
    {#if store.activeTab === 'survey'}
      {@const axesReady = store.surveyXAxis && store.surveyYAxis && store.surveyXAxis !== store.surveyYAxis}
      <button class="cand-btn primary" onclick={onGenerateRandom} disabled={!axesReady} title={axesReady ? '' : 'Select both axes first'}>Random Candidate</button>
      <button class="cand-btn primary" onclick={onOpenProfiler} disabled={!axesReady} title={axesReady ? '' : 'Select both axes first'}>Profile Candidate</button>
    {/if}
  </div>

  <div class="layer-list">
    {#each store.layers as layer (layer.id)}
      <div
        class="layer-row"
        class:hidden={!layer.visible}
        class:highlighted={store.highlightedLayerId === layer.id}
        onclick={() => { store.highlightedLayerId = store.highlightedLayerId === layer.id ? null : layer.id; }}
        style="cursor: pointer;"
      >
        <span class="color-swatch" style:background={layer.color ?? (layer.type === 'candidate' ? '#C8983A' : '#3F6E6A')}></span>
        <span class="layer-label" class:editing={store.editingLayerId === layer.id} title={layer.label}>{layer.label}</span>
        {#if layer.params?.kind === 'survey_candidate'}
          <button class="icon-btn" onclick={() => onEditCandidate?.(layer.id)} title="re-answer questions">
            <img src={pencilIcon} alt="edit">
          </button>
        {:else if layer.params}
          <button
            class="icon-btn cancel-btn"
            style:display={store.editingLayerId === layer.id ? 'flex' : 'none'}
            onclick={() => { store.editingLayerId = null; store.distribution = null; }}
            title="cancel edit">✕</button>
          <button
            class="icon-btn"
            style:display={store.editingLayerId === layer.id ? 'none' : 'flex'}
            onclick={() => onStartEdit(layer.id)}
            title="edit parameters">
            <img src={pencilIcon} alt="edit">
          </button>
        {/if}
        <button class="icon-btn" onclick={() => onDelete(layer.id)} title="delete">
          <img src={trashIcon} alt="delete">
        </button>
        <button class="icon-btn" onclick={() => onToggleVisibility(layer.id)} title="toggle">
          <img src={layer.visible ? eyeIcon : eyeOffIcon} alt={layer.visible ? 'hide' : 'show'}>
        </button>
      </div>
    {/each}
  </div>

  <div class="generate-row">
    <select bind:value={store.method} class="method-select"
      onchange={() => { store.electionResult = null; }}>
      {#each ELECTION_METHOD_IDS as m}
        <option value={m}>{electionMethodLabel(m)}</option>
      {/each}
    </select>
    <input type="number" class="winners-input" min="1" bind:value={store.numWinners} title="# winners"
      oninput={() => { store.electionResult = null; }}>
    <button class="btn-generate" onclick={onGenerate} disabled={store.isGenerating}>
      {#if store.isGenerating}
        <span class="spinner"></span>running
      {:else}
        generate
      {/if}
    </button>
  </div>
</div>

<style>
  .data-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid #D5CFC6;
    border-top: none;
    background: #EDE8DF;
  }
  .panel-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 10px;
    background: #E5DFD5;
    border-bottom: 1px solid #D5CFC6;
    font-size: 13px;
    flex-shrink: 0;
  }
  .panel-title {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 0.7rem;
    font-weight: 700;
    font-style: italic;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6B6560;
  }
  .color-swatch { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
  .cand-btn {
    padding: 2px 7px; border-radius: 3px; border: 1px solid #C0BAB2;
    background: #FAF7F2; color: #2D2B27; cursor: pointer; font-size: 10px; font-weight: 500;
    white-space: nowrap;
  }
  .cand-btn:hover { background: #EDE8DF; }
  .cand-btn.primary { background: #C96442; color: #fff; border-color: #C96442; }
  .cand-btn.primary:hover:not(:disabled) { background: #A84F32; }
  .cand-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .layer-list { flex: 1; overflow-y: auto; padding: 2px 0; background: #EDE8DF; }
  .layer-row {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    gap: 4px;
    border-bottom: 1px solid #D5CFC6;
    font-size: 11px;
    transition: background 0.1s;
  }
  .layer-row:hover { background: #FAF7F2; }
  .layer-row.hidden { opacity: 0.4; }
  .layer-row.highlighted { background: #F5EDE6; border-left: 3px solid #C96442; padding-left: 5px; }
  .layer-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: 'Menlo', 'Consolas', monospace;
    font-size: 11px;
    color: #6B6560;
  }
  .layer-label.editing { color: #C96442; font-weight: 600; }
  .cancel-btn { font-size: 11px; color: #C96442; font-weight: 700; padding: 2px 5px; }
  .icon-btn {
    border: none;
    background: none;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 3px;
    line-height: 1;
    display: flex;
    align-items: center;
    transition: background 0.1s;
  }
  .icon-btn:hover { background: #D5CFC6; }
  .icon-btn img { display: block; opacity: 0.45; }
  .icon-btn:hover img { opacity: 0.75; }
  .generate-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-top: 1px solid #D5CFC6;
    background: #EDE8DF;
    flex-shrink: 0;
  }
  .method-select {
    flex: 1; font-size: 12px; padding: 3px 4px;
    border: 1px solid #C0BAB2; border-radius: 3px;
    background: #FAF7F2; color: #2D2B27;
  }
  .winners-input {
    width: 44px; font-size: 12px; padding: 3px 4px;
    border: 1px solid #C0BAB2; border-radius: 3px;
    background: #FAF7F2; color: #2D2B27;
  }
  .btn-generate {
    padding: 5px 14px;
    border: none;
    border-radius: 4px;
    background: #C96442;
    color: #fff;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: background 0.1s;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .btn-generate:hover:not(:disabled) { background: #A84F32; }
  .btn-generate:disabled { background: #A88472; cursor: not-allowed; display: flex; align-items: center; gap: 5px; }
  .spinner {
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
