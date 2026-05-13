<script>
  import { store } from '../../store.svelte.js';

  let fileInput;

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        store.uploadedFile = { name: file.name, data };
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }

  let summary = $derived.by(() => {
    const raw = store.uploadedFile?.data;
    if (!raw) return null;
    let voterPts = 0, candidatePts = 0, layerCount = 0;
    if (raw && Array.isArray(raw.layers)) {
      for (const l of raw.layers) {
        const n = Array.isArray(l.points) ? l.points.length : 0;
        if (l.type === 'voter') { voterPts += n; layerCount++; }
        else if (l.type === 'candidate') { candidatePts += n; layerCount++; }
      }
      return { format: 'structured', layerCount, voterPts, candidatePts };
    }
    if (Array.isArray(raw)) {
      for (const p of raw) {
        if (p?.type === 'voter') voterPts++;
        else if (p?.type === 'candidate') candidatePts++;
      }
      return { format: 'legacy', layerCount: 0, voterPts, candidatePts };
    }
    return { format: 'unknown', layerCount: 0, voterPts: 0, candidatePts: 0 };
  });
</script>

<div class="tab-content">
  <div class="field-group">
    <div class="field-label">Data Upload</div>
    <div class="upload-row">
      <button class="btn-sm" onclick={() => fileInput.click()}>upload</button>
      {#if store.uploadedFile}
        <span class="filename">{store.uploadedFile.name}</span>
        <button
          class="clear-btn"
          title="Clear uploaded file"
          aria-label="Clear uploaded file"
          onclick={() => { store.uploadedFile = null; if (fileInput) fileInput.value = ''; }}
        >✕</button>
      {/if}
    </div>
    <input bind:this={fileInput} type="file" accept=".json" style="display:none" onchange={handleFileChange}>
    {#if summary}
      {#if summary.format === 'unknown'}
        <div class="summary warn">Unrecognized JSON shape — expected an array of points or an export object with a "layers" field.</div>
      {:else if summary.voterPts + summary.candidatePts === 0}
        <div class="summary warn">No voter or candidate points found in this file.</div>
      {:else}
        <div class="summary">
          {#if summary.format === 'structured'}{summary.layerCount} layer{summary.layerCount === 1 ? '' : 's'} —{/if}
          {summary.voterPts} voter{summary.voterPts === 1 ? '' : 's'},
          {summary.candidatePts} candidate{summary.candidatePts === 1 ? '' : 's'}
          {#if summary.format === 'legacy'} <span class="hint">(legacy flat format)</span>{/if}
        </div>
      {/if}
    {/if}
  </div>
  <div class="format-note">
    Accepts files saved with <strong>export</strong> (preserves layers, colors, and candidate profiles), or a legacy flat array of <code>{`{ x, y, type }`}</code> points.
  </div>
</div>

<style>
  .tab-content { display: flex; flex-direction: column; gap: 12px; }
  .field-group { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-weight: bold; font-size: 13px; }
  .upload-row { display: flex; align-items: center; gap: 10px; }
  .filename { font-size: 13px; color: #333; }
  .btn-sm { padding: 2px 8px; border: 1px solid #888; background: #f5f5f5; cursor: pointer; font-size: 12px; }
  .btn-sm:hover { background: #e0e0e0; }
  .clear-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 18px; height: 18px; padding: 0; margin-left: 2px;
    border: none; background: transparent; cursor: pointer;
    font-size: 12px; line-height: 1; color: #9ca3af; border-radius: 50%;
    transition: background 0.1s, color 0.1s;
  }
  .clear-btn:hover { background: rgba(201,100,66,0.12); color: #C96442; }
  .summary { font-size: 12px; color: #2D2B27; }
  .summary.warn { color: #b91c1c; }
  .summary .hint { color: #9ca3af; font-style: italic; }
  .format-note { font-size: 11px; color: #6b7280; line-height: 1.4; }
  .format-note code { font-family: monospace; background: #EDE8DF; padding: 0 4px; border-radius: 3px; }
</style>
