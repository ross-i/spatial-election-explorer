<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  const { layers, electionResult, showVoters, showCandidates, interactive, onPlotClick, centerPreview, highlightedLayerId, onCenterMove } = $props();

  let svgEl;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };

  // Suppresses draw() during an active drag so elements aren't destroyed mid-gesture
  let isDragging = false;

  // Refs to elements updated in-place during drag (populated by draw())
  let dragRefs = null;

  function starPath(cx, cy, r) {
    const points = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.4;
      points.push([cx + rad * Math.cos(angle), cy + rad * Math.sin(angle)]);
    }
    return 'M' + points.map(p => p.join(',')).join('L') + 'Z';
  }

  function draw() {
    if (isDragging || !svgEl) return;

    dragRefs = null;

    const svgNode = d3.select(svgEl);
    const totalW = svgEl.clientWidth || 600;
    const totalH = svgEl.clientHeight || 600;
    const availW = totalW - margin.left - margin.right;
    const availH = totalH - margin.top - margin.bottom;
    const size = Math.min(availW, availH);
    const offsetX = margin.left + (availW - size) / 2;
    const offsetY = margin.top + (availH - size) / 2;

    svgNode.selectAll('*').remove();

    const g = svgNode.append('g').attr('transform', `translate(${offsetX},${offsetY})`);

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, size]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([size, 0]);

    const styleAxis = ax => {
      ax.selectAll('line,path').attr('stroke', '#D5CFC6');
      ax.selectAll('text').attr('fill', '#9C9690').attr('font-size', '10px');
    };
    g.append('g').attr('transform', `translate(0,${size})`).call(d3.axisBottom(xScale).ticks(5)).call(styleAxis);
    g.append('g').call(d3.axisLeft(yScale).ticks(5)).call(styleAxis);

    g.append('rect')
      .attr('width', size).attr('height', size)
      .attr('fill', 'transparent')
      .style('cursor', interactive ? 'crosshair' : 'default')
      .on('click', (event) => {
        if (!interactive || !onPlotClick) return;
        const [mx, my] = d3.pointer(event);
        onPlotClick(xScale.invert(mx), yScale.invert(my));
      });

    // Render voters per-layer to support highlight
    if (showVoters) {
      for (const layer of layers.filter(l => l.visible && l.type === 'voter')) {
        const lit = highlightedLayerId && layer.id === highlightedLayerId;
        const r = lit ? 6 : 4;
        const opacity = 0.85;
        g.selectAll(null)
          .data(layer.points)
          .join('circle')
          .attr('cx', d => xScale(d.x))
          .attr('cy', d => yScale(d.y))
          .attr('r', r)
          .attr('fill', '#3F6E6A')
          .attr('opacity', opacity)
          .attr('stroke', lit ? '#2F5D58' : 'none')
          .attr('stroke-width', lit ? 1.5 : 0)
          .style('cursor', 'default')
          .on('mouseover', function() { d3.select(this).attr('r', r + 2).attr('opacity', 1); })
          .on('mouseout',  function() { d3.select(this).attr('r', r).attr('opacity', opacity); });
      }
    }

    if (centerPreview) {
      const { x, y, distribution, stdDev, rectWidth, rectHeight, discRadius } = centerPreview;
      const px = xScale(x), py = yScale(y);

      // Clipped container for the distribution shape
      const clip = g.append('svg')
        .attr('x', 0).attr('y', 0)
        .attr('width', size).attr('height', size)
        .style('overflow', 'hidden')
        .attr('pointer-events', 'none');

      // Build shape elements and keep refs for in-place drag updates
      let distCircles = [], distCircle = null, distRect = null;

      if (distribution === 'gaussian') {
        clip.append('rect').attr('width', size).attr('height', size)
          .attr('fill', 'rgba(201,100,66,0.04)');
        const sdStyles = [
          { sd: 3, fill: 'rgba(201,100,66,0.05)', stroke: 'rgba(201,100,66,0.28)' },
          { sd: 2, fill: 'rgba(201,100,66,0.07)', stroke: 'rgba(201,100,66,0.50)' },
          { sd: 1, fill: 'rgba(201,100,66,0.10)', stroke: 'rgba(201,100,66,0.85)' },
        ];
        for (const { sd, fill, stroke } of sdStyles) {
          distCircles.push(
            clip.append('circle')
              .attr('cx', px).attr('cy', py)
              .attr('r', stdDev * sd * size)
              .attr('fill', fill).attr('stroke', stroke)
              .attr('stroke-width', 1).attr('stroke-dasharray', '5 3')
          );
        }
      } else if (distribution === 'uniform_rectangle') {
        distRect = clip.append('rect')
          .attr('x', xScale(x - rectWidth / 2))
          .attr('y', yScale(y + rectHeight / 2))
          .attr('width', rectWidth * size).attr('height', rectHeight * size)
          .attr('fill', 'rgba(201,100,66,0.10)')
          .attr('stroke', 'rgba(201,100,66,0.70)')
          .attr('stroke-width', 1.5).attr('stroke-dasharray', '5 3');
      } else if (distribution === 'uniform_disc') {
        distCircle = clip.append('circle')
          .attr('cx', px).attr('cy', py)
          .attr('r', discRadius * size)
          .attr('fill', 'rgba(201,100,66,0.10)')
          .attr('stroke', 'rgba(201,100,66,0.70)')
          .attr('stroke-width', 1.5).attr('stroke-dasharray', '5 3');
      }

      // Crosshair lines & dot at g level (not clipped, renders on top)
      const crosshairH = g.append('line')
        .attr('x1', px - 7).attr('y1', py).attr('x2', px + 7).attr('y2', py)
        .attr('stroke', '#2D2B27').attr('stroke-width', 1.5)
        .attr('pointer-events', 'none');
      const crosshairV = g.append('line')
        .attr('x1', px).attr('y1', py - 7).attr('x2', px).attr('y2', py + 7)
        .attr('stroke', '#2D2B27').attr('stroke-width', 1.5)
        .attr('pointer-events', 'none');
      const crosshairDot = g.append('circle')
        .attr('cx', px).attr('cy', py).attr('r', 3.5)
        .attr('fill', '#2D2B27').attr('stroke', '#F5F0E8').attr('stroke-width', 1)
        .attr('pointer-events', 'none');

      // Transparent drag handle on top
      if (onCenterMove) {
        const handle = g.append('circle')
          .attr('cx', px).attr('cy', py).attr('r', 10)
          .attr('fill', 'transparent')
          .style('cursor', 'grab')
          .on('click', e => e.stopPropagation());

        dragRefs = {
          crosshairH, crosshairV, crosshairDot, handle,
          distCircles, distCircle, distRect,
          distribution, stdDev, rectWidth, rectHeight, discRadius, size, xScale, yScale,
        };

        handle.call(d3.drag()
          // Anchor drag to the actual center, not where the user clicked
          .subject(() => ({ x: px, y: py }))
          .on('start', function() {
            isDragging = true;
            d3.select(this).style('cursor', 'grabbing');
          })
          .on('drag', function(event) {
            if (!dragRefs) return;
            const npx = event.x, npy = event.y;
            const refs = dragRefs;
            // Move crosshair
            refs.crosshairH.attr('x1', npx - 7).attr('y1', npy).attr('x2', npx + 7).attr('y2', npy);
            refs.crosshairV.attr('x1', npx).attr('y1', npy - 7).attr('x2', npx).attr('y2', npy + 7);
            refs.crosshairDot.attr('cx', npx).attr('cy', npy);
            d3.select(this).attr('cx', npx).attr('cy', npy);
            // Move distribution shape
            if (refs.distribution === 'gaussian') {
              refs.distCircles.forEach(c => c.attr('cx', npx).attr('cy', npy));
            } else if (refs.distribution === 'uniform_disc') {
              refs.distCircle?.attr('cx', npx).attr('cy', npy);
            } else if (refs.distribution === 'uniform_rectangle') {
              const nx = refs.xScale.invert(npx), ny = refs.yScale.invert(npy);
              refs.distRect
                ?.attr('x', refs.xScale(nx - refs.rectWidth / 2))
                .attr('y', refs.yScale(ny + refs.rectHeight / 2));
            }
          })
          .on('end', function(event) {
            isDragging = false;
            const nx = Math.max(0, Math.min(1, xScale.invert(event.x)));
            const ny = Math.max(0, Math.min(1, yScale.invert(event.y)));
            if (onCenterMove) onCenterMove(nx, ny);
          })
        );
      }
    }

    if (showCandidates) {
      if (electionResult) {
        const resultPts = electionResult.flatMap(l => l.points);
        resultPts.forEach(p => {
          const cx = xScale(p.x), cy = yScale(p.y);
          const fill = '#C0392B';
          const sz = p.winner ? 14 : 10;
          g.append('path')
            .attr('d', starPath(cx, cy, sz))
            .attr('fill', fill)
            .attr('stroke', '#922B21')
            .attr('stroke-width', 0.5);
          if (p.winner) {
            g.append('text')
              .attr('x', cx).attr('y', cy - 18)
              .attr('text-anchor', 'middle')
              .attr('font-size', '11px')
              .attr('font-family', "Georgia, 'Times New Roman', serif")
              .attr('font-style', 'italic')
              .attr('fill', '#C96442')
              .text('winner');
          }
        });
      } else {
        for (const layer of layers.filter(l => l.visible && l.type === 'candidate')) {
          const lit = highlightedLayerId && layer.id === highlightedLayerId;
          layer.points.forEach(p => {
            g.append('path')
              .attr('d', starPath(xScale(p.x), yScale(p.y), lit ? 14 : 10))
              .attr('fill', '#C0392B')
              .attr('stroke', lit ? '#7B241C' : '#922B21')
              .attr('stroke-width', lit ? 1 : 0.5)
              .attr('opacity', 1);
          });
        }
      }
    }
  }

  onMount(() => {
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(svgEl);
    return () => ro.disconnect();
  });

  $effect(() => {
    void layers;
    void electionResult;
    void showVoters;
    void showCandidates;
    void centerPreview;
    void highlightedLayerId;
    draw();
  });
</script>

<svg bind:this={svgEl} class="plot-svg"></svg>

<style>
  .plot-svg { width: 100%; height: 100%; display: block; }
</style>
