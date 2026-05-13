<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  const { layers, electionResult, showVoters, showCandidates, interactive, onPlotClick, onPointClick, centerPreview, highlightedLayerId, onCenterMove, axisInfo } = $props();

  let svgEl;

  function trunc(s, n) {
    return s && s.length > n ? s.slice(0, n - 1) + '…' : (s ?? '');
  }

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

    const margin = axisInfo
      ? { top: 20, right: 20, bottom: 58, left: 58 }
      : { top: 20, right: 20, bottom: 40, left: 40 };

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

    if (axisInfo) {
      // X axis title
      g.append('text')
        .attr('x', size / 2).attr('y', size + 48)
        .attr('text-anchor', 'middle').attr('font-size', '13px')
        .attr('fill', '#2D2B27').attr('font-family', 'sans-serif').attr('font-weight', '700')
        .text(axisInfo.x.label);
      // X low annotation
      g.append('text')
        .attr('x', xScale(0.2)).attr('y', size + 32)
        .attr('text-anchor', 'end').attr('font-size', '10px')
        .attr('fill', '#C96442')
        .text(axisInfo.x.lowLabel);
      // X high annotation
      g.append('text')
        .attr('x', xScale(0.75)).attr('y', size + 32)
        .attr('text-anchor', 'start').attr('font-size', '10px')
        .attr('fill', '#C96442')
        .text(axisInfo.x.highLabel);
      // Y axis title
      g.append('text')
        .attr('transform', `translate(${-48},${size / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle').attr('font-size', '13px')
        .attr('fill', '#2D2B27').attr('font-family', 'sans-serif').attr('font-weight', '600')
        .text(axisInfo.y.label);
      // Y low annotation starting at y=0.1
      g.append('text')
        .attr('transform', `translate(${-32},${yScale(0.1)}) rotate(-90)`)
        .attr('text-anchor', 'start').attr('font-size', '10px')
        .attr('fill', '#C96442')
        .text(axisInfo.y.lowLabel);
      // Y high annotation starting at y=0.7
      g.append('text')
        .attr('transform', `translate(${-32},${yScale(0.75)}) rotate(-90)`)
        .attr('text-anchor', 'start').attr('font-size', '10px')
        .attr('fill', '#C96442')
        .text(axisInfo.y.highLabel);
    }

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
        const opacity = 0.75;
        const fill = layer.color ?? '#3F6E6A';
        g.selectAll(null)
          .data(layer.points)
          .join('circle')
          .attr('cx', d => xScale(d.x))
          .attr('cy', d => yScale(d.y))
          .attr('r', r)
          .attr('fill', fill)
          .attr('opacity', opacity)
          .attr('stroke', lit ? d3.color(fill)?.darker(0.5) : 'none')
          .attr('stroke-width', lit ? 1.5 : 0)
          .style('cursor', d => d._respondent ? 'pointer' : 'default')
          .on('mouseover', function() { d3.select(this).attr('r', r + 2).attr('opacity', 1); })
          .on('mouseout',  function() { d3.select(this).attr('r', r).attr('opacity', opacity); })
          .on('click', function(event, d) {
            if (!d._respondent || !onPointClick) return;
            event.stopPropagation();
            onPointClick(d._respondent);
          });
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
      const winnerIds = new Set();
      const winnerPositions = [];
      if (electionResult) {
        for (const l of electionResult) {
          for (const p of l.points) {
            if (!p.winner) continue;
            if (p.id !== undefined) winnerIds.add(p.id);
            else winnerPositions.push({ x: p.x, y: p.y });
          }
        }
      }
      for (const layer of layers.filter(l => l.visible && l.type === 'candidate')) {
        const lit = highlightedLayerId && layer.id === highlightedLayerId;
        const fill = layer.color ?? '#C8983A';
        const stroke = d3.color(fill)?.darker(0.6).formatHex() ?? '#8E6A22';
        layer.points.forEach((p, i) => {
          const isWinner = winnerIds.has(`${layer.id}-${i}`) ||
            winnerPositions.some(w => Math.abs(w.x - p.x) < 1e-9 && Math.abs(w.y - p.y) < 1e-9);
          const cx = xScale(p.x), cy = yScale(p.y);
          const sz = isWinner ? 14 : (lit ? 14 : 10);
          g.append('path')
            .datum(p)
            .attr('d', starPath(cx, cy, sz))
            .attr('fill', fill)
            .attr('stroke', stroke)
            .attr('stroke-width', (lit || isWinner) ? 1 : 0.5)
            .attr('opacity', 1)
            .style('cursor', p._profile ? 'pointer' : 'default')
            .on('click', function(event, d) {
              if (!d._profile || !onPointClick) return;
              event.stopPropagation();
              onPointClick(d._profile);
            });
          if (isWinner) {
            g.append('text')
              .attr('x', cx).attr('y', cy - 18)
              .attr('text-anchor', 'middle')
              .attr('font-size', '11px')
              .attr('font-family', "Georgia, 'Times New Roman', serif")
              .attr('font-style', 'italic')
              .attr('fill', '#C96442')
              .attr('pointer-events', 'none')
              .text('winner');
          }
          {
            const m = /Candidate\s+([A-Z])/i.exec(layer.label ?? '');
            const letter = m ? m[1].toUpperCase() : null;
            if (letter) {
              g.append('text')
                .attr('x', cx + sz + 5).attr('y', cy + 5)
                .attr('text-anchor', 'start')
                .attr('font-size', '14px')
                .attr('font-family', "Georgia, 'Times New Roman', serif")
                .attr('font-weight', '700')
                .attr('fill', '#2D2B27')
                .attr('stroke', '#F5F0E8')
                .attr('stroke-width', 3)
                .attr('paint-order', 'stroke')
                .attr('pointer-events', 'none')
                .text(letter);
            }
          }
        });
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
    void axisInfo;
    draw();
  });
</script>

<svg bind:this={svgEl} class="plot-svg"></svg>

<style>
  .plot-svg { width: 100%; height: 100%; display: block; }
</style>
