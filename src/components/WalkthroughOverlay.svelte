<script>
  import { store } from '../store.svelte.js';
  import { TUTORIALS } from '../lib/tutorials.js';
  import { onMount } from 'svelte';

  const { onExit } = $props();

  const CARD_W = 380;
  const CARD_H_EST = 240;
  const GAP = 16;
  const MARGIN = 12;

  let current = $derived(TUTORIALS[store.activeTutorialIdx]);
  let step = $derived(current?.steps[store.activeTutorialStep] ?? null);
  let totalSteps = $derived(current?.steps.length ?? 0);

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

  let highlightedEl = null;
  let targetRect = $state(null);
  let cardTop = $state(null);
  let cardLeft = $state(null);

  function clearHighlight() {
    if (highlightedEl) {
      highlightedEl.classList.remove('walkthrough-highlight');
      highlightedEl = null;
    }
    targetRect = null;
    cardTop = null;
    cardLeft = null;
  }

  function recompute() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!highlightedEl) {
      targetRect = null;
      cardTop = vh - CARD_H_EST - 24;
      cardLeft = (vw - CARD_W) / 2;
      return;
    }
    const r = highlightedEl.getBoundingClientRect();
    targetRect = { top: r.top, left: r.left, width: r.width, height: r.height };

    const spaceRight = vw - (r.left + r.width);
    const spaceLeft = r.left;
    const spaceBelow = vh - (r.top + r.height);
    const spaceAbove = r.top;

    let top, left;
    if (spaceRight >= CARD_W + GAP + MARGIN) {
      left = r.left + r.width + GAP;
      top = Math.max(MARGIN, Math.min(vh - CARD_H_EST - MARGIN, r.top + r.height / 2 - CARD_H_EST / 2));
    } else if (spaceLeft >= CARD_W + GAP + MARGIN) {
      left = r.left - CARD_W - GAP;
      top = Math.max(MARGIN, Math.min(vh - CARD_H_EST - MARGIN, r.top + r.height / 2 - CARD_H_EST / 2));
    } else if (spaceBelow >= CARD_H_EST + GAP + MARGIN) {
      top = r.top + r.height + GAP;
      left = Math.max(MARGIN, Math.min(vw - CARD_W - MARGIN, r.left + r.width / 2 - CARD_W / 2));
    } else if (spaceAbove >= CARD_H_EST + GAP + MARGIN) {
      top = r.top - CARD_H_EST - GAP;
      left = Math.max(MARGIN, Math.min(vw - CARD_W - MARGIN, r.left + r.width / 2 - CARD_W / 2));
    } else {
      top = vh - CARD_H_EST - MARGIN;
      left = vw - CARD_W - MARGIN;
    }
    cardTop = top;
    cardLeft = left;
  }

  onMount(() => {
    recompute();
    const onChange = () => recompute();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  });

  $effect(() => {
    void step;
    clearHighlight();
    if (step?.prep) {
      try { step.prep(store); } catch {}
    }
    if (step?.target) {
      requestAnimationFrame(() => {
        const el = document.querySelector(step.target);
        if (el) {
          el.classList.add('walkthrough-highlight');
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          highlightedEl = el;
          requestAnimationFrame(recompute);
        } else {
          recompute();
        }
      });
    } else {
      recompute();
    }
    return clearHighlight;
  });

  // Dim rectangles around target (or full-screen when no target)
  let dimRects = $derived.by(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
    if (!targetRect) {
      return [{ top: 0, left: 0, width: vw, height: vh }];
    }
    const t = targetRect;
    const pad = 10;
    const tx = Math.max(0, t.left - pad);
    const ty = Math.max(0, t.top - pad);
    const tw = Math.min(vw, t.left + t.width + pad) - tx;
    const th = Math.min(vh, t.top + t.height + pad) - ty;
    return [
      { top: 0, left: 0, width: vw, height: ty },
      { top: ty + th, left: 0, width: vw, height: Math.max(0, vh - (ty + th)) },
      { top: ty, left: 0, width: tx, height: th },
      { top: ty, left: tx + tw, width: Math.max(0, vw - (tx + tw)), height: th },
    ];
  });
</script>

{#if step}
  {#each dimRects as r}
    <div class="wt-dim" style="top:{r.top}px; left:{r.left}px; width:{r.width}px; height:{r.height}px;"></div>
  {/each}

  {#if cardTop !== null && cardLeft !== null}
    <div class="walkthrough-card" style="top:{cardTop}px; left:{cardLeft}px; width:{CARD_W}px;">
      <div class="wt-meta">
        <span class="wt-chapter">{current.title}</span>
        <span class="wt-sep">·</span>
        <span class="wt-step-label">Step {store.activeTutorialStep + 1} of {totalSteps}</span>
      </div>
      <h3 class="wt-heading">{step.heading}</h3>
      <div class="wt-body">
        {#each step.content as para}
          <p>{para}</p>
        {/each}
      </div>
      <div class="wt-nav">
        <button class="wt-btn" onclick={prev} disabled={isFirstStep}>← prev</button>
        <button class="wt-btn wt-exit" onclick={onExit}>exit tutorial</button>
        {#if isLastStep}
          <button class="wt-btn wt-done" onclick={onExit}>done ✓</button>
        {:else}
          <button class="wt-btn wt-next" onclick={next}>next →</button>
        {/if}
      </div>
    </div>
  {/if}
{/if}

<style>
  .wt-dim {
    position: fixed;
    background: rgba(15, 12, 10, 0.45);
    z-index: 999;
    pointer-events: auto;
  }
  .walkthrough-card {
    position: fixed;
    background: #FAF7F2;
    border: 1px solid #C0BAB2;
    border-left: 4px solid #C96442;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
    padding: 14px 18px 12px;
    z-index: 1001;
  }
  .wt-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .wt-chapter {
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #C96442;
    font-family: Georgia, 'Times New Roman', serif;
    font-style: italic;
  }
  .wt-sep { color: #C0BAB2; font-size: 12px; }
  .wt-step-label {
    font-size: 0.65rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #9C9690;
  }
  .wt-heading {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.05rem;
    font-weight: normal;
    color: #2D2B27;
    margin: 0 0 6px;
  }
  .wt-body p {
    font-size: 12.5px;
    line-height: 1.55;
    color: #3D3A36;
    margin: 0 0 6px;
  }
  .wt-nav {
    display: flex;
    gap: 8px;
    margin-top: 8px;
    justify-content: flex-end;
    align-items: center;
  }
  .wt-btn {
    padding: 4px 12px;
    border: 1px solid #C0BAB2;
    border-radius: 4px;
    background: transparent;
    color: #6B6560;
    font-size: 12px;
    cursor: pointer;
  }
  .wt-btn:hover:not(:disabled) { border-color: #C96442; color: #C96442; }
  .wt-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .wt-exit { margin-right: auto; }
  .wt-done, .wt-next { border-color: #C96442; color: #C96442; font-weight: 600; }
  .wt-done:hover, .wt-next:hover { background: rgba(201,100,66,0.08); }
</style>
