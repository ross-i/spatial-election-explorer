<script>
  import { store } from '../store.svelte.js';
  import { TUTORIALS } from '../lib/tutorials.js';

  const { onExit } = $props();

  let sidebarHidden = $state(false);

  function selectTutorial(i) {
    store.activeTutorialIdx = i;
    store.activeTutorialStep = 0;
  }

  let current = $derived(TUTORIALS[store.activeTutorialIdx]);
  let currentStep = $derived(current.steps[store.activeTutorialStep]);
  let totalSteps = $derived(current.steps.length);

  let isFirstStep = $derived(store.activeTutorialStep === 0 && store.activeTutorialIdx === 0);
  let isLastStep = $derived(
    store.activeTutorialStep === totalSteps - 1 &&
    store.activeTutorialIdx === TUTORIALS.length - 1
  );

  function prev() {
    if (store.activeTutorialStep > 0) {
      store.activeTutorialStep--;
    } else if (store.activeTutorialIdx > 0) {
      store.activeTutorialIdx--;
      store.activeTutorialStep = TUTORIALS[store.activeTutorialIdx].steps.length - 1;
    }
  }

  function next() {
    if (store.activeTutorialStep < totalSteps - 1) {
      store.activeTutorialStep++;
    } else if (store.activeTutorialIdx < TUTORIALS.length - 1) {
      store.activeTutorialIdx++;
      store.activeTutorialStep = 0;
    }
  }
</script>

