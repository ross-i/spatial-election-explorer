<script>
  import { store } from '../../store.svelte.js';

  const { onSelectCenter } = $props();

  const DISTRIBUTIONS = [
    { value: 'gaussian', label: 'Gaussian' },
    { value: 'uniform_rectangle', label: 'Uniform Rect' },
    { value: 'uniform_disc', label: 'Uniform Disc' },
  ];

  function toggleDist(val) {
    store.distribution = store.distribution === val ? null : val;
  }

  let countError = $derived.by(() => {
    const n = Number(store.count);
    if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return 'Count must be a positive integer.';
    return null;
  });

  let stdDevError = $derived.by(() => {
    const v = Number(store.stdDev);
    if (!Number.isFinite(v) || v < 0) return 'Standard deviation must be ≥ 0.';
    return null;
  });

  let discRadiusError = $derived.by(() => {
    const v = Number(store.discRadius);
    if (!Number.isFinite(v) || v < 0) return 'Radius must be ≥ 0.';
    return null;
  });

  let rectWidthError = $derived.by(() => {
    const v = Number(store.rectWidth);
    if (!Number.isFinite(v) || v < 0) return 'Width must be ≥ 0.';
    return null;
  });

  let rectHeightError = $derived.by(() => {
    const v = Number(store.rectHeight);
    if (!Number.isFinite(v) || v < 0) return 'Height must be ≥ 0.';
    return null;
  });

  let centerXWarning = $derived.by(() => {
    const v = Number(store.centerX);
    if (!Number.isFinite(v) || v < 0 || v > 1) return 'X is outside [0, 1] — points may fall off the plot.';
    return null;
  });

  let centerYWarning = $derived.by(() => {
    const v = Number(store.centerY);
    if (!Number.isFinite(v) || v < 0 || v > 1) return 'Y is outside [0, 1] — points may fall off the plot.';
    return null;
  });
</script>

