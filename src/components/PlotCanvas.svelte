<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import { resolveWinnerIds, VOTER_LAYER_COLOR, CANDIDATE_LAYER_COLOR } from '../lib/layerUtils.js';

  const { layers, electionResult, showVoters, showCandidates, interactive, onPlotClick, onPointClick, centerPreview, highlightedLayerId, onCenterMove, axisInfo } = $props();

  const WINNER_FALLBACK_FILL = '#5C4324';
  const WINNER_FALLBACK_STROKE = '#8E6A22';
  const LOSER_OPACITY = 0.12;
  const LOSER_OPACITY_LIT = 0.32;

  let svgEl;

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

    // Clip rect for data elements — small buffer so edge points aren't cut at normal zoom
    const clipBuf = size * 0.0125;
    svgNode.append('defs')
      .append('clipPath').attr('id', 'plot-clip')
      .append('rect')
        .attr('x', -clipBuf).attr('y', -clipBuf)
        .attr('width', size + 2 * clipBuf).attr('height', size + 2 * clipBuf);

    const g = svgNode.append('g').attr('transform', `translate(${offsetX},${offsetY})`);

    const xScale = d3.scaleLinear().domain([0, 1]).range([0, size]);
    const yScale = d3.scaleLinear().domain([0, 1]).range([size, 0]);

    const zx = xScale, zy = yScale, zk = 1;

    const SERIF = 'system-ui, -apple-system, sans-serif';
    const styleAxis = ax => {
      ax.selectAll('line,path').attr('stroke', '#D5CFC6');
      ax.selectAll('text').attr('fill', '#9C9690').attr('font-size', '12px').attr('font-family', SERIF);
    };
    g.append('g').attr('transform', `translate(0,${size})`).call(d3.axisBottom(zx).ticks(5)).call(styleAxis);
    g.append('g').call(d3.axisLeft(zy).ticks(5)).call(styleAxis);

    if (axisInfo) {
      // X axis title
      g.append('text')
        .attr('x', size / 2).attr('y', size + 50)
        .attr('text-anchor', 'middle').attr('font-size', '16px')
        .attr('fill', '#2D2B27').attr('font-family', SERIF).attr('font-weight', '700')
        .text(axisInfo.x.label);
      // X low/high annotations — fixed pixel positions, describe global axis direction
      g.append('text')
        .attr('x', xScale(0.2)).attr('y', size + 34)
        .attr('text-anchor', 'end').attr('font-size', '12px')
        .attr('fill', '#CC7857').attr('font-family', SERIF)
        .text(axisInfo.x.lowLabel);
      g.append('text')
        .attr('x', xScale(0.75)).attr('y', size + 34)
        .attr('text-anchor', 'start').attr('font-size', '12px')
        .attr('fill', '#CC7857').attr('font-family', SERIF)
        .text(axisInfo.x.highLabel);
      // Y axis title
      g.append('text')
        .attr('transform', `translate(${-50},${size / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle').attr('font-size', '16px')
        .attr('fill', '#2D2B27').attr('font-family', SERIF).attr('font-weight', '700')
        .text(axisInfo.y.label);
      // Y low/high annotations — fixed pixel positions
      g.append('text')
        .attr('transform', `translate(${-34},${yScale(0.1)}) rotate(-90)`)
        .attr('text-anchor', 'start').attr('font-size', '12px')
        .attr('fill', '#CC7857').attr('font-family', SERIF)
        .text(axisInfo.y.lowLabel);
      g.append('text')
        .attr('transform', `translate(${-34},${yScale(0.75)}) rotate(-90)`)
        .attr('text-anchor', 'start').attr('font-size', '12px')
        .attr('fill', '#CC7857').attr('font-family', SERIF)
        .text(axisInfo.y.highLabel);
    }

    g.append('rect')
      .attr('width', size).attr('height', size)
      .attr('fill', 'transparent')
      .style('cursor', interactive ? 'crosshair' : 'default')
      .on('click', (event) => {
        if (!interactive || !onPlotClick) return;
        const [mx, my] = d3.pointer(event);
        onPlotClick(zx.invert(mx), zy.invert(my));
      });

    // Render voters per-layer to support highlight
    if (showVoters) {
      for (const layer of layers.filter(l => l.visible && l.type === 'voter')) {
        const lit = highlightedLayerId && layer.id === highlightedLayerId;
        const r = lit ? 6 : 4;
        const opacity = 0.75;
        const fill = VOTER_LAYER_COLOR;
        g.append('g').attr('clip-path', 'url(#plot-clip)')
          .selectAll(null)
          .data(layer.points)
          .join('circle')
          .attr('cx', d => zx(d.x))
          .attr('cy', d => zy(d.y))
          .attr('r', r)
          .attr('fill', fill)
          .attr('opacity', opacity)
          .attr('stroke', lit ? d3.color(fill)?.darker(0.5) : 'none')
          .attr('stroke-width', lit ? 1.5 : 0)
          .style('cursor', d => (d._respondent && onPointClick) ? 'pointer' : 'inherit')
          .style('pointer-events', onPointClick ? 'auto' : 'none')
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
      const px = zx(x), py = zy(y);

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
          .attr('fill', 'rgba(204,120,87,0.04)');
        const sdStyles = [
          { sd: 3, fill: 'rgba(204,120,87,0.05)', stroke: 'rgba(204,120,87,0.28)' },
          { sd: 2, fill: 'rgba(204,120,87,0.07)', stroke: 'rgba(204,120,87,0.50)' },
          { sd: 1, fill: 'rgba(204,120,87,0.10)', stroke: 'rgba(204,120,87,0.85)' },
        ];
        for (const { sd, fill, stroke } of sdStyles) {
          distCircles.push(
            clip.append('circle')
              .attr('cx', px).attr('cy', py)
              .attr('r', stdDev * sd * size * zk)
              .attr('fill', fill).attr('stroke', stroke)
              .attr('stroke-width', 1).attr('stroke-dasharray', '5 3')
          );
        }
      } else if (distribution === 'uniform_rectangle') {
        distRect = clip.append('rect')
          .attr('x', zx(x - rectWidth / 2))
          .attr('y', zy(y + rectHeight / 2))
          .attr('width', rectWidth * size * zk).attr('height', rectHeight * size * zk)
          .attr('fill', 'rgba(204,120,87,0.10)')
          .attr('stroke', 'rgba(204,120,87,0.70)')
          .attr('stroke-width', 1.5).attr('stroke-dasharray', '5 3');
      } else if (distribution === 'uniform_disc') {
        distCircle = clip.append('circle')
          .attr('cx', px).attr('cy', py)
          .attr('r', discRadius * size * zk)
          .attr('fill', 'rgba(204,120,87,0.10)')
          .attr('stroke', 'rgba(204,120,87,0.70)')
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
          distribution, stdDev, rectWidth, rectHeight, discRadius, size,
          xScale: zx, yScale: zy,
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
            const nx = Math.max(0, Math.min(1, zx.invert(event.x)));
            const ny = Math.max(0, Math.min(1, zy.invert(event.y)));
            if (onCenterMove) onCenterMove(nx, ny);
          })
        );
      }
    }

    if (showCandidates) {
      const winnerIds = resolveWinnerIds(layers, electionResult);
      const postElection = Boolean(electionResult?.length) && winnerIds.size > 0;
      const candG = g.append('g').attr('clip-path', 'url(#plot-clip)');

      for (const layer of layers.filter(l => l.visible && l.type === 'candidate')) {
        const lit = highlightedLayerId && layer.id === highlightedLayerId;
        const baseFill = layer.color ?? CANDIDATE_LAYER_COLOR;
        const baseStroke = d3.color(baseFill)?.darker(0.5).formatHex() ?? '#B8634A';
        layer.points.forEach((p, i) => {
          const isWinner = winnerIds.has(`${layer.id}-${i}`);
          const cx = zx(p.x), cy = zy(p.y);
          const sz = postElection ? 10 : (lit ? 14 : 10);
          let fill = baseFill;
          let stroke = baseStroke;
          let opacity = 1;
          let strokeW = (lit || isWinner) ? 1 : 0.5;

          if (postElection) {
            if (isWinner) {
              fill = d3.color(baseFill)?.darker(0.95).formatHex() ?? WINNER_FALLBACK_FILL;
              stroke = d3.color(baseFill)?.darker(1.25).formatHex() ?? WINNER_FALLBACK_STROKE;
              strokeW = 1;
              opacity = 1;
            } else {
              opacity = lit ? LOSER_OPACITY_LIT : LOSER_OPACITY;
              strokeW = 0.5;
            }
          }

          candG.append('path')
            .datum(p)
            .attr('d', starPath(cx, cy, sz))
            .attr('fill', fill)
            .attr('stroke', stroke)
            .attr('stroke-width', strokeW)
            .attr('opacity', opacity)
            .style('cursor', p._profile ? 'pointer' : 'default')
            .on('click', function(event, d) {
              if (!d._profile || !onPointClick) return;
              event.stopPropagation();
              onPointClick(d._profile);
            });
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
    void interactive;
    void onPointClick;
    draw();
  });

</script>

<svg bind:this={svgEl} class="plot-svg"></svg>

<style>
  .plot-svg { width: 100%; height: 100%; display: block; }
</style>
