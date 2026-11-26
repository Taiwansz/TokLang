/* ============================================================================
   TOKLANG v2.0 — MOTION & NATIVE 2D-PROJECTED 3D CANVAS ENGINE
   - Zero Three.js / WebGL overhead (pure Float32Array 3D projection @ 60fps)
   - BPE Compression Manifold: Outer raw lattice contracting into copper/gold core
   - Vector edges + 3D spatial typography labels + inertial mouse parallax
   - GSAP 3 + ScrollTrigger + Lenis + elementsFromPoint() header polarity
   ============================================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lenis = null;
  let rafHeroId = null;
  let polarityBound = false;
  let scrollTriggersBuilt = false;
  let activePillarIndex = 0;

  const PILLAR_STAGES = [
    {
      index: '01',
      label: 'CODEC TABULAR LOSSLESS (@table / @struct)',
      metric: '-59,9% BPE · 100% reversível',
      beforeTitle: 'JSON / MCP bruto (25 registros · 1.610 tokens o200k_base)',
      beforeCode: `{
  "users": [
    { "id": 1001, "name": "Engineer_1", "team": "ml-platform", "role": "staff", "active": true },
    { "id": 1002, "name": "Engineer_2", "team": "core-infra",  "role": "senior", "active": true }
  ]
}`,
      afterTitle: 'TokLang v2 @table (645 tokens o200k_base · FLOPs -84,0%)',
      afterCode: `@table users[25]{id,name,email,team,role,active,monthly_tokens}:
1001|Engineer_1|eng1@acme.dev|ml-platform|staff|true|120000
1002|Engineer_2|eng2@acme.dev|core-infra|senior|true|127500`,
      note: 'Schema elevado uma única vez. decodeStructured() restaura o JSON original bit-a-bit com escape automático de literais.',
    },
    {
      index: '02',
      label: 'CAPC — CACHE-AWARE PROMPT COMPRESSION',
      metric: '-40,6% além do Prompt Cache',
      beforeTitle: 'Compressão ingênua (quebra KV-Cache a cada turno)',
      beforeCode: `// Turno A e Turno B alteram o prefixo de sistema:
system_hash(turno_A) != system_hash(turno_B)
// Anthropic Prompt Cache MISS -> cobra 100% do input novamente`,
      afterTitle: 'TokLang CAPC (Tier 0 SHA-256 imutável + Tier 2 dinâmico)',
      afterCode: `Tier 0 [static, query-agnostic] -> SHA-256: 0f844b26e9a29e (CACHE HIT 85%)
Tier 2 [tool JSON / RAG]        -> @table + BM25 (-60% nos tokens cheios)
Anthropic 1k reqs: $8,87 (raw) -> $4,31 (cache) -> $2,56 (CAPC)`,
      note: 'compileMessages() injeta cache_control no Tier 0 mantendo o mesmo hash entre turnos diferentes.',
    },
    {
      index: '03',
      label: 'POLARITY & NEGATION LOCK',
      metric: '100% retenção lógica · 0 esqueletos',
      beforeTitle: 'Compressor v1 com abreviações consonantais e stopwords',
      beforeCode: `Entrada: "Não exponha credenciais nos logs e crie API sem ORM."
v1:      "expha crdncls lgs cr API ORM"   // INVERSÃO SEMÂNTICA + INFLAÇÃO BPE`,
      afterTitle: 'TokLang v2 (trava inviolável de polaridade e vocabulário BPE)',
      afterCode: `v2:      "Não exponha credenciais nos logs e crie API sem ORM."
Audit:   negationsPreservedRatio = 1.00 | consonantSkeletons = 0
Guard:   countTokens(out, "o200k_base") <= countTokens(in, "o200k_base")`,
      note: 'Operadores lógicos (não, sem, nunca, exceto, not, never, !=, <=), blocos de código e SQL jamais são mutilados.',
    },
    {
      index: '04',
      label: 'PODA EXTRATIVA BM25 + EVICÇÃO BPE EXATA',
      metric: '-87,0% RAG · p95 8,31 ms offline',
      beforeTitle: 'RAG longo (Consenso Raft · 664 tokens · teto 220 tokens)',
      beforeCode: `[Seções 1..14 de ruído administrativo sobre almoxarifado...]
[Cláusula crítica no final]: "quórum mínimo floor(N/2)+1 nós ativos;
nunca permita escrita sem líder confirmado para evitar split-brain."`,
      afterTitle: 'Seleção Knapsack BM25 + evicção de menor prioridade em BPE exato',
      afterCode: `Saída (86 tokens o200k_base, -87,0%, FLOPs -98,3%):
Especificação de consenso Raft: quórum mínimo floor(N/2)+1 nós ativos;
nunca permita escrita sem líder confirmado para evitar split-brain.`,
      note: '100% offline sem chamar LLMs externos. Ruído de menor score é evictado antes que qualquer truncamento possa ocorrer.',
    },
  ];

  /* ===== 1. HEADER POLARITY SENSING (elementsFromPoint) ===== */
  let polarityRaf = false;
  function syncHeaderTheme() {
    if (polarityRaf) return;
    polarityRaf = true;
    requestAnimationFrame(() => {
      polarityRaf = false;
      if (document.documentElement.classList.contains('light-theme')) {
        document.body.dataset.hdrTheme = 'light';
        return;
      }
      const hdr = document.querySelector('[data-hdr]');
      if (!hdr) return;
      const probeY = Math.min(window.innerHeight - 10, hdr.getBoundingClientRect().bottom + 4);
      const hits = document.elementsFromPoint ? document.elementsFromPoint(window.innerWidth / 2, probeY) : [];
      const match = hits.find((el) => !el.closest('[data-hdr]') && el.closest('[data-theme]'));
      const theme = match ? match.closest('[data-theme]').dataset.theme : 'dark';
      document.body.dataset.hdrTheme = theme || 'dark';
    });
  }

  /* ===== 2. NATIVE 2D-PROJECTED 3D COMPRESSION MANIFOLD (EDITORIAL CANVAS 3D) ===== */
  function startHeroCanvas() {
    if (rafHeroId) {
      cancelAnimationFrame(rafHeroId);
      rafHeroId = null;
    }

    const canvas = document.getElementById('toklang-hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;
    const OUTER_COUNT = isMobile ? 320 : 680;
    const CORE_COUNT = isMobile ? 220 : 480;
    const TOTAL = OUTER_COUNT + CORE_COUNT;

    // Contiguous Float32Arrays for zero GC pause at 60fps
    const rawX = new Float32Array(TOTAL);
    const rawY = new Float32Array(TOTAL);
    const rawZ = new Float32Array(TOTAL);
    const cmpX = new Float32Array(TOTAL);
    const cmpY = new Float32Array(TOTAL);
    const cmpZ = new Float32Array(TOTAL);
    const pKind = new Uint8Array(TOTAL); // 0 = outer raw token, 1 = copper core, 2 = gold anchor

    // Golden-angle Fibonacci distribution for sculptural dual-shell compression manifold
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    // Outer shell: twisted hyperbolic lattice (Raw context) -> contracts onto structured grid planes
    for (let i = 0; i < OUTER_COUNT; i++) {
      const t = (i + 0.5) / OUTER_COUNT;
      const yNorm = 1 - 2 * t;
      const waist = 0.62 + 0.56 * yNorm * yNorm;
      const theta = goldenAngle * i;
      const r = 1.48 * waist;
      rawX[i] = Math.cos(theta) * r;
      rawY[i] = yNorm * 1.28;
      rawZ[i] = Math.sin(theta) * r;

      // Target compiled state: crisp stratified @table planes inside core radius
      const layer = (i % 7) - 3;
      const col = ((i / 7) | 0) % 10 - 4.5;
      const row = (((i / 70) | 0) % 10) - 4.5;
      cmpX[i] = col * 0.16;
      cmpY[i] = layer * 0.17;
      cmpZ[i] = row * 0.16;
      pKind[i] = 0;
    }

    // Inner core: dense faceted octahedral/geodesic prism in Copper & Gold
    for (let j = 0; j < CORE_COUNT; j++) {
      const idx = OUTER_COUNT + j;
      const t = (j + 0.5) / CORE_COUNT;
      const y = 1 - 2 * t;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * j * 1.37;
      // Facet shaping (octahedral crispness)
      const ox = Math.cos(theta) * rad;
      const oz = Math.sin(theta) * rad;
      const l1 = Math.abs(ox) + Math.abs(y) + Math.abs(oz) || 1;
      const facetMix = 0.42;
      const scale = 0.72;
      const fx = (ox * (1 - facetMix) + (ox / l1) * facetMix) * scale;
      const fy = (y * (1 - facetMix) + (y / l1) * facetMix) * scale;
      const fz = (oz * (1 - facetMix) + (oz / l1) * facetMix) * scale;

      rawX[idx] = fx * 1.22;
      rawY[idx] = fy * 1.22;
      rawZ[idx] = fz * 1.22;
      cmpX[idx] = fx * 0.88;
      cmpY[idx] = fy * 0.88;
      cmpZ[idx] = fz * 0.88;
      pKind[idx] = j % 5 === 0 ? 2 : 1;
    }

    // Structural wireframe prism vertices (12-vertex icosahedral cage + inner octahedron)
    const phi = (1 + Math.sqrt(5)) / 2;
    const cageVerts = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
    ].map(([x, y, z]) => {
      const len = Math.hypot(x, y, z);
      return [x / len, y / len, z / len];
    });

    const cageEdges = [];
    for (let a = 0; a < cageVerts.length; a++) {
      for (let b = a + 1; b < cageVerts.length; b++) {
        const d = Math.hypot(
          cageVerts[a][0] - cageVerts[b][0],
          cageVerts[a][1] - cageVerts[b][1],
          cageVerts[a][2] - cageVerts[b][2]
        );
        if (d < 1.15) cageEdges.push([a, b]);
      }
    }

    const spatialLabels = [
      { vIdx: 1, text: 'o200k_base', accent: '#C8B560' },
      { vIdx: 5, text: '@table -59.9%', accent: '#E05A2B' },
      { vIdx: 8, text: 'CAPC SHA-256', accent: '#3B8EA5' },
      { vIdx: 11, text: 'POLARITY LOCK', accent: '#F0EDE6' },
    ];

    let width = 0;
    let height = 0;
    let dpr = 1;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      width = Math.max(300, rect.width);
      height = Math.max(360, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener('resize', resize, { passive: true });

    let targetRotX = 0.24;
    let targetRotY = -0.32;
    let curRotX = 0.24;
    let curRotY = -0.32;

    const onPointerMove = (e) => {
      const nx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      const ny = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
      targetRotY = nx * 0.55;
      targetRotX = 0.22 + ny * 0.32;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    function project(x, y, z, rotX, rotY, scalePx, cx, cy) {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      const fov = 4.2;
      const depth = fov / (fov + z2 + 1.8);
      return {
        sx: cx + x1 * scalePx * depth,
        sy: cy + y2 * scalePx * depth,
        z: z2,
        depth,
      };
    }

    function renderFrame(ts) {
      const homeActive = document.getElementById('page-home')?.classList.contains('active');
      if (!homeActive) {
        rafHeroId = null;
        return;
      }

      const tSec = ts * 0.001;
      // Smooth compression breathing cycle + scroll compression boost
      const scrollRatio = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight * 0.85)));
      const breath = 0.5 - 0.5 * Math.cos(tSec * 0.65);
      const compressMix = Math.min(1, breath * 0.42 + scrollRatio * 0.58);

      curRotX += (targetRotX - curRotX) * 0.05;
      curRotY += (targetRotY + tSec * 0.16 - curRotY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * (isMobile ? 0.44 : 0.49);
      const scalePx = Math.min(width, height) * (isMobile ? 0.36 : 0.36);

      const isLight = document.documentElement.classList.contains('light-theme');

      // Subtle copper core aura directly behind the sculpture
      const aura = ctx.createRadialGradient(cx, cy, scalePx * 0.04, cx, cy, scalePx * 1.2);
      aura.addColorStop(0, isLight ? 'rgba(201, 70, 27, 0.16)' : 'rgba(224, 90, 43, 0.30)');
      aura.addColorStop(0.45, isLight ? 'rgba(138, 116, 36, 0.06)' : 'rgba(200, 181, 96, 0.09)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, scalePx * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // 1. Project & draw outer structural cage edges (vector pen lines)
      const cageScale = 1.40 - compressMix * 0.40;
      const projCage = cageVerts.map(([x, y, z]) =>
        project(x * cageScale, y * cageScale, z * cageScale, curRotX, curRotY, scalePx, cx, cy)
      );

      ctx.lineWidth = 1.1;
      for (let e = 0; e < cageEdges.length; e++) {
        const a = projCage[cageEdges[e][0]];
        const b = projCage[cageEdges[e][1]];
        const avgDepth = (a.depth + b.depth) * 0.5;
        const alpha = Math.max(0.12, Math.min(0.58, (avgDepth - 0.42) * 0.85));
        ctx.strokeStyle = isLight
          ? `rgba(11, 12, 15, ${alpha * 0.65})`
          : `rgba(200, 181, 96, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      // 2. Project & draw inner copper-gold core wireframe
      const innerScale = 0.80 - compressMix * 0.14;
      const projInner = cageVerts.map(([x, y, z]) =>
        project(x * innerScale, y * innerScale, z * innerScale, -curRotX * 0.7, -curRotY * 1.35, scalePx, cx, cy)
      );

      ctx.lineWidth = 1.4;
      for (let e = 0; e < cageEdges.length; e++) {
        const a = projInner[cageEdges[e][0]];
        const b = projInner[cageEdges[e][1]];
        const alpha = Math.max(0.18, Math.min(0.82, ((a.depth + b.depth) * 0.5 - 0.38) * 1.05));
        ctx.strokeStyle = `rgba(224, 90, 43, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      // 3. Project & render volumetric points (outer raw lattice + inner copper/gold core)
      for (let i = 0; i < TOTAL; i++) {
        const x = rawX[i] + (cmpX[i] - rawX[i]) * compressMix;
        const y = rawY[i] + (cmpY[i] - rawY[i]) * compressMix;
        const z = rawZ[i] + (cmpZ[i] - rawZ[i]) * compressMix;
        const p = project(x, y, z, curRotX, curRotY, scalePx, cx, cy);
        if (p.depth < 0.25) continue;

        const kind = pKind[i];
        const size = kind === 0 ? 1.2 * p.depth : (kind === 2 ? 2.25 * p.depth : 1.8 * p.depth);
        const alpha = Math.max(0.15, Math.min(0.98, (p.depth - 0.34) * 1.35));

        if (kind === 0) {
          ctx.fillStyle = isLight
            ? `rgba(11, 12, 15, ${alpha * 0.45})`
            : `rgba(240, 237, 230, ${alpha * 0.50})`;
        } else if (kind === 1) {
          ctx.fillStyle = `rgba(224, 90, 43, ${alpha * 0.96})`;
        } else {
          ctx.fillStyle = `rgba(200, 181, 96, ${alpha})`;
        }
        ctx.fillRect(p.sx - size * 0.5, p.sy - size * 0.5, size, size);
      }

      // 4. Spatial 3D typography labels anchored strictly OUTSIDE central headline safe-zone
      if (!isMobile) {
        ctx.font = '600 10.5px "JetBrains Mono", monospace';
        ctx.textBaseline = 'middle';
        const safeHalfW = Math.min(340, width * 0.28);
        const safeHalfH = 112;
        for (let k = 0; k < spatialLabels.length; k++) {
          const item = spatialLabels[k];
          const v = projCage[item.vIdx];
          const inHeadlineZone = Math.abs(v.sx - cx) < safeHalfW && Math.abs(v.sy - cy) < safeHalfH;
          if (inHeadlineZone) continue;

          const alpha = Math.max(0.32, Math.min(0.92, (v.depth - 0.38) * 1.45));
          const dir = v.sx >= cx ? 1 : -1;
          const lx = v.sx + dir * 28;
          const ly = v.sy;

          ctx.strokeStyle = isLight ? `rgba(11, 12, 15, ${alpha * 0.45})` : `rgba(240, 237, 230, ${alpha * 0.40})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(v.sx, v.sy);
          ctx.lineTo(lx, ly);
          ctx.stroke();

          ctx.fillStyle = item.accent;
          ctx.beginPath();
          ctx.arc(v.sx, v.sy, 2.8, 0, Math.PI * 2);
          ctx.fill();

          ctx.textAlign = dir > 0 ? 'left' : 'right';
          ctx.fillStyle = isLight ? `rgba(11, 12, 15, ${alpha})` : `rgba(240, 237, 230, ${alpha})`;
          ctx.fillText(item.text, lx + dir * 7, ly);
        }
      }

      if (!reduceMotion) {
        rafHeroId = requestAnimationFrame(renderFrame);
      }
    }

    rafHeroId = requestAnimationFrame(renderFrame);
  }

  /* ===== 3. INTERACTIVE ARCHITECTURE STAGE (PORTFOLIO-V1 HOVER LIST + DOUBLE BEZEL) ===== */
  function selectPillar(idx) {
    const data = PILLAR_STAGES[idx];
    if (!data) return;
    activePillarIndex = idx;

    document.querySelectorAll('.arch-row').forEach((row, i) => {
      row.classList.toggle('active', i === idx);
    });

    const elIndex = document.getElementById('stage-kicker');
    const elMetric = document.getElementById('stage-metric');
    const elBeforeT = document.getElementById('stage-before-title');
    const elBeforeC = document.getElementById('stage-before-code');
    const elAfterT = document.getElementById('stage-after-title');
    const elAfterC = document.getElementById('stage-after-code');
    const elNote = document.getElementById('stage-note');

    if (elIndex) elIndex.textContent = `${data.index} · ${data.label}`;
    if (elMetric) elMetric.textContent = data.metric;
    if (elBeforeT) elBeforeT.textContent = data.beforeTitle;
    if (elBeforeC) elBeforeC.textContent = data.beforeCode;
    if (elAfterT) elAfterT.textContent = data.afterTitle;
    if (elAfterC) elAfterC.textContent = data.afterCode;
    if (elNote) elNote.textContent = data.note;
  }

  /* ===== 4. MAGNETIC CTA BUTTONS (O JEITO AGI) ===== */
  function initMagneticButtons() {
    if (reduceMotion) return;
    document.querySelectorAll('[data-magnetic]').forEach((btn) => {
      if (btn.dataset.magBound) return;
      btn.dataset.magBound = '1';
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) * 0.16;
        const dy = (e.clientY - (rect.top + rect.height / 2)) * 0.22;
        btn.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate3d(0, 0, 0)';
      });
    });
  }

  /* ===== 5. GSAP + SCROLLTRIGGER + LENIS CHOREOGRAPHY ===== */
  function initHomeChoreography() {
    if (!polarityBound) {
      polarityBound = true;
      window.addEventListener('scroll', syncHeaderTheme, { passive: true });
      window.addEventListener('resize', syncHeaderTheme, { passive: true });
    }
    syncHeaderTheme();
    selectPillar(activePillarIndex);
    initMagneticButtons();
    startHeroCanvas();

    // Animate strikethrough manifesto & Big Number (works both with GSAP ScrollTrigger and IntersectionObserver fallback)
    const strikeItems = Array.from(document.querySelectorAll('.strike-line'));
    const bigNumEl = document.getElementById('big-num-counter');

    if (reduceMotion) {
      strikeItems.forEach((el) => el.classList.add('struck'));
      if (bigNumEl) bigNumEl.textContent = '-59,9%';
      return;
    }

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined' && !scrollTriggersBuilt) {
      scrollTriggersBuilt = true;
      gsap.registerPlugin(ScrollTrigger);

      if (typeof Lenis !== 'undefined' && !lenis) {
        lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
        lenis.on('scroll', () => {
          ScrollTrigger.update();
          syncHeaderTheme();
        });
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }

      if (strikeItems.length) {
        ScrollTrigger.create({
          trigger: '.manifesto-act',
          start: 'top 72%',
          once: true,
          onEnter: () => {
            strikeItems.forEach((el, i) => {
              gsap.to(el, {
                '--strike': 1,
                duration: 0.55,
                delay: i * 0.14,
                ease: 'expo.out',
                onStart: () => el.classList.add('struck'),
              });
            });
          },
        });
      }

      if (bigNumEl) {
        const counter = { val: 0 };
        ScrollTrigger.create({
          trigger: bigNumEl,
          start: 'top 82%',
          once: true,
          onEnter: () => {
            gsap.to(counter, {
              val: 59.9,
              duration: 1.5,
              ease: 'power3.out',
              onUpdate: () => {
                bigNumEl.textContent = `-${counter.val.toFixed(1).replace('.', ',')}%`;
              },
            });
          },
        });
      }
    } else if (strikeItems.length) {
      // Zero-dependency IntersectionObserver fallback
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            strikeItems.forEach((el, i) => setTimeout(() => el.classList.add('struck'), i * 130));
            io.disconnect();
          }
        });
      }, { threshold: 0.25 });
      const act = document.querySelector('.manifesto-act');
      if (act) io.observe(act);
    }
  }

  function onRouteChange(page) {
    if (page === 'home') {
      setTimeout(() => {
        initHomeChoreography();
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      }, 40);
    } else {
      if (rafHeroId) {
        cancelAnimationFrame(rafHeroId);
        rafHeroId = null;
      }
      syncHeaderTheme();
    }
  }

  window.TokLangMotion = {
    onRouteChange,
    selectPillar,
    syncHeaderTheme,
  };
  window.selectArchPillar = selectPillar;
})();
