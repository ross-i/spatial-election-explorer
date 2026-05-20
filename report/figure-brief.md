# SEE — Introductory Figure Brief (for `/report`)

## Where it goes
Likely Figure 1 of the report, referenced from `1-intro.tex` (after "the Spatial Election Explorer (SEE)…") and/or as the opener of `3-design.tex`. Replaces or supersedes the current `report/img.png`.

## Audience
The three audiences enumerated in `1-intro.tex`: comp-soc-choice researchers, students learning social choice, and policymakers evaluating ranked-choice rules. Figure must read for all three with a single caption.

## What the figure must convey
A reader who has only seen the abstract should be able to look at this figure and understand:
1. **The plane is a 2D issue/ideology space.** Axes are unitless [0,1]; position encodes preference.
2. **Voters (blue dots) and candidates (orange stars)** coexist on it. *(Note: section 3.2 currently says "yellow stars" — the UI uses orange. Either update the prose or recolor; flag this to the author.)*
3. **Points can be placed manually, sampled from a distribution, drawn from survey data, or imported** — the sidebar tabs (Synthetic / Survey) and top-bar buttons (`+voter`, `+candidate`, `import`) show all four entry points from §3.2.
4. **A voting rule and number of winners are chosen**, and **run election** produces winners on the same plane.

## Source image
Use the attached screenshot as the base. It already shows the Gaussian σ=0.10 case with 200 voters and 10 candidates centered at (0.5, 0.5), SNTV, 2 winners — a clean, legible state.

## Annotations to add (callouts with leader lines)
Keep callouts minimal and academic — sans-serif labels, thin leaders, no decorative shapes.

- **A. Plot / issue space** → "2D issue space; each axis is a political or ideological dimension."
- **B. Voter point (one of the blue dots)** → "Voter (n=200)"
- **C. Candidate point (one of the orange stars)** → "Candidate (n=10)"
- **D. Dashed rings** → "Gaussian sampling distribution (σ shown as concentric 1σ/2σ/3σ contours)."
- **E. Top bar** → "Manual placement, tutorial, import/export."
- **F. Sidebar: Synthetic / Survey tabs** → "Switch between synthetic distributions and survey-grounded data (§3.2, §3.5)."
- **G. Data Points panel** → "Each manual point or sampled distribution is a stackable, editable layer (§3.3)."
- **H. Voting Method + # Winners + run election** → "Choose voting rule (Plurality / Borda / IRV / Bloc Plurality / STV / SNTV) and run; winners are highlighted on the plot."

Use letter labels (A–H) on the figure and expand them in the caption, or use short inline labels — author's preference. Letter labels keep the figure visually quieter, which suits a report.

## What *not* to do
- No "after-election" winner halos or Voronoi shading — the figure should show the **input/setup state**, not a result. Results are better as separate figures in later sections (e.g., the Plurality spoiler example from the tutorial).
- No redesign of the UI. This is a faithful annotated screenshot.
- No marketing language in the caption. Caption should be one sentence + one sentence: *what the user sees* and *what it lets them do.*

## Suggested caption
> **Figure 1.** The Spatial Election Explorer interface. Voters (blue) and candidates (orange) are embedded in a 2D issue space (left); the sidebar (right) lets the user place points manually, sample from synthetic distributions, load survey-grounded data, manage stacked data layers, and run an election under a chosen voting rule.

## Production notes
- Target width: `\textwidth` (single-column) or `\linewidth` if two-column.
- Export the screenshot at 2× device pixels so labels remain crisp; place the annotation layer in SVG/Inkscape so leader lines and text scale cleanly in the PDF.
- Match label font to the report body font (likely Computer Modern or whichever `report.tex` uses) for visual consistency.

## One issue to flag
`3-design.tex:41` describes candidates as **yellow** stars; the UI renders them **orange**. Reconcile before the figure ships.
