<script>
  import { store } from '../store.svelte.js';
  import { TUTORIALS } from '../lib/tutorials.js';
  import { onMount } from 'svelte';

  const { onExit, onGenerateRandomCandidate, onAddData } = $props();

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
    // Some steps backfill random candidates so the next step has data to work
    // with. Only top up to the target — manually-added candidates count.
    const target = step?.addRandomCandidatesOnNext;
    if (target && onGenerateRandomCandidate) {
      const have = store.layers.filter((l) => l.type === 'candidate').length;
      for (let i = have; i < target; i++) onGenerateRandomCandidate();
    }

    // Some steps add the configured layer for the user when they click "next"
    // — but only if they haven't already produced it themselves (advanceWhen
    // already satisfied means a manual add / auto-advance, so skip to avoid
    // duplicating).
    if (step?.addDataOnNext && onAddData) {
      const alreadyDone = (() => {
        try { return step.advanceWhen ? !!step.advanceWhen(store) : false; }
        catch { return false; }
      })();
      if (!alreadyDone) onAddData();
    }
    if (store.activeTutorialStep < totalSteps - 1) {
      store.activeTutorialStep++;
    } else if (store.activeTutorialIdx < TUTORIALS.length - 1) {
      store.activeTutorialIdx++;
      store.activeTutorialStep = 0;
    }
  }

  function selectTutorial(i) {
    store.activeTutorialIdx = i;
    store.activeTutorialStep = 0;
  }

  let highlightedEl = null;       // primary target — drives card placement
  let extraEls = [];              // extra highlighted regions (e.g. the plot)
  let targetRect = $state(null);  // primary rect (card placement)
  let holeRects = $state([]);     // every un-dimmed rect (primary + extras)
  let cardTop = $state(null);
  let cardLeft = $state(null);
  let vw = $state(typeof window !== 'undefined' ? window.innerWidth : 0);
  let vh = $state(typeof window !== 'undefined' ? window.innerHeight : 0);

  function clearHighlight() {
    if (highlightedEl) {
      highlightedEl.classList.remove('walkthrough-highlight');
      highlightedEl = null;
    }
    for (const el of extraEls) el?.classList.remove('walkthrough-highlight');
    extraEls = [];
    targetRect = null;
    holeRects = [];
    cardTop = null;
    cardLeft = null;
  }

  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }

  function recompute() {
    vw = window.innerWidth;
    vh = window.innerHeight;

    // Every highlighted element stays un-dimmed and interactive.
    const rects = [];
    if (highlightedEl) rects.push(rectOf(highlightedEl));
    for (const el of extraEls) if (el) rects.push(rectOf(el));
    holeRects = rects;

    if (!highlightedEl) {
      targetRect = null;
      cardTop = vh - CARD_H_EST - 24;
      cardLeft = (vw - CARD_W) / 2;
      return;
    }
    const r = highlightedEl.getBoundingClientRect();
    targetRect = { top: r.top, left: r.left, width: r.width, height: r.height };

    // If the target lives inside the side panel, treat the panel's edges as
    // the reference for left/right placement so the card doesn't overlap it.
    const panel = highlightedEl.closest('.right-panel');
    const pr = panel ? panel.getBoundingClientRect() : null;
    const refRight = pr ? pr.right : r.left + r.width;
    const refLeft = pr ? pr.left : r.left;

    const spaceRight = vw - refRight;
    const spaceLeft = refLeft;
    const spaceBelow = vh - (r.top + r.height);
    const spaceAbove = r.top;

    let top, left;
    if (spaceRight >= CARD_W + GAP + MARGIN) {
      left = refRight + GAP;
      top = Math.max(MARGIN, Math.min(vh - CARD_H_EST - MARGIN, r.top + r.height / 2 - CARD_H_EST / 2));
    } else if (spaceLeft >= CARD_W + GAP + MARGIN) {
      left = refLeft - CARD_W - GAP;
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

  let prevStep = null;
  $effect(() => {
    void step;
    clearHighlight();
    // Skip prep on initial mount so re-entering the walkthrough doesn't wipe
    // restored tutorial state — UNLESS we land on step 0, which is meant to
    // reset the tutorial canvas every time the user arrives at it.
    const isFirstStep = store.activeTutorialStep === 0;
    if (step?.prep && (prevStep !== null || isFirstStep)) {
      try { step.prep(store); } catch {}
    }
    prevStep = step;
    if (step?.target || step?.extraTargets) {
      requestAnimationFrame(() => {
        if (step?.target) {
          const el = document.querySelector(step.target);
          if (el) {
            el.classList.add('walkthrough-highlight');
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            highlightedEl = el;
          }
        }
        if (step?.extraTargets) {
          extraEls = step.extraTargets
            .map((sel) => document.querySelector(sel))
            .filter(Boolean);
          for (const ex of extraEls) ex.classList.add('walkthrough-highlight');
        }
        requestAnimationFrame(recompute);
      });
    } else {
      recompute();
    }
    return clearHighlight;
  });

  // Auto-advance when the step's advanceWhen(store) flips to true while we're
  // on that step. We only "arm" once the condition is currently false, so a
  // step entered with its condition already satisfied (prep, or data added on
  // an earlier visit, or arriving via prev) does NOT snap forward — letting
  // the user read it and navigate back freely.
  let advanceStep = null;   // which step object the arm state belongs to
  let advanceArmed = false;
  $effect(() => {
    const s = step;
    // Re-arm on every step change, even steps without advanceWhen, so the
    // arm state never leaks across navigation.
    if (advanceStep !== s) {
      advanceStep = s;
      advanceArmed = false;
    }
    if (!s?.advanceWhen) return;
    const ready = (() => { try { return !!s.advanceWhen(store); } catch { return false; } })();
    if (!advanceArmed) {
      if (!ready) advanceArmed = true; // arm only once the condition is unmet
      return;
    }
    if (ready) next();
  });

  const HOLE_PAD = 10;
</script>

{#if step}
  <svg class="wt-dim-svg" style="width:{vw}px; height:{vh}px;">
    <defs>
      <mask id="wt-dim-mask">
        <rect x="0" y="0" width={vw} height={vh} fill="white" />
        {#each holeRects as h}
          <rect
            x={Math.max(0, h.left - HOLE_PAD)}
            y={Math.max(0, h.top - HOLE_PAD)}
            width={h.width + HOLE_PAD * 2}
            height={h.height + HOLE_PAD * 2}
            rx="6"
            fill="black" />
        {/each}
      </mask>
    </defs>
    <rect
      class="wt-dim-fill"
      x="0" y="0" width={vw} height={vh}
      fill="rgba(15,12,10,0.45)"
      mask="url(#wt-dim-mask)" />
  </svg>

  {#if cardTop !== null && cardLeft !== null}
    <div class="walkthrough-card" style="top:{cardTop}px; left:{cardLeft}px; width:{CARD_W}px;">
      <div class="wt-meta">
        <select
          class="wt-jump"
          aria-label="Jump to tutorial"
          value={store.activeTutorialIdx}
          onchange={(e) => selectTutorial(Number(e.currentTarget.value))}
        >
          {#each TUTORIALS as t, i}
            <option value={i}>{t.title}</option>
          {/each}
        </select>
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
  .wt-dim-svg {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 999;
    pointer-events: none;
  }
  /* Re-enable hit-testing only where the dim is actually painted, so the
     un-dimmed holes (target + plot) pass clicks through to the app. */
  .wt-dim-fill { pointer-events: visiblePainted; }
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
  .wt-jump {
    font-size: 0.65rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #C96442;
    font-family: Georgia, 'Times New Roman', serif;
    font-style: italic;
    background-color: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    margin-left: -5px;
    padding: 1px 17px 1px 5px;
    max-width: 230px;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='5' viewBox='0 0 8 5'><path d='M0 0l4 5 4-5z' fill='%23C96442'/></svg>");
    background-repeat: no-repeat;
    background-position: right 5px center;
    background-size: 7px;
    transition: background-color 0.1s, border-color 0.1s;
  }
  .wt-jump:hover { background-color: #F1ECE4; border-color: #C0BAB2; }
  .wt-jump:focus { outline: none; border-color: #C96442; }
  /* Dropdown items use the browser's normal (readable) styling */
  .wt-jump option {
    color: #2D2B27;
    font-family: sans-serif;
    font-style: normal;
    text-transform: none;
    letter-spacing: normal;
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
