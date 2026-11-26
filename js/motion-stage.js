/* ============================================================================
   TOKLANG v2.1 — MOTION, 3D SCULPTURE INERTIA, CAD SVG & PINNED STATE MACHINE
   - Precision Horological CAD Orbital Canvas (60fps, zero heavy WebGL)
   - Inertial 3D mouse tilt & scroll parallax on the opaque PBR hero monolith
   - Architectural CAD SVG pathLength="1" draw on scroll
   - Desktop GSAP ScrollTrigger pin: true discrete 4-state machine on Act 2
   - Vertical Chapter Rail + elementsFromPoint() header polarity sensing
   ============================================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lenis = null;
  let rafHeroId = null;
  let polarityBound = false;
  let scrollTriggersBuilt = false;
  let activePillarIndex = 0;
  let activeExampleIndex = 0;

  // Empirically verified outputs from TokLangEngine.compile() (js-tiktoken:o200k_base)
  const PROMPT_EXAMPLES = [
    {
      title: '01 · Prompt Dev + Negações Críticas',
      modeBadge: 'balanced · phatic_strip',
      mode: 'balanced',
      query: '',
      budget: '',
      beforeToks: '60 tokens BPE',
      afterToks: '40 tokens BPE (-33,3%)',
      flops: '-55,6%',
      invariant: 'Polarity Lock 100%',
      note: 'Ruído fático removido; negações (sem, não, nunca) e nomes técnicos preservados intactos.',
      before: 'Bom dia! Por favor, você poderia criar uma API REST em Node.js com Express com o objetivo de gerenciar pedidos de clientes sem usar ORM? É importante ressaltar que você não deve expor credenciais nos logs e nunca permita exclusão física no banco de dados. Muito obrigado desde já!',
      after: 'Criar uma API REST em Node.js com Express para gerenciar pedidos de clientes sem usar ORM? Você não deve expor credenciais nos logs e nunca permita exclusão física no banco de dados.',
    },
    {
      title: '02 · JSON / MCP Tool Output (Lossless)',
      modeBadge: 'lossless · structural_tabular',
      mode: 'lossless',
      query: '',
      budget: '',
      beforeToks: '272 tokens BPE',
      afterToks: '101 tokens BPE (-62,9%)',
      flops: '-86,2%',
      invariant: 'Roundtrip 100% Lossless',
      note: 'Schema elevado uma única vez em @table. decodeStructured() restaura o JSON original bit-a-bit.',
      before: JSON.stringify({
        orders: [
          { id: 'ORD-101', customer: 'Ana Silva', plan: 'pro', amount_brl: 35.0, paid: true },
          { id: 'ORD-102', customer: 'Bruno Costa', plan: 'team', amount_brl: 80.0, paid: true },
          { id: 'ORD-103', customer: 'Carla Dias', plan: 'starter', amount_brl: 10.0, paid: false },
          { id: 'ORD-104', customer: 'Diego Lima', plan: 'pro', amount_brl: 35.0, paid: true },
          { id: 'ORD-105', customer: 'Elena Souza', plan: 'team', amount_brl: 80.0, paid: true },
          { id: 'ORD-106', customer: 'Felipe Rocha', plan: 'pro', amount_brl: 35.0, paid: true },
        ],
      }, null, 2),
      after: `@table orders[6]{id,customer,plan,amount_brl,paid}:
ORD-101|Ana Silva|pro|35|true
ORD-102|Bruno Costa|team|80|true
ORD-103|Carla Dias|starter|10|false
ORD-104|Diego Lima|pro|35|true
ORD-105|Elena Souza|team|80|true
ORD-106|Felipe Rocha|pro|35|true`,
    },
    {
      title: '03 · Contexto RAG + Query BM25 (teto 60 tokens)',
      modeBadge: 'balanced · extractive_bm25',
      mode: 'balanced',
      query: 'quórum Raft split-brain líder',
      budget: '60',
      beforeToks: '150 tokens BPE',
      afterToks: '48 tokens BPE (-68,0%)',
      flops: '-89,8%',
      invariant: 'Cláusula + Quórum preservados',
      note: 'Evicção por menor prioridade em BPE exato elimina ruído administrativo e retém 100% da especificação Raft.',
      before: [
        'Seção 1 — Rotinas administrativas: o calendário mensal de reservas das salas de reunião do segundo andar é fechado toda sexta-feira às 17h pela recepção corporativa.',
        'Seção 2 — Suprimentos e infraestrutura predial: a manutenção preventiva do ar-condicionado dos blocos operacionais ocorre no primeiro sábado de cada mês sem impacto nos sistemas.',
        'Seção 3 — Especificação de Consenso Raft: o quórum mínimo exige floor(N/2)+1 nós ativos para eleição de líder; nunca permita escrita sem líder confirmado no termo corrente para evitar split-brain.',
        'Seção 4 — Comunicação interna: comunicados de eventos institucionais e refeitório são publicados semanalmente na intranet de operações.',
      ].join('\n\n'),
      after: 'Seção 3 — Especificação de Consenso Raft: o quórum mínimo exige floor(N/2)+1 nós ativos para eleição de líder; nunca permita escrita sem líder confirmado no termo corrente para evitar split-brain.',
    },
    {
      title: '04 · SQL Verbatim + Amostra JSON Embutida',
      modeBadge: 'balanced · structural_tabular + phatic_strip',
      mode: 'balanced',
      query: '',
      budget: '',
      beforeToks: '189 tokens BPE',
      afterToks: '101 tokens BPE (-46,6%)',
      flops: '-71,4%',
      invariant: 'SQL 100% Verbatim + @table',
      note: 'Bloco ```sql``` protegido atomicamente enquanto o texto perde preenchimento fático e o JSON vira @table.',
      before: [
        'Olá! Por favor, vale destacar que você precisa revisar a consulta SQL abaixo com o objetivo de melhorar performance sem remover o filtro de tenant_id e não usar SELECT *:',
        '```sql\nSELECT tenant_id, SUM(amount) AS total\nFROM ledger\nWHERE status != \'cancelled\'\nGROUP BY tenant_id;\n```',
        JSON.stringify({
          sample: [
            { tenant_id: 'org_01', total: 4200, rows: 140 },
            { tenant_id: 'org_02', total: 5100, rows: 195 },
            { tenant_id: 'org_03', total: 2900, rows: 88 },
            { tenant_id: 'org_04', total: 6450, rows: 230 },
          ],
        }, null, 2),
      ].join('\n\n'),
      after: `Você precisa revisar a consulta SQL abaixo para melhorar performance sem remover o filtro de tenant_id e não usar SELECT *:

\`\`\`sql
SELECT tenant_id, SUM(amount) AS total
FROM ledger
WHERE status != 'cancelled'
GROUP BY tenant_id;
\`\`\`

@table sample[4]{tenant_id,total,rows}:
org_01|4200|140
org_02|5100|195
org_03|2900|88
org_04|6450|230`,
    },
    {
      title: '05 · Logs Repetitivos de Produção (16 linhas)',
      modeBadge: 'lossless · log_folding',
      mode: 'lossless',
      query: '',
      budget: '',
      beforeToks: '434 tokens BPE',
      afterToks: '87 tokens BPE (-80,0%)',
      flops: '-96,0%',
      invariant: 'Dobramento exato [x14]',
      note: 'Rajadas idênticas de erro são dobradas com marcador [x14], preservando timestamp inicial e erro final.',
      before: [
        '2026-11-26T14:00:01Z INFO api-gateway listening on 0.0.0.0:8080',
        ...Array.from({ length: 14 }, () => '2026-11-26T14:00:02Z WARN redis_pool timeout retrying replica-02 (1200ms)'),
        '2026-11-26T14:00:06Z ERROR circuit_breaker opened for billing_service after 14 retries',
      ].join('\n'),
      after: `2026-11-26T14:00:01Z INFO api-gateway listening on 0.0.0.0:8080
2026-11-26T14:00:02Z WARN redis_pool timeout retrying replica-02 (1200ms) [x14]
2026-11-26T14:00:06Z ERROR circuit_breaker opened for billing_service after 14 retries`,
    },
    {
      title: '06 · Notação DSL Limpa (Modo Notation)',
      modeBadge: 'notation · notation_dsl',
      mode: 'notation',
      query: '',
      budget: '',
      beforeToks: '31 tokens BPE',
      afterToks: '20 tokens BPE (-35,5%)',
      flops: '-58,4%',
      invariant: 'Polarity Lock 100% · expand()',
      note: 'Shorthand limpo sem esqueletos consonantais; preservou "sem ORM" e expande de volta em texto natural.',
      before: 'Bom dia! Por favor cria um script Python usando FastAPI para validar webhooks Stripe sem ORM pronto para produção com tipagem e comentários. Obrigado!',
      after: 'cr $py @fastapi #scr; validar webhooks Stripe sem ORM; prd cm typ',
    },
  ];

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

  /* ===== 1. HEADER POLARITY & CHAPTER RAIL SYNC (elementsFromPoint) ===== */
  let polarityRaf = false;
  function syncHeaderTheme() {
    if (polarityRaf) return;
    polarityRaf = true;
    requestAnimationFrame(() => {
      polarityRaf = false;
      if (document.documentElement.classList.contains('light-theme')) {
        document.body.dataset.hdrTheme = 'light';
      } else {
        const hdr = document.querySelector('[data-hdr]');
        if (hdr) {
          const probeY = Math.min(window.innerHeight - 10, hdr.getBoundingClientRect().bottom + 4);
          const hits = document.elementsFromPoint ? document.elementsFromPoint(window.innerWidth / 2, probeY) : [];
          const match = hits.find((el) => !el.closest('[data-hdr]') && el.closest('[data-theme]'));
          document.body.dataset.hdrTheme = (match && match.closest('[data-theme]').dataset.theme) || 'dark';
        }
      }

      // Sync active chapter on left vertical rail
      const midHits = document.elementsFromPoint ? document.elementsFromPoint(window.innerWidth / 2, window.innerHeight * 0.45) : [];
      const chapEl = midHits.find((el) => el.closest && el.closest('section[data-chapter]'));
      if (chapEl) {
        const id = chapEl.closest('section[data-chapter]').dataset.chapter;
        document.querySelectorAll('.rail-item').forEach((btn) => {
          btn.classList.toggle('active', btn.dataset.chapter === id);
        });
      }
    });
  }

  /* ===== 2. PRECISION CAD ORBITAL CANVAS + 3D SCULPTURE INERTIA ===== */
  function startHeroStage() {
    if (rafHeroId) {
      cancelAnimationFrame(rafHeroId);
      rafHeroId = null;
    }

    const canvas = document.getElementById('toklang-hero-canvas');
    const sculpture = document.getElementById('hero-sculpture-stage');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;
    const EMBER_COUNT = isMobile ? 42 : 96;
    const embers = new Float32Array(EMBER_COUNT * 4); // angle, radiusFactor, speed, size
    for (let i = 0; i < EMBER_COUNT; i++) {
      embers[i * 4 + 0] = Math.random() * Math.PI * 2;
      embers[i * 4 + 1] = 0.72 + Math.random() * 0.72;
      embers[i * 4 + 2] = (Math.random() * 0.14 + 0.04) * (i % 2 === 0 ? 1 : -1);
      embers[i * 4 + 3] = 1.0 + Math.random() * 1.4;
    }

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

    let targetNx = 0;
    let targetNy = 0;
    let curNx = 0;
    let curNy = 0;

    const onPointerMove = (e) => {
      targetNx = (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      targetNy = (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    function renderFrame(ts) {
      const homeActive = document.getElementById('page-home')?.classList.contains('active');
      if (!homeActive) {
        rafHeroId = null;
        return;
      }

      const t = ts * 0.001;
      const scrollRatio = Math.min(1, Math.max(0, window.scrollY / Math.max(1, window.innerHeight * 0.9)));

      curNx += (targetNx - curNx) * 0.06;
      curNy += (targetNy - curNy) * 0.06;

      // Inertial 3D parallax tilt + breathing hover on the opaque PBR monolith
      if (sculpture && !reduceMotion) {
        const floatY = Math.sin(t * 1.15) * 6;
        const rotY = curNx * 11;
        const rotX = -curNy * 8;
        const tx = curNx * 12;
        const ty = curNy * 8 + floatY - scrollRatio * 28;
        const sc = 1 - scrollRatio * 0.07;
        sculpture.style.transform = `translate(-50%, -50%) translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) perspective(1100px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(${sc.toFixed(3)})`;
      }

      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * (isMobile ? 0.36 : 0.43);
      const baseR = Math.min(width, height) * (isMobile ? 0.34 : 0.31);
      const isLight = document.documentElement.classList.contains('light-theme');

      // 1. Precision Outer Degree Meridian Ring (Horological Instrument Aesthetic)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.045 + curNx * 0.08);
      ctx.strokeStyle = isLight ? 'rgba(11, 12, 15, 0.14)' : 'rgba(200, 181, 96, 0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 1.12, 0, Math.PI * 2);
      ctx.stroke();

      // 72 Precision Degree Ticks around perimeter
      const ticks = 72;
      for (let i = 0; i < ticks; i++) {
        const a = (i / ticks) * Math.PI * 2;
        const major = i % 6 === 0;
        const r0 = baseR * (major ? 1.07 : 1.10);
        const r1 = baseR * 1.14;
        ctx.strokeStyle = major
          ? (isLight ? 'rgba(201, 70, 27, 0.45)' : 'rgba(224, 90, 43, 0.55)')
          : (isLight ? 'rgba(11, 12, 15, 0.14)' : 'rgba(240, 237, 230, 0.16)');
        ctx.lineWidth = major ? 1.2 : 0.8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Counter-rotating Dashed Copper Inner Arc
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-t * 0.09);
      ctx.setLineDash([28, 18, 6, 18]);
      ctx.strokeStyle = isLight ? 'rgba(201, 70, 27, 0.28)' : 'rgba(224, 90, 43, 0.34)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(0, 0, baseR * 0.92, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 3. Subtle Volumetric Copper/Gold Orbiting Embers
      for (let i = 0; i < EMBER_COUNT; i++) {
        const a = embers[i * 4 + 0] + t * embers[i * 4 + 2];
        const rf = embers[i * 4 + 1];
        const sz = embers[i * 4 + 3];
        const ex = cx + Math.cos(a) * baseR * rf * 1.25;
        const ey = cy + Math.sin(a) * baseR * rf * 0.92;
        const alpha = 0.16 + 0.34 * (0.5 + 0.5 * Math.sin(t * 1.4 + i));
        ctx.fillStyle = i % 3 === 0
          ? `rgba(224, 90, 43, ${alpha})`
          : (isLight ? `rgba(11, 12, 15, ${alpha * 0.45})` : `rgba(200, 181, 96, ${alpha * 0.8})`);
        ctx.fillRect(ex, ey, sz, sz);
      }

      // 4. Peripheral Technical Coordinates (strictly outside center safe-zone, desktop only)
      if (!isMobile && width >= 1024) {
        const callouts = [
          { angle: -0.58, text: 'o200k_base', color: '#C8B560' },
          { angle: 0.55, text: '@table -59.9%', color: '#E05A2B' },
          { angle: Math.PI - 0.58, text: 'CAPC SHA-256', color: '#3B8EA5' },
        ];
        ctx.font = '600 10px "JetBrains Mono", monospace';
        ctx.textBaseline = 'middle';
        for (const c of callouts) {
          const px = cx + Math.cos(c.angle) * baseR * 1.14;
          const py = cy + Math.sin(c.angle) * baseR * 1.14;
          const dir = px >= cx ? 1 : -1;
          const lx = px + dir * 32;
          ctx.strokeStyle = isLight ? 'rgba(11, 12, 15, 0.28)' : 'rgba(240, 237, 230, 0.25)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(lx, py);
          ctx.stroke();

          ctx.fillStyle = c.color;
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();

          ctx.textAlign = dir > 0 ? 'left' : 'right';
          ctx.fillStyle = isLight ? 'rgba(11, 12, 15, 0.72)' : 'rgba(240, 237, 230, 0.68)';
          ctx.fillText(c.text, lx + dir * 7, py);
        }
      }

      if (!reduceMotion) {
        rafHeroId = requestAnimationFrame(renderFrame);
      }
    }

    rafHeroId = requestAnimationFrame(renderFrame);
  }

  /* ===== 3. INTERACTIVE ARCHITECTURE STAGE (DISCRETE 4-STATE MACHINE) ===== */
  function selectPillar(idx) {
    const data = PILLAR_STAGES[idx];
    if (!data) return;
    activePillarIndex = idx;

    document.querySelectorAll('.arch-row').forEach((row, i) => {
      row.classList.toggle('active', i === idx);
    });
    document.querySelectorAll('.step-dash').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });
    const counterEl = document.getElementById('arch-step-counter');
    if (counterEl) counterEl.textContent = `0${idx + 1} / 04`;

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
    selectPromptExample(activeExampleIndex);
    initMagneticButtons();
    startHeroStage();

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
        lenis = new Lenis({ lerp: 0.088, smoothWheel: true });
        lenis.on('scroll', () => {
          ScrollTrigger.update();
          syncHeaderTheme();
        });
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }

      // Act 1: Animated Copper Strikethrough Manifesto
      if (strikeItems.length) {
        ScrollTrigger.create({
          trigger: '.manifesto-act',
          start: 'top 74%',
          once: true,
          onEnter: () => {
            strikeItems.forEach((el, i) => {
              gsap.to(el, {
                '--strike': 1,
                duration: 0.55,
                delay: i * 0.13,
                ease: 'expo.out',
                onStart: () => el.classList.add('struck'),
              });
            });
          },
        });
      }

      // Act 1.5: CAD SVG Blueprint pathLength="1" Structural Draw
      const cadBoxes = document.querySelectorAll('#cad-pipeline-svg .cad-box');
      const cadLinks = document.querySelectorAll('#cad-pipeline-svg .cad-link');
      const cadDims = document.querySelectorAll('#cad-pipeline-svg .cad-dim');
      if (cadBoxes.length) {
        gsap.set([...cadBoxes, ...cadLinks, ...cadDims], { strokeDashoffset: 1 });
        ScrollTrigger.create({
          trigger: '.cad-act',
          start: 'top 76%',
          once: true,
          onEnter: () => {
            const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
            tl.to(cadBoxes, { strokeDashoffset: 0, duration: 0.55, stagger: 0.09 })
              .to(cadLinks, { strokeDashoffset: 0, duration: 0.35, stagger: 0.07 }, '-=0.32')
              .to(cadDims, { strokeDashoffset: 0, duration: 0.5, stagger: 0.1 }, '-=0.25');
          },
        });
      }

      // Act 2: Desktop Pinned Discrete 4-State Machine (Math.floor(progress * 4))
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1025px) and (prefers-reduced-motion: no-preference)', () => {
        const archAct = document.querySelector('.arch-act');
        if (!archAct) return;
        let lastStep = -1;
        ScrollTrigger.create({
          trigger: archAct,
          start: 'top top',
          end: '+=145%',
          pin: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            const step = Math.min(3, Math.floor(self.progress * 4));
            if (step !== lastStep) {
              lastStep = step;
              selectPillar(step);
            }
          },
        });
      });

      // Act 3: Monumental Big Number Count-Up
      if (bigNumEl) {
        const counter = { val: 0 };
        ScrollTrigger.create({
          trigger: bigNumEl,
          start: 'top 84%',
          once: true,
          onEnter: () => {
            gsap.to(counter, {
              val: 59.9,
              duration: 1.45,
              ease: 'power3.out',
              onUpdate: () => {
                bigNumEl.textContent = `-${counter.val.toFixed(1).replace('.', ',')}%`;
              },
            });
          },
        });
      }
    } else if (strikeItems.length) {
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

  function scrollToAct(id) {
    const target = document.getElementById(id);
    if (!target) return;
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.1 });
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function onRouteChange(page) {
    const rail = document.getElementById('chapter-rail');
    if (rail) rail.style.display = page === 'home' ? '' : 'none';

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

  function selectPromptExample(idx) {
    const ex = PROMPT_EXAMPLES[idx];
    if (!ex) return;
    activeExampleIndex = idx;

    document.querySelectorAll('.ex-tab').forEach((btn, i) => {
      btn.classList.toggle('active', i === idx);
    });

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('ex-stage-title', ex.title);
    set('ex-stage-mode', ex.modeBadge);
    set('ex-before-toks', ex.beforeToks);
    set('ex-after-toks', ex.afterToks);
    set('ex-before-text', ex.before);
    set('ex-after-text', ex.after);
    set('ex-foot-flops', ex.flops);
    set('ex-foot-inv', ex.invariant);
    set('ex-foot-note', ex.note);
  }

  function openActiveExampleInWorkbench() {
    const ex = PROMPT_EXAMPLES[activeExampleIndex] || PROMPT_EXAMPLES[0];
    if (!ex || typeof navigate !== 'function') return;
    navigate('app');
    setTimeout(() => {
      const ta = document.getElementById('app-input');
      const modeEl = document.getElementById('app-mode');
      const queryEl = document.getElementById('app-query');
      const budgetEl = document.getElementById('app-budget');
      if (ta) ta.value = ex.before;
      if (modeEl) modeEl.value = ex.mode;
      if (queryEl) queryEl.value = ex.query;
      if (budgetEl) budgetEl.value = ex.budget;
      if (typeof onInputChange === 'function') onInputChange();
      if (typeof doCompress === 'function') doCompress();
    }, 120);
  }

  window.TokLangMotion = {
    onRouteChange,
    selectPillar,
    selectPromptExample,
    syncHeaderTheme,
  };
  window.selectArchPillar = selectPillar;
  window.selectPromptExample = selectPromptExample;
  window.openActiveExampleInWorkbench = openActiveExampleInWorkbench;
  window.scrollToAct = scrollToAct;
})();
