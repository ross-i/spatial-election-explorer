<script>
  import { store } from "../store.svelte.js";
  import {
    electionMethodsForNumWinners,
    coerceElectionMethod,
  } from "../lib/electionRules.js";
  import {
    VOTER_LAYER_COLOR,
    CANDIDATE_LAYER_COLOR,
  } from "../lib/layerUtils.js";
  import pencilIcon from "../assets/pencil.svg";
  import eyeIcon from "../assets/eye.svg";
  import eyeOffIcon from "../assets/eye-off.svg";
  import trashIcon from "../assets/trash.svg";

  const {
    onGenerate,
    onDelete,
    onToggleVisibility,
    onStartEdit,
    onGenerateRandom,
    onOpenProfiler,
    onEditCandidate,
  } = $props();

  /** 5-point star path in viewBox 0 0 20 20 (matches plot star proportions). */
  function starPathD(cx = 10, cy = 10, r = 6.5) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.4;
      pts.push([cx + rad * Math.cos(angle), cy + rad * Math.sin(angle)]);
    }
    return "M" + pts.map((p) => p.join(",")).join("L") + "Z";
  }

  let methodOptions = $derived(electionMethodsForNumWinners(store.numWinners));

  $effect(() => {
    const coerced = coerceElectionMethod(store.numWinners, store.method);
    if (coerced !== store.method) {
      store.method = coerced;
      store.electionResult = null;
    }
  });
</script>

