<script>
  import { INDEXES } from '../lib/surveyIndexes.js';
  import { CANDIDATE_LAYER_COLOR } from '../lib/layerUtils.js';

  const {
    onFinalize, onCancel, onLiveUpdate, onRename = null, initialAnswers, initialName,
    panel = false, active = true, onFocus = null,
    displayName = null, displayColor = null
  } = $props();

  const ALL_QUESTIONS = INDEXES.flatMap(idx =>
    idx.questions.map(q => ({ ...q, indexLabel: idx.label }))
  );

  const isEdit = initialAnswers != null;

  let currentIdx = $state(0);
  let answers = $state(initialAnswers ? { ...initialAnswers } : {});
  let namingStep = $state(false);
  let candidateName = $state(initialName ?? '');
  // Keyboard-highlighted option index when question is unanswered (not yet committed)
  let hoveredOptionIdx = $state(null);
  let nameInputEl = $state(null);
  let selectedColor = $state(displayColor ?? CANDIDATE_LAYER_COLOR);

  const total = ALL_QUESTIONS.length;
  let current = $derived(ALL_QUESTIONS[currentIdx]);
  let hasAnyAnswer = $derived(Object.keys(answers).length > 0);

  // Computed in $derived so reactivity is guaranteed even when ALL_QUESTIONS is stable
  let dotStates = $derived(
    ALL_QUESTIONS.map((q, i) => {
      const isAnswered = validOptions(q).some(o => o.value === answers[q.col]);
      const isCurrent = i === currentIdx;
      return { isCurrent, green: isAnswered || (isCurrent && hoveredOptionIdx !== null) };
    })
  );

  $effect(() => {
    if (namingStep && nameInputEl) {
      nameInputEl.focus();
      nameInputEl.select();
    }
  });

  function prev() {
    if (currentIdx > 0) { currentIdx--; hoveredOptionIdx = null; }
  }
  function next() {
    if (currentIdx < total - 1) { currentIdx++; hoveredOptionIdx = null; }
  }

  function selectAnswer(col, value) {
    const newAnswers = { ...answers, [col]: value };
    answers = newAnswers;
    hoveredOptionIdx = null;
    if (isEdit && onLiveUpdate) onLiveUpdate(newAnswers);
  }

  function clearAnswer(col) {
    const { [col]: _, ...rest } = answers;
    answers = rest;
    hoveredOptionIdx = null;
    if (isEdit && onLiveUpdate) onLiveUpdate(answers);
  }

  function moveOption(dir) {
    const opts = validOptions(current);
    if (!opts.length) return;
    // Always hover first, never commit directly — . is the universal confirm
    if (hoveredOptionIdx === null) {
      const cur = opts.findIndex(o => o.value === answers[current.col]);
      hoveredOptionIdx = cur >= 0
        ? Math.max(0, Math.min(opts.length - 1, cur + dir))
        : dir > 0 ? 0 : opts.length - 1;
    } else {
      hoveredOptionIdx = Math.max(0, Math.min(opts.length - 1, hoveredOptionIdx + dir));
    }
  }

  function lockIn() {
    const opts = validOptions(current);
    if (!opts.length) return;
    const idx = hoveredOptionIdx ?? 0;
    selectAnswer(current.col, opts[idx].value);
  }

  function finalize() {
    onFinalize(answers, candidateName.trim() || `Candidate ${Date.now()}`, selectedColor);
  }

  function saveName() {
    if (onRename) onRename(candidateName.trim() || displayName || 'Candidate', selectedColor);
    namingStep = false;
  }

  function validOptions(q) {
    return Object.entries(q.coding)
      .filter(([, v]) => v !== null)
      .map(([k]) => ({ value: k, label: q.valueLabels?.[k] ?? k }));
  }

  function handleKeydown(e) {
    if (!active || e._profilerHandled) return;
    e._profilerHandled = true;
    if (namingStep) {
      if (e.key === 'Escape') { e.preventDefault(); namingStep = false; }
      return;
    }
    if (e.key === 'ArrowLeft')       { e.preventDefault(); prev(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); moveOption(-1); }
    else if (e.key === 'ArrowDown')  { e.preventDefault(); moveOption(1); }
    else if (e.key === '/')          { e.preventDefault(); clearAnswer(current.col); }
    else if (e.key === '.')          { e.preventDefault(); lockIn(); }
    else if ((e.key === 'n' || (e.key === 'Enter' && !isEdit)) && (isEdit || hasAnyAnswer)) { e.preventDefault(); namingStep = true; }
    else if (e.key === 'Escape')     { e.preventDefault(); onCancel(); }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#snippet inner()}
  <div class="modal-header">
    <span class="modal-title">
      {#if isEdit && displayName}
        Edit <span class="cand-star" style="color:{displayColor ?? '#CC7857'}">★</span> {displayName}
      {:else if isEdit}
        Edit Candidate
      {:else}
        Candidate Profile
      {/if}
    </span>
    <div class="header-right">
      {#if !isEdit}
        <button
          class="create-btn"
          disabled={!hasAnyAnswer}
          onclick={() => namingStep = true}
        >Create Candidate <kbd class="create-kbd">↵</kbd></button>
      {/if}
      <button class="close-btn" onclick={onCancel}>✕</button>
    </div>
  </div>

  <div class="progress-bar">
    <div class="progress-fill" style="width:{((currentIdx + 1) / total) * 100}%"></div>
  </div>
  <div class="progress-label">Question {currentIdx + 1} of {total} — {current.indexLabel}</div>

  <div class="question-body">
    <div class="question-text">{current.label}</div>
    {#key current.col}
    <div class="options">
      {#each validOptions(current) as opt, i}
        <label
          class="option-label"
          class:selected={answers[current.col] === opt.value}
          class:kbd-hover={i === hoveredOptionIdx}
        >
          <input
            type="radio"
            name="q_{current.col}"
            value={opt.value}
            checked={answers[current.col] === opt.value}
            onclick={() => selectAnswer(current.col, opt.value)}
            onkeydown={e => { if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault(); }}
          >
          {opt.label}
        </label>
      {/each}
    </div>
    {/key}
    <div class="key-hint">
      {#if active}
        <span><kbd>↑↓</kbd> select</span>
        <span><kbd>.</kbd> confirm</span>
        <span><kbd>/</kbd> clear</span>
        <span><kbd>←</kbd> <kbd>→</kbd> prev/next</span>
        <span class:hint-inactive={!isEdit && !hasAnyAnswer}><kbd>n</kbd> name</span>
        <span><kbd>Esc</kbd> exit</span>
      {:else}
        <span class="click-hint">Click to activate keyboard</span>
      {/if}
    </div>
  </div>

  <div class="nav-row">
    <button class="nav-btn" onclick={prev} disabled={currentIdx === 0}>← Back</button>
    <div class="nav-dots">
      {#each dotStates as ds}
        <span class="dot" class:dot-current={ds.isCurrent} class:dot-answered={ds.green}></span>
      {/each}
    </div>
    <button class="nav-btn primary" onclick={next} disabled={currentIdx === total - 1}>Next →</button>
  </div>

  <!-- Naming bubble — floats over the question panel -->
  {#if namingStep}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="naming-overlay" onclick={() => namingStep = false}>
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="naming-bubble" onclick={e => e.stopPropagation()}>
        <div class="naming-bubble-title">{isEdit ? 'Rename candidate' : 'Name this candidate'}</div>
        <p class="naming-hint">Give this candidate a name or description to identify them.</p>
        <input
          bind:this={nameInputEl}
          class="name-input"
          type="text"
          placeholder="e.g. Quinn, Pro-tax moderate, …"
          bind:value={candidateName}
          onkeydown={e => {
            if (e.key === 'Enter') { e.preventDefault(); isEdit ? saveName() : finalize(); }
            if (e.key === 'Escape') { e.preventDefault(); namingStep = false; }
          }}
        >
        <div class="color-field">
          <span class="color-field-label">Candidate color</span>
          <div class="color-swatch-wrap" style="background:{selectedColor}" title="Click to choose color">
            <input type="color" bind:value={selectedColor} class="color-picker-input">
          </div>
        </div>
        {#if !isEdit}
          <div class="answered-count">{Object.keys(answers).length} of {total} questions answered</div>
        {/if}
        <div class="naming-bubble-btns">
          <button class="nav-btn" onclick={() => namingStep = false}>← Back</button>
          <button class="nav-btn primary" onclick={isEdit ? saveName : finalize}>
            {isEdit ? 'Save' : 'Add to plot'}
          </button>
        </div>
      </div>
    </div>
  {/if}
{/snippet}

{#if panel}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="panel" class:panel-active={active} onclick={onFocus}>
    {@render inner()}
  </div>
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="backdrop" onclick={onCancel}>
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="modal" onclick={e => e.stopPropagation()}>
      {@render inner()}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center; z-index: 200;
  }
  .modal {
    position: relative;
    background: #fff; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.25);
    width: min(500px, 94vw); display: flex; flex-direction: column; overflow: hidden;
  }
  .panel {
    position: relative;
    background: #fff; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    display: flex; flex-direction: column; overflow: hidden;
    border: 2px solid transparent; transition: border-color 0.15s;
  }
  .panel-active { border-color: #CC7857; }

  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
  }
  .modal-title { font-weight: 700; font-size: 14px; display: flex; align-items: center; gap: 5px; }
  .cand-star { font-size: 13px; line-height: 1; }
  .header-right { display: flex; align-items: center; gap: 8px; }
  .create-btn {
    padding: 4px 12px; border-radius: 5px; border: none;
    background: #CC7857; color: white; cursor: pointer; font-size: 12px; font-weight: 600;
    transition: background 0.1s;
  }
  .create-btn:hover:not(:disabled) { background: #B8634A; }
  .create-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .create-kbd {
    display: inline-block; padding: 1px 5px;
    border: 1px solid rgba(255,255,255,0.5); border-bottom-width: 2px; border-radius: 3px;
    background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.9);
    font-size: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    line-height: 1.4; vertical-align: middle; margin-left: 3px;
  }
  .close-btn { background: none; border: none; cursor: pointer; font-size: 15px; color: #6b7280; }
  .close-btn:hover { color: #111; }

  .progress-bar { height: 3px; background: #e5e7eb; flex-shrink: 0; }
  .progress-fill { height: 100%; background: #CC7857; transition: width 0.2s; }
  .progress-label { font-size: 11px; color: #9ca3af; padding: 5px 16px 0; flex-shrink: 0; }

  .question-body { padding: 18px 16px; flex: 1; overflow-y: auto; }
  .question-text { font-size: 14px; font-weight: 600; margin-bottom: 14px; line-height: 1.4; }
  .options { display: flex; flex-direction: column; gap: 8px; }
  .option-label {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px; border-radius: 6px; border: 1px solid #e5e7eb;
    cursor: pointer; font-size: 13px; transition: background 0.1s, border-color 0.1s;
  }
  .option-label:hover { background: #f9fafb; border-color: #d1d5db; }
  .option-label.selected { background: #fff7ed; border-color: #CC7857; color: #7c2d12; }
  .option-label.kbd-hover {
    background: #f0f9ff; border-color: #7dd3fc; color: #0c4a6e;
    outline: 2px solid #7dd3fc; outline-offset: -1px;
  }
  .option-label input { accent-color: #CC7857; flex-shrink: 0; }

  .key-hint {
    display: flex; flex-wrap: wrap; gap: 10px;
    margin-top: 12px; font-size: 11px; color: #9ca3af;
  }
  .key-hint kbd {
    display: inline-block; padding: 0 5px;
    border: 1px solid #d1d5db; border-bottom-width: 2px; border-radius: 3px;
    background: #f9fafb; color: #6b7280; font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; line-height: 1.5;
  }
  .hint-inactive { opacity: 0.4; }
  .click-hint { font-style: italic; color: #c4b5a0; }

  .nav-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-top: 1px solid #e5e7eb; gap: 8px; flex-shrink: 0;
  }
  .nav-dots { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; justify-content: center; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: #e5e7eb; }
  .dot-current { background: #CC7857; box-shadow: 0 0 0 2px #000; }
  .dot-answered { background: #86efac; }
  .dot-current.dot-answered { background: #86efac; box-shadow: 0 0 0 2px #000; }

  .nav-btn {
    padding: 6px 14px; border-radius: 5px; border: none;
    background: #CC7857; color: white; cursor: pointer; font-size: 13px; font-weight: 500;
    white-space: nowrap; transition: background 0.1s, opacity 0.1s;
  }
  .nav-btn:hover:not(:disabled) { background: #B8634A; }
  .nav-btn:disabled { background: #d1d5db; color: #9ca3af; cursor: not-allowed; }
  .nav-btn.primary { background: #CC7857; color: white; }
  .nav-btn.primary:hover:not(:disabled) { background: #B8634A; }

  /* Naming bubble overlay */
  .naming-overlay {
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.35);
    display: flex; align-items: center; justify-content: center;
    z-index: 10;
    border-radius: inherit;
  }
  .naming-bubble {
    background: #fff; border-radius: 10px;
    padding: 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    width: 85%;
  }
  .naming-bubble-title { font-weight: 700; font-size: 14px; margin-bottom: 10px; }
  .naming-hint { font-size: 13px; color: #6b7280; margin-bottom: 12px; line-height: 1.5; }
  .name-input {
    width: 100%; padding: 9px 12px; font-size: 14px;
    border: 1px solid #d1d5db; border-radius: 6px; outline: none; box-sizing: border-box;
  }
  .name-input:focus { border-color: #CC7857; box-shadow: 0 0 0 2px rgba(204,120,87,0.15); }
  .color-field { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
  .color-field-label { font-size: 12px; color: #6b7280; flex: 1; }
  .color-swatch-wrap {
    position: relative; width: 30px; height: 30px;
    border-radius: 6px; overflow: hidden;
    border: 2px solid rgba(0,0,0,0.12); cursor: pointer; flex-shrink: 0;
  }
  .color-picker-input {
    position: absolute; inset: 0; opacity: 0;
    width: 100%; height: 100%; cursor: pointer;
  }
  .answered-count { font-size: 11px; color: #9ca3af; margin-top: 6px; }
  .naming-bubble-btns {
    display: flex; justify-content: space-between; margin-top: 14px; gap: 8px;
  }
</style>
