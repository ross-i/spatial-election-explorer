<script>
  import { INDEXES } from '../lib/surveyIndexes.js';

  const { onFinalize, onCancel, onLiveUpdate, initialAnswers, initialName } = $props();

  const ALL_QUESTIONS = INDEXES.flatMap(idx =>
    idx.questions.map(q => ({ ...q, indexLabel: idx.label }))
  );

  const isEdit = initialAnswers != null;

  let currentIdx = $state(0);
  let answers = $state(initialAnswers ? { ...initialAnswers } : {});
  let namingStep = $state(false);
  let candidateName = $state(initialName ?? '');

  const total = ALL_QUESTIONS.length;
  let current = $derived(ALL_QUESTIONS[currentIdx]);
  let hasAnyAnswer = $derived(Object.keys(answers).length > 0);

  function prev() { if (currentIdx > 0) currentIdx--; }
  function next() { if (currentIdx < total - 1) currentIdx++; }

  function selectAnswer(col, value) {
    const newAnswers = { ...answers, [col]: value };
    answers = newAnswers;
    if (isEdit && onLiveUpdate) onLiveUpdate(newAnswers);
  }

  function finalize() {
    onFinalize(answers, candidateName.trim() || `Candidate ${Date.now()}`);
  }

  function validOptions(q) {
    return Object.entries(q.coding)
      .filter(([, v]) => v !== null)
      .map(([k]) => ({ value: k, label: q.valueLabels?.[k] ?? k }));
  }
</script>

<svelte:window onkeydown={e => {
  if (namingStep) return;
  if (e.key === 'ArrowLeft') prev();
  if (e.key === 'ArrowRight') next();
}} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="backdrop" onclick={onCancel}>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal" onclick={e => e.stopPropagation()}>

    {#if !namingStep}
      <div class="modal-header">
        <span class="modal-title">{isEdit ? 'Edit Candidate' : 'Candidate Profile'}</span>
        <div class="header-right">
          {#if !isEdit}
            <button
              class="create-btn"
              disabled={!hasAnyAnswer}
              onclick={() => namingStep = true}
            >Create Candidate</button>
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
        <div class="options">
          {#each validOptions(current) as opt}
            <label class="option-label" class:selected={answers[current.col] === opt.value}>
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
        {#if answers[current.col] == null}
          <div class="skip-note">You can leave this blank and move on.</div>
        {/if}
      </div>

      <div class="nav-row">
        <button class="nav-btn" onclick={prev} disabled={currentIdx === 0}>← Back</button>
        <div class="nav-dots">
          {#each ALL_QUESTIONS as _, i}
            <span class="dot {i === currentIdx ? 'dot-active' : ''} {answers[ALL_QUESTIONS[i].col] != null && i !== currentIdx ? 'dot-answered' : ''}"></span>
          {/each}
        </div>
        <button class="nav-btn primary" onclick={next} disabled={currentIdx === total - 1}>Next →</button>
      </div>

    {:else}
      <div class="modal-header">
        <span class="modal-title">Name this candidate</span>
        <div class="header-right">
          <button class="close-btn" onclick={onCancel} title="exit without saving">✕</button>
        </div>
      </div>
      <div class="naming-body">
        <p class="naming-hint">Give this candidate a name or short description to identify them in the data list.</p>
        <input
          class="name-input"
          type="text"
          placeholder="e.g. Quinn, Pro-tax moderate, …"
          bind:value={candidateName}
          onkeydown={e => { if (e.key === 'Enter') finalize(); }}
        >
        <div class="answered-count">{Object.keys(answers).length} of {total} questions answered</div>
      </div>
      <div class="nav-row">
        <button class="nav-btn" onclick={() => namingStep = false}>← Back to questions</button>
        <button class="nav-btn primary" onclick={finalize}>Add candidate to plot</button>
      </div>
    {/if}

  </div>
</div>

<style>
  .backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center; z-index: 200;
  }
  .modal {
    background: #fff; border-radius: 10px; box-shadow: 0 10px 40px rgba(0,0,0,0.25);
    width: min(500px, 94vw); display: flex; flex-direction: column; overflow: hidden;
  }
  .modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
  }
  .modal-title { font-weight: 700; font-size: 14px; }
  .header-right { display: flex; align-items: center; gap: 8px; }
  .create-btn {
    padding: 4px 12px; border-radius: 5px; border: none;
    background: #C96442; color: white; cursor: pointer; font-size: 12px; font-weight: 600;
    transition: background 0.1s;
  }
  .create-btn:hover:not(:disabled) { background: #a84f32; }
  .create-btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .close-btn { background: none; border: none; cursor: pointer; font-size: 15px; color: #6b7280; }
  .close-btn:hover { color: #111; }

  .progress-bar { height: 3px; background: #e5e7eb; }
  .progress-fill { height: 100%; background: #C96442; transition: width 0.2s; }
  .progress-label { font-size: 11px; color: #9ca3af; padding: 5px 16px 0; }

  .question-body { padding: 18px 16px; flex: 1; }
  .question-text { font-size: 14px; font-weight: 600; margin-bottom: 14px; line-height: 1.4; }
  .options { display: flex; flex-direction: column; gap: 8px; }
  .option-label {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 12px; border-radius: 6px; border: 1px solid #e5e7eb;
    cursor: pointer; font-size: 13px; transition: background 0.1s, border-color 0.1s;
  }
  .option-label:hover { background: #f9fafb; border-color: #d1d5db; }
  .option-label.selected { background: #fff7ed; border-color: #C96442; color: #7c2d12; }
  .option-label input { accent-color: #C96442; flex-shrink: 0; }
  .skip-note { font-size: 11px; color: #9ca3af; margin-top: 10px; }

  .nav-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; border-top: 1px solid #e5e7eb; gap: 8px; flex-shrink: 0;
  }
  .nav-dots { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; justify-content: center; }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: #e5e7eb; }
  .dot-active { background: #C96442; }
  .dot-answered { background: #86efac; }

  .nav-btn {
    padding: 6px 14px; border-radius: 5px; border: none;
    background: #C96442; color: white; cursor: pointer; font-size: 13px; font-weight: 500;
    white-space: nowrap; transition: background 0.1s, opacity 0.1s;
  }
  .nav-btn:hover:not(:disabled) { background: #a84f32; }
  .nav-btn:disabled { background: #d1d5db; color: #9ca3af; cursor: not-allowed; }
  .nav-btn.primary { background: #C96442; color: white; }
  .nav-btn.primary:hover:not(:disabled) { background: #a84f32; }

  .naming-body { padding: 20px 16px; }
  .naming-hint { font-size: 13px; color: #6b7280; margin-bottom: 14px; line-height: 1.5; }
  .name-input {
    width: 100%; padding: 9px 12px; font-size: 14px;
    border: 1px solid #d1d5db; border-radius: 6px; outline: none;
  }
  .name-input:focus { border-color: #C96442; box-shadow: 0 0 0 2px rgba(201,100,66,0.15); }
  .answered-count { font-size: 11px; color: #9ca3af; margin-top: 8px; }
</style>