<div class="tutorial-panel">
  <!-- Sidebar -->
  {#if !sidebarHidden}
    <div class="tut-sidebar">
      <div class="tut-sidebar-header">Tutorials</div>
      {#each TUTORIALS as tut, i}
        <button
          class="tut-item"
          class:active={store.activeTutorialIdx === i}
          onclick={() => selectTutorial(i)}
        >
          <span class="tut-num">{i + 1}</span>
          <span class="tut-name">{tut.title}</span>
          {#if store.activeTutorialIdx === i}
            <span class="step-pip">{store.activeTutorialStep + 1}/{tut.steps.length}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Collapse toggle -->
  <button
    class="sidebar-toggle"
    class:collapsed={sidebarHidden}
    onclick={() => { sidebarHidden = !sidebarHidden; }}
    title={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
  >
    {sidebarHidden ? '›' : '‹'}
  </button>

  <!-- Content -->
  <div class="tut-content">
    <div class="tut-header">
      <div class="tut-meta">
        <span class="tut-chapter">{current.title}</span>
        <span class="tut-sep">·</span>
        <span class="tut-step-label">Step {store.activeTutorialStep + 1} of {totalSteps}</span>
      </div>
      <h2 class="tut-heading">{currentStep.heading}</h2>
      <div class="step-dots">
        {#each current.steps as _, i}
          <button
            class="step-dot"
            class:active={store.activeTutorialStep === i}
            onclick={() => { store.activeTutorialStep = i; }}
            aria-label="Go to step {i + 1}"
          ></button>
        {/each}
      </div>
    </div>

    <div class="tut-body">
      {#each currentStep.content as para}
        <p>{para}</p>
      {/each}

      {#if currentStep.electionResult}
        <div class="tut-hint reveal">
          <span class="hint-icon">★</span>
          Elected candidates appear in a darker tone on the plot to the left; others are faded.
        </div>
      {:else if currentStep.layers.length > 0}
        <div class="tut-hint">
          <span class="hint-icon">↙</span>
          The scenario is shown on the plot to the left.
        </div>
      {/if}
    </div>

    <div class="tut-nav">
      <button class="nav-btn" onclick={prev} disabled={isFirstStep}>← prev</button>
      <div class="nav-tutorial-dots">
        {#each TUTORIALS as _, i}
          <button
            class="tut-dot"
            class:active={store.activeTutorialIdx === i}
            onclick={() => selectTutorial(i)}
            aria-label="Go to tutorial {i + 1}"
          ></button>
        {/each}
      </div>
      {#if isLastStep}
        <button class="nav-btn done-btn" onclick={onExit}>done ✓</button>
      {:else}
        <button class="nav-btn next-btn" onclick={next}>next →</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .tutorial-panel {
    display: flex;
    height: 100%;
    background: #EDE8DF;
    border: 1px solid #D5CFC6;
    position: relative;
  }

  /* ── Sidebar ── */
  .tut-sidebar {
    width: 158px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid #D5CFC6;
    background: #E6E0D6;
    padding: 12px 0 8px;
  }

  .tut-sidebar-header {
    font-family: Georgia, 'Times New Roman', serif;
    font-style: italic;
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    color: #6B6560;
    text-transform: uppercase;
    padding: 0 12px 10px;
    border-bottom: 1px solid #D5CFC6;
    margin-bottom: 6px;
  }

  .tut-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px 8px 12px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font-size: 11.5px;
    color: #6B6560;
    border-left: 3px solid transparent;
    transition: background 0.1s, color 0.1s;
    width: 100%;
  }
  .tut-item:hover { background: rgba(204,120,87,0.07); color: #2D2B27; }
  .tut-item.active {
    border-left-color: #CC7857;
    color: #CC7857;
    background: rgba(204,120,87,0.1);
    font-weight: 600;
  }

  .tut-num {
    font-size: 10px;
    font-family: monospace;
    color: #9C9690;
    min-width: 12px;
    flex-shrink: 0;
  }
  .tut-item.active .tut-num { color: #CC7857; }

  .tut-name { flex: 1; }

  .step-pip {
    font-size: 9px;
    font-family: monospace;
    color: #CC7857;
    background: rgba(204,120,87,0.12);
    padding: 1px 4px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  /* ── Sidebar toggle ── */
  .sidebar-toggle {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    left: 158px;
    z-index: 10;
    width: 16px;
    height: 40px;
    background: #E6E0D6;
    border: 1px solid #D5CFC6;
    border-left: none;
    border-radius: 0 4px 4px 0;
    cursor: pointer;
    font-size: 11px;
    color: #9C9690;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: color 0.1s, background 0.1s;
  }
  .sidebar-toggle:hover { color: #CC7857; background: #EDE8DF; }
  .sidebar-toggle.collapsed { left: 0; border-left: 1px solid #D5CFC6; border-right: none; border-radius: 0 4px 4px 0; }

  /* ── Content area ── */
  .tut-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px 28px 18px;
    overflow-y: auto;
    min-width: 0;
  }

  .tut-header { margin-bottom: 16px; }

  .tut-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }

  .tut-chapter {
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #CC7857;
    font-family: Georgia, 'Times New Roman', serif;
    font-style: italic;
  }

  .tut-sep { color: #C0BAB2; font-size: 12px; }

  .tut-step-label {
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #9C9690;
  }

  .tut-heading {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.2rem;
    font-weight: normal;
    color: #2D2B27;
    line-height: 1.3;
    margin-bottom: 10px;
  }

  .step-dots { display: flex; gap: 5px; }

  .step-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #C0BAB2;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: background 0.15s;
  }
  .step-dot.active { background: #CC7857; }
  .step-dot:hover:not(.active) { background: #9C9690; }

  /* ── Body ── */
  .tut-body { flex: 1; }

  .tut-body p {
    font-size: 13px;
    line-height: 1.75;
    color: #3D3A36;
    margin-bottom: 13px;
  }

  .tut-hint {
    margin-top: 16px;
    padding: 10px 13px;
    background: rgba(204,120,87,0.07);
    border-left: 3px solid rgba(204,120,87,0.4);
    border-radius: 2px;
    font-size: 11.5px;
    color: #6B6560;
    line-height: 1.5;
    display: flex;
    gap: 7px;
    align-items: flex-start;
  }
  .tut-hint.reveal {
    background: rgba(204,120,87,0.10);
    border-left-color: #CC7857;
    color: #5A4A20;
  }

  .hint-icon { flex-shrink: 0; margin-top: 1px; }

  /* ── Navigation ── */
  .tut-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20px;
    padding-top: 14px;
    border-top: 1px solid #D5CFC6;
  }

  .nav-btn {
    padding: 5px 14px;
    border: 1px solid #C0BAB2;
    border-radius: 4px;
    background: transparent;
    color: #6B6560;
    font-size: 12px;
    cursor: pointer;
    transition: border-color 0.1s, color 0.1s, background 0.1s;
  }
  .nav-btn:hover:not(:disabled) { border-color: #CC7857; color: #CC7857; }
  .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .done-btn { border-color: #CC7857; color: #CC7857; font-weight: 600; }
  .done-btn:hover { background: rgba(204,120,87,0.08); }

  .next-btn:hover { border-color: #CC7857; color: #CC7857; }

  .nav-tutorial-dots { display: flex; gap: 5px; align-items: center; }

  .tut-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #C0BAB2;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: background 0.15s;
  }
  .tut-dot.active { background: #CC7857; }
  .tut-dot:hover:not(.active) { background: #9C9690; }
</style>
