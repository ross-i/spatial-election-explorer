<script>
  import { store } from '../store.svelte.js';
  import SyntheticTab from './tabs/SyntheticTab.svelte';
  import SurveyTab from './tabs/SurveyTab.svelte';

  const { onAddData, onSelectCenter, onSwitchTab } = $props();
</script>

<div class="config-panel">
  <div class="tabs">
    {#each ['synthetic', 'survey'] as tab}
      <button
        class="tab-btn"
        class:active={store.activeTab === tab}
        data-walkthrough={tab === 'survey' ? 'survey-tab-btn' : null}
        onclick={() => onSwitchTab(tab)}>
        {tab.charAt(0).toUpperCase() + tab.slice(1)}
      </button>
    {/each}
  </div>

  <div class="tab-body">
    {#if store.activeTab === 'synthetic'}
      <SyntheticTab {onSelectCenter} />
    {:else if store.activeTab === 'survey'}
      <SurveyTab />
    {/if}
  </div>

  <div class="add-row">
    <button
      class="btn-cancel"
      style:display={store.editingLayerId ? 'inline-block' : 'none'}
      onclick={() => { store.editingLayerId = null; store.distribution = null; }}>
      cancel
    </button>
    {#if store.activeTab !== 'survey' || store.editingLayerId}
      <button
        class="btn-add"
        onclick={onAddData}
      >
        {store.editingLayerId ? 'update' : 'add data'}
      </button>
    {/if}
  </div>
</div>

<style>
  .config-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid #D5CFC6;
    background: #EDE8DF;
  }
  .tabs { display: flex; border-bottom: 1px solid #D5CFC6; background: #E5DFD5; }
  .tab-btn {
    flex: 1;
    padding: 8px 4px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.05em;
    color: #6B6560;
    transition: color 0.1s, border-color 0.1s;
  }
  .tab-btn:hover { color: #2D2B27; }
  .tab-btn.active {
    background: #EDE8DF;
    font-weight: 700;
    color: #CC7857;
    border-bottom: 2px solid #CC7857;
  }
  .tab-body { flex: 1; padding: 14px 12px; overflow-y: auto; }
  .add-row {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-top: 1px solid #D5CFC6;
    background: #EDE8DF;
  }
  .btn-add {
    padding: 5px 16px;
    border: none;
    border-radius: 4px;
    background: #CC7857;
    color: #fff;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: background 0.1s;
  }
  .btn-add:hover:not(:disabled) { background: #B8634A; }
  .btn-add:disabled { opacity: 0.35; cursor: not-allowed; }
  .btn-cancel {
    padding: 5px 14px;
    border: 1px solid #2D2B27;
    border-radius: 4px;
    background: transparent;
    color: #2D2B27;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    transition: background 0.1s;
  }
  .btn-cancel:hover { background: rgba(45,43,39,0.07); }
</style>
