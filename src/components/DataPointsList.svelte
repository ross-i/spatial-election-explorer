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
    onCancel,
    onDelete,
    onToggleVisibility,
    onStartEdit,
    onGenerateRandom,
    onOpenProfiler,
    onEditCandidate,
    onRePlotSurvey,
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

  function toggleHighlight(id) {
    store.highlightedLayerId = store.highlightedLayerId === id ? null : id;
  }

  let methodOptions = $derived(electionMethodsForNumWinners(store.numWinners));

  $effect(() => {
    const coerced = coerceElectionMethod(store.numWinners, store.method);
    if (coerced !== store.method) {
      store.method = coerced;
      store.electionResult = null;
    }
  });

  let voterLayers = $derived(store.layers.filter(l => l.type === 'voter'));
  let candidateLayers = $derived(store.layers.filter(l => l.type !== 'voter'));

  let showRePlot = $derived(store.surveyWasDeleted && !store.layers.some(l => l.params?.kind === 'survey'));

  let pencilToast = $state(false);
  let pencilToastTimer = null;
  function showPencilToast(e) {
    e.stopPropagation();
    pencilToast = true;
    clearTimeout(pencilToastTimer);
    pencilToastTimer = setTimeout(() => { pencilToast = false; }, 5000);
  }

</script>

