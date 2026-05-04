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
</script>

<div class="tab-content">
  <div class="field-group">
    <div class="field-label">Data Upload</div>
    <div class="upload-row">
      <button class="btn-sm" onclick={() => fileInput.click()}>upload</button>
      {#if store.uploadedFile}
        <span class="filename">{store.uploadedFile.name}</span>
      {/if}
    </div>
    <input bind:this={fileInput} type="file" accept=".json" style="display:none" onchange={handleFileChange}>
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
</style>
