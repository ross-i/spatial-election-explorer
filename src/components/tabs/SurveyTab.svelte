<script>
  import { store } from '../../store.svelte.js';

  const IDEOLOGIES = ['Ideology 1', 'Ideology 2', 'Ideology 3', 'Ideology 4', 'Ideology 5', 'Ideology 6'];

  function toggleIdeology(i) {
    const idx = store.selectedIdeologies.indexOf(i);
    if (idx === -1) store.selectedIdeologies = [...store.selectedIdeologies, i];
    else store.selectedIdeologies = store.selectedIdeologies.filter(x => x !== i);
  }
</script>

<div class="tab-content">
  <div class="field-group">
    <div class="field-label">Ideology</div>
    <div class="ideology-grid">
      {#each IDEOLOGIES as name, i}
        <label class="check-label">
          <input type="checkbox"
            checked={store.selectedIdeologies.includes(i)}
            onchange={() => toggleIdeology(i)}>
          {name}
        </label>
      {/each}
    </div>
  </div>

  <div class="field-group">
    <div class="field-label">Count</div>
    <input type="number" class="count-input" min="1" max="10000" bind:value={store.surveyCount}>
  </div>

  <label class="check-label party-check">
    <input type="checkbox" bind:checked={store.indicateParty}>
    Indicate Party Affiliation
  </label>
</div>

<style>
  .tab-content { display: flex; flex-direction: column; gap: 12px; }
  .field-group { display: flex; flex-direction: column; gap: 4px; }
  .field-label { font-weight: bold; font-size: 13px; }
  .ideology-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
  .check-label { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
  .count-input { width: 80px; padding: 2px 4px; border: 1px solid #ccc; font-size: 13px; }
  .party-check { margin-top: 4px; }
</style>