<div class="data-panel">
  <!-- Voter layer rows sit above the CANDIDATE DATA header — survey tab only -->
  {#if store.activeTab === 'survey'}
  {#if showRePlot}
    <div class="voter-list">
      <button class="replot-btn" onclick={onRePlotSurvey}>Re-plot survey respondents</button>
    </div>
  {:else if voterLayers.length > 0}
    <div class="voter-list">
      {#each voterLayers as layer (layer.id)}
        <div
          class="layer-row"
          class:hidden={!layer.visible}
          class:highlighted={store.highlightedLayerId === layer.id}
          role="button"
          tabindex="0"
          aria-pressed={store.highlightedLayerId === layer.id}
          aria-label={`Highlight ${layer.label}`}
          onclick={() => toggleHighlight(layer.id)}
          onkeydown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleHighlight(layer.id);
            }
          }}
          style="cursor: pointer;"
        >
          <span class="layer-marker" aria-hidden="true">
            <span class="color-swatch" style:background={VOTER_LAYER_COLOR}></span>
          </span>
          <span class="layer-label" title={layer.label}>{layer.label}</span>
          {#if layer.params}
            <span class="pencil-wrap">
              <span
                class="icon-btn pencil-disabled"
                onclick={showPencilToast}
              >
                <span class="no-icon-wrap">
                  <img src={pencilIcon} alt="edit" />
                  <svg class="no-symbol" viewBox="0 0 16 16" aria-hidden="true">
                    <circle cx="8" cy="8" r="6.5" fill="none" stroke="#cc4444" stroke-width="1.8"/>
                    <line x1="3.5" y1="12.5" x2="12.5" y2="3.5" stroke="#cc4444" stroke-width="1.8"/>
                  </svg>
                </span>
              </span>
              <div class="pencil-tooltip" class:visible={pencilToast}>
                Edit the distribution of survey respondents on the plot by changing the X and Y axis topics and re-ranking questions above.
              </div>
            </span>
          {/if}
          <button class="icon-btn" onclick={() => onDelete(layer.id)} title="delete">
            <img src={trashIcon} alt="delete" />
          </button>
          <button class="icon-btn" onclick={() => onToggleVisibility(layer.id)} title="toggle">
            <img src={layer.visible ? eyeIcon : eyeOffIcon} alt={layer.visible ? "hide" : "show"} />
          </button>
        </div>
      {/each}
    </div>
  {/if}
  {/if}

  <div class="panel-header">
    <span class="panel-title">{store.activeTab === 'survey' ? 'Candidate Data' : 'Data Points'}</span>
  </div>

  {#if store.activeTab === "survey"}
    {@const axesReady =
      store.surveyXAxis &&
      store.surveyYAxis &&
      store.surveyXAxis !== store.surveyYAxis}
    <div class="survey-gen-section" data-walkthrough="survey-candidate-btns">
      <button
        class="survey-gen-btn"
        data-walkthrough="random-candidate-btn"
        onclick={onGenerateRandom}
        disabled={!axesReady}
        title={axesReady ? "" : "Select both axes first"}
      >+ Random candidate (randomized responses)</button>
      <button
        class="survey-gen-btn"
        data-walkthrough="profile-candidate-btn"
        onclick={onOpenProfiler}
        disabled={!axesReady}
        title={axesReady ? "" : "Select both axes first"}
      >+ Profile candidate (answer questions)</button>
    </div>
  {/if}

  <div class="layer-list" data-walkthrough="candidate-list">
    {#each (store.activeTab === 'survey' ? candidateLayers : store.layers) as layer (layer.id)}
      <div
        class="layer-row"
        class:hidden={!layer.visible}
        class:highlighted={store.highlightedLayerId === layer.id}
        role="button"
        tabindex="0"
        aria-pressed={store.highlightedLayerId === layer.id}
        aria-label={`Highlight ${layer.label}`}
        onclick={() => toggleHighlight(layer.id)}
        onkeydown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleHighlight(layer.id);
          }
        }}
        style="cursor: pointer;"
      >
        <span class="layer-marker" aria-hidden="true">
          {#if layer.type === 'voter'}
            <span class="color-swatch" style:background={VOTER_LAYER_COLOR}></span>
          {:else}
            <svg class="cand-star" viewBox="0 0 20 20" aria-hidden="true">
              <path
                d={starPathD(10, 10, 7.2)}
                fill={layer.color ?? CANDIDATE_LAYER_COLOR}
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
        {#if layer.params?.kind === "survey_candidate" && layer.points.some(p => p._profile)}
          <button
            class="icon-btn"
            onclick={() => onEditCandidate?.(layer.id)}
            title="re-answer questions"
          >
            <img src={pencilIcon} alt="edit" />
          </button>
        {:else if layer.params && layer.params.kind !== 'survey_candidate'}
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
    <div class="control-field method-field">
      <label class="control-label" for="method-select">Voting method</label>
      <select
        id="method-select"
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
    </div>
    <div class="control-field winners-field">
      <label class="control-label" for="winners-input"># Winners</label>
      <input
        id="winners-input"
        type="number"
        class="winners-input"
        min="1"
        bind:value={store.numWinners}
        oninput={() => {
          store.electionResult = null;
        }}
      />
    </div>
    <button
      class="btn-generate"
      class:cleared={(!!store.electionResult || store.isGenerating)}
      onclick={() => {
        if (store.isGenerating) {
          onCancel?.();
        } else if (store.electionResult) {
          store.electionResult = null;
        } else {
          onGenerate();
        }
      }}
    >
      {#if store.isGenerating}
        <span class="spinner"></span>interrupt
      {:else if store.electionResult}
        clear results
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
  .survey-gen-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    flex-shrink: 0;
  }
  .survey-gen-btn {
    width: 100%;
    padding: 5px 8px;
    text-align: center;
    border: none;
    border-radius: 20px;
    background: #cc7857;
    color: #fff;
    font-size: 12px;
    font-weight: 400;
    line-height: 1.4;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.1s;
  }
  .survey-gen-btn:hover:not(:disabled) { background: #b8634a; }
  .survey-gen-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .section-divider {
    margin: 0;
    border: none;
    border-top: 1px solid #d5cfc6;
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
  .voter-list {
    padding: 2px 0;
    background: #ede8df;
    flex-shrink: 0;
  }
  .replot-btn {
    display: block;
    width: calc(100% - 20px);
    margin: 8px 10px;
    padding: 6px 10px;
    background: #f5ede6;
    border: 1px dashed #cc7857;
    border-radius: 4px;
    color: #cc7857;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
    transition: background 0.1s;
  }
  .replot-btn:hover {
    background: #ede4dc;
  }
  .pencil-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .pencil-disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .no-icon-wrap {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .no-symbol {
    position: absolute;
    width: 9px;
    height: 9px;
    pointer-events: none;
  }
  .pencil-tooltip {
    display: none;
    position: absolute;
    top: calc(100% + 5px);
    right: 0;
    width: 200px;
    padding: 6px 8px;
    background: #2d2b27;
    color: #faf7f2;
    font-size: 10px;
    line-height: 1.45;
    border-radius: 4px;
    pointer-events: none;
    z-index: 10;
    white-space: normal;
  }
  .pencil-tooltip.visible,
  .pencil-wrap:hover .pencil-tooltip {
    display: block;
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
    align-items: flex-end;
    gap: 6px;
    padding: 8px 10px;
    border-top: 1px solid #d5cfc6;
    background: #ede8df;
    flex-shrink: 0;
  }
  .control-field {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .method-field {
    flex: 1;
    min-width: 0;
  }
  .control-label {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 0.6rem;
    font-weight: 600;
    font-style: italic;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6b6560;
    white-space: nowrap;
  }
  .method-select {
    width: 100%;
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
  .btn-generate.cleared {
    background: transparent;
    color: #6b6560;
    border: 1px solid #c0bab2;
  }
  .btn-generate.cleared:hover:not(:disabled) {
    background: #ede8df;
    color: #2d2b27;
    border-color: #6b6560;
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
  .btn-generate.cleared .spinner {
    border: 2px solid rgba(107, 101, 96, 0.3);
    border-top-color: #6b6560;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