<div class="data-panel">
  <div class="panel-header">
    <span class="panel-title">Data Points</span>
    {#if store.activeTab === "survey"}
      {@const axesReady =
        store.surveyXAxis &&
        store.surveyYAxis &&
        store.surveyXAxis !== store.surveyYAxis}
      <span class="cand-btn-group" data-walkthrough="survey-candidate-btns">
        <button
          class="cand-btn primary"
          onclick={onGenerateRandom}
          disabled={!axesReady}
          title={axesReady ? "" : "Select both axes first"}
          >Random Candidate</button
        >
        <button
          class="cand-btn primary"
          onclick={onOpenProfiler}
          disabled={!axesReady}
          title={axesReady ? "" : "Select both axes first"}
          >Profile Candidate</button
        >
      </span>
    {/if}
  </div>

  <div class="layer-list">
    {#each store.layers as layer (layer.id)}
      <div
        class="layer-row"
        class:hidden={!layer.visible}
        class:highlighted={store.highlightedLayerId === layer.id}
        onclick={() => {
          store.highlightedLayerId =
            store.highlightedLayerId === layer.id ? null : layer.id;
        }}
        style="cursor: pointer;"
      >
        <span class="layer-marker" aria-hidden="true">
          {#if layer.type === "voter"}
            <span class="color-swatch" style:background={VOTER_LAYER_COLOR}
            ></span>
          {:else}
            {@const cfill = layer.color ?? CANDIDATE_LAYER_COLOR}
            <svg class="cand-star" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d={starPathD(10, 10, 7.2)}
                fill={cfill}
                stroke="#2D2B27"
                stroke-opacity="0.22"
                stroke-width="0.45"
              />
            </svg>
          {/if}
        </span>
        <span
          class="layer-label"
          class:editing={store.editingLayerId === layer.id}
          title={layer.label}>{layer.label}</span
        >
        {#if layer.params?.kind === "survey_candidate"}
          <button
            class="icon-btn"
            onclick={() => onEditCandidate?.(layer.id)}
            title="re-answer questions"
          >
            <img src={pencilIcon} alt="edit" />
          </button>
        {:else if layer.params}
          <button
            class="icon-btn cancel-btn"
            style:display={store.editingLayerId === layer.id ? "flex" : "none"}
            onclick={() => {
              store.editingLayerId = null;
              store.distribution = null;
            }}
            title="cancel edit">✕</button
          >
          <button
            class="icon-btn"
            style:display={store.editingLayerId === layer.id ? "none" : "flex"}
            onclick={() => onStartEdit(layer.id)}
            title="edit parameters"
          >
            <img src={pencilIcon} alt="edit" />
          </button>
        {/if}
        <button
          class="icon-btn"
          onclick={() => onDelete(layer.id)}
          title="delete"
        >
          <img src={trashIcon} alt="delete" />
        </button>
        <button
          class="icon-btn"
          onclick={() => onToggleVisibility(layer.id)}
          title="toggle"
        >
          <img
            src={layer.visible ? eyeIcon : eyeOffIcon}
            alt={layer.visible ? "hide" : "show"}
          />
        </button>
      </div>
    {/each}
  </div>

  <div class="generate-row" data-walkthrough="run-election-row">
    <select
      bind:value={store.method}
      class="method-select"
      onchange={() => {
        store.electionResult = null;
      }}
    >
      {#each methodOptions as opt (opt.id)}
        <option value={opt.id}>{opt.label}</option>
      {/each}
    </select>
    <input
      type="number"
      class="winners-input"
      min="1"
      bind:value={store.numWinners}
      title="# winners"
      oninput={() => {
        store.electionResult = null;
      }}
    />
    <button
      class="btn-generate"
      onclick={onGenerate}
      disabled={store.isGenerating}
    >
      {#if store.isGenerating}
        <span class="spinner"></span>running
      {:else}
        run election
      {/if}
    </button>
  </div>
</div>

<style>
  .data-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid #d5cfc6;
    border-top: none;
    background: #ede8df;
  }
  .panel-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 10px;
    background: #e5dfd5;
    border-bottom: 1px solid #d5cfc6;
    font-size: 13px;
    flex-shrink: 0;
  }
  .panel-title {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 0.7rem;
    font-weight: 700;
    font-style: italic;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6b6560;
  }
  .layer-marker {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .color-swatch {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .cand-star {
    width: 20px;
    height: 20px;
    display: block;
    flex-shrink: 0;
  }
  .cand-btn-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .cand-btn {
    padding: 2px 7px;
    border-radius: 3px;
    border: 1px solid #c0bab2;
    background: #faf7f2;
    color: #2d2b27;
    cursor: pointer;
    font-size: 10px;
    font-weight: 500;
    white-space: nowrap;
  }
  .cand-btn:hover {
    background: #ede8df;
  }
  .cand-btn.primary {
    background: #cc7857;
    color: #fff;
    border-color: #cc7857;
  }
  .cand-btn.primary:hover:not(:disabled) {
    background: #b8634a;
  }
  .cand-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  .layer-list {
    flex: 1;
    overflow-y: auto;
    padding: 2px 0;
    background: #ede8df;
  }
  .layer-row {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    gap: 4px;
    border-bottom: 1px solid #d5cfc6;
    font-size: 11px;
    transition: background 0.1s;
  }
  .layer-row:hover {
    background: #faf7f2;
  }
  .layer-row.hidden {
    opacity: 0.4;
  }
  .layer-row.highlighted {
    background: #f5ede6;
    border-left: 3px solid #cc7857;
    padding-left: 5px;
  }
  .layer-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: "Menlo", "Consolas", monospace;
    font-size: 11px;
    color: #6b6560;
  }
  .layer-label.editing {
    color: #cc7857;
    font-weight: 600;
  }
  .cancel-btn {
    font-size: 11px;
    color: #cc7857;
    font-weight: 700;
    padding: 2px 5px;
  }
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
  .icon-btn:hover {
    background: #d5cfc6;
  }
  .icon-btn img {
    display: block;
    opacity: 0.45;
  }
  .icon-btn:hover img {
    opacity: 0.75;
  }
  .generate-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-top: 1px solid #d5cfc6;
    background: #ede8df;
    flex-shrink: 0;
  }
  .method-select {
    flex: 1;
    font-size: 12px;
    padding: 3px 4px;
    border: 1px solid #c0bab2;
    border-radius: 3px;
    background: #faf7f2;
    color: #2d2b27;
  }
  .winners-input {
    width: 44px;
    font-size: 12px;
    padding: 3px 4px;
    border: 1px solid #c0bab2;
    border-radius: 3px;
    background: #faf7f2;
    color: #2d2b27;
  }
  .btn-generate {
    padding: 5px 14px;
    border: none;
    border-radius: 4px;
    background: #cc7857;
    color: #fff;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    transition: background 0.1s;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .btn-generate:hover:not(:disabled) {
    background: #b8634a;
  }
  .btn-generate:disabled {
    background: #c5a89e;
    cursor: not-allowed;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .spinner {
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