<div class="tab-content">
  <div class="field-group">
    <div class="field-label">Distribution</div>
    <div class="dist-row">
      {#each DISTRIBUTIONS as d}
        <button
          class="dist-btn"
          class:active={store.distribution === d.value}
          onclick={() => toggleDist(d.value)}>
          {d.label}
        </button>
      {/each}
    </div>
  </div>

  {#if store.distribution !== null}
    <div class="field-group">
      <div class="field-label">Center</div>
      <div class="center-row">
        <span class="paren">(</span>
        <input type="number" class="coord-input" step="0.01" min="0" max="1"
          bind:value={store.centerX} placeholder="x">
        <span class="paren">,</span>
        <input type="number" class="coord-input" step="0.01" min="0" max="1"
          bind:value={store.centerY} placeholder="y">
        <span class="paren">)</span>
        <button class="btn-sm" onclick={onSelectCenter}>select</button>
      </div>
      {#if centerXWarning}<span class="warn-msg">⚠ {centerXWarning}</span>{/if}
      {#if centerYWarning}<span class="warn-msg">⚠ {centerYWarning}</span>{/if}
    </div>

    {#if store.distribution === 'gaussian'}
      <div class="field-group">
        <div class="field-label">Standard Deviation</div>
        <div class="slider-row">
          <span class="range-label">0</span>
          <input type="range" min="0" max="0.5" step="0.01" bind:value={store.stdDev}>
          <span class="range-label">0.5</span>
          <input type="number" class="num-input" class:input-error={stdDevError} step="0.01" min="0" max="0.5"
            bind:value={store.stdDev}>
        </div>
        {#if stdDevError}<span class="error-msg">{stdDevError}</span>{/if}
      </div>
    {/if}

    {#if store.distribution === 'uniform_rectangle'}
      <div class="field-group">
        <div class="field-label">Width</div>
        <div class="slider-row">
          <span class="range-label">0</span>
          <input type="range" min="0" max="1" step="0.01" bind:value={store.rectWidth}>
          <span class="range-label">1</span>
          <input type="number" class="num-input" class:input-error={rectWidthError} step="0.01" min="0" max="1"
            bind:value={store.rectWidth}>
        </div>
        {#if rectWidthError}<span class="error-msg">{rectWidthError}</span>{/if}
      </div>
      <div class="field-group">
        <div class="field-label">Height</div>
        <div class="slider-row">
          <span class="range-label">0</span>
          <input type="range" min="0" max="1" step="0.01" bind:value={store.rectHeight}>
          <span class="range-label">1</span>
          <input type="number" class="num-input" class:input-error={rectHeightError} step="0.01" min="0" max="1"
            bind:value={store.rectHeight}>
        </div>
        {#if rectHeightError}<span class="error-msg">{rectHeightError}</span>{/if}
      </div>
    {/if}

    {#if store.distribution === 'uniform_disc'}
      <div class="field-group">
        <div class="field-label">Radius</div>
        <div class="slider-row">
          <span class="range-label">0</span>
          <input type="range" min="0" max="0.5" step="0.01" bind:value={store.discRadius}>
          <span class="range-label">0.5</span>
          <input type="number" class="num-input" class:input-error={discRadiusError} step="0.01" min="0" max="0.5"
            bind:value={store.discRadius}>
        </div>
        {#if discRadiusError}<span class="error-msg">{discRadiusError}</span>{/if}
      </div>
    {/if}

    <div class="field-group">
      <div class="field-label">Type</div>
      <div class="radio-row">
        <label><input type="radio" bind:group={store.pointType} value="voter"> Voter</label>
        <label><input type="radio" bind:group={store.pointType} value="candidate"> Candidate</label>
      </div>
    </div>

    <div class="field-group">
      <div class="field-label">Count</div>
      <input type="number" class="count-input" class:input-error={countError} min="1" max="10000" bind:value={store.count}>
      {#if countError}<span class="error-msg">{countError}</span>{/if}
    </div>
  {/if}
</div>

<style>
  .tab-content { display: flex; flex-direction: column; gap: 14px; }
  .field-group { display: flex; flex-direction: column; gap: 5px; }
  .field-label {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 0.7rem;
    font-weight: 600;
    font-style: italic;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6B6560;
  }
  .dist-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .dist-btn {
    padding: 4px 10px;
    border: 1px solid #C0BAB2;
    border-radius: 12px;
    background: #FAF7F2;
    cursor: pointer;
    font-size: 12px;
    color: #2D2B27;
    transition: background 0.1s, border-color 0.1s;
  }
  .dist-btn:hover { background: #EDE8DF; border-color: #9C9690; }
  .dist-btn.active {
    background: #CC7857;
    border-color: #CC7857;
    color: #fff;
    font-weight: 600;
  }
  .radio-row { display: flex; gap: 16px; flex-wrap: wrap; }
  .radio-row label { display: flex; align-items: center; gap: 4px; font-size: 13px; cursor: pointer; color: #2D2B27; }
  .center-row { display: flex; align-items: center; gap: 4px; }
  .paren { font-size: 13px; color: #9C9690; }
  .coord-input {
    width: 60px; padding: 3px 5px;
    border: 1px solid #C0BAB2; border-radius: 3px;
    background: #FAF7F2; font-size: 13px; color: #2D2B27;
    transition: border-color 0.1s;
  }
  .coord-input:focus { outline: none; border-color: #CC7857; }
  .slider-row { display: flex; align-items: center; gap: 6px; }
  .slider-row input[type=range] { flex: 1; accent-color: #CC7857; }
  .range-label { font-size: 11px; color: #9C9690; min-width: 12px; }
  .num-input {
    width: 52px; padding: 3px 5px;
    border: 1px solid #C0BAB2; border-radius: 3px;
    background: #FAF7F2; font-size: 13px; color: #2D2B27;
    transition: border-color 0.1s;
  }
  .num-input:focus { outline: none; border-color: #CC7857; }
  .count-input {
    width: 80px; padding: 3px 5px;
    border: 1px solid #C0BAB2; border-radius: 3px;
    background: #FAF7F2; font-size: 13px; color: #2D2B27;
    transition: border-color 0.1s;
  }
  .count-input:focus { outline: none; border-color: #CC7857; }
  .btn-sm {
    padding: 3px 10px;
    border: 1px solid #2D2B27;
    border-radius: 3px;
    background: transparent;
    cursor: pointer;
    font-size: 12px;
    color: #2D2B27;
    transition: background 0.1s;
  }
  .btn-sm:hover { background: rgba(45,43,39,0.07); }
  .error-msg { color: #CC7857; font-size: 11px; }
  .input-error { border-color: #CC7857 !important; outline: none; }
  .warn-msg { color: #A07030; font-size: 11px; }
</style>
