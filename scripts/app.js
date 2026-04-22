/**
 * scripts/app.js
 *
 * Main application: state management, UI wiring, sidebar behaviour,
 * generate/print actions, and initialisation.
 *
 * Depends on (must be loaded first):
 *   scripts/config/levels.js
 *   scripts/config/variations.js
 *   scripts/worksheets/ws-3a3i.js
 *   scripts/worksheets/ws-2a8.js
 *   scripts/worksheets/ws-4a121.js
 *   scripts/worksheets/ws-4a.js
 *   scripts/generators/question-pool.js
 *   scripts/generators/worksheet-builder.js
 *   scripts/admin/order-manager.js
 */
(function () {

  /* ── Application State ─────────────────────────────────────── */

  let currentSection  = '3A3I';
  let currentType     = 'A';
  let combineTypes    = false;
  let sidebarMinimized = false;
  let isSidebarResizing = false;
  let lastAutoLevel   = '3A3I';
  let currentPool     = [];    // Last generated 50-question pool

  const SIDEBAR_MIN_WIDTH = 250;
  const SIDEBAR_MAX_WIDTH = 640;
  const ALL_TYPES         = ['A', 'B', 'C', 'D'];
  const POOL_SIZE         = 50;

  const WORKSHEET_LEVELS = (
    typeof window.WORKSHEET_LEVELS_CONFIG === 'object' && window.WORKSHEET_LEVELS_CONFIG
  ) ? window.WORKSHEET_LEVELS_CONFIG : {};

  const VARIATIONS = (
    typeof window.WORKSHEET_VARIATIONS === 'object' && window.WORKSHEET_VARIATIONS
  ) ? window.WORKSHEET_VARIATIONS : {};

  const traceImageUrlCache = {};

  /* ── Type helpers ──────────────────────────────────────────── */

  function is4ATraceType(t) { return /^4A(10|[1-9])$/.test(String(t || '').trim()); }

  function getTraceNumber() {
    if (!is4ATraceType(currentType)) return null;
    return window.WORKSHEET_4A?.getTraceNumberFromType?.(currentType) ?? null;
  }

  /* ── Sidebar resize ────────────────────────────────────────── */

  function setSidebarWidth(px) {
    const sidebar   = document.querySelector('.sidebar');
    const container = document.querySelector('.container');
    if (!sidebar || !container) return;
    const w = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, Math.round(px)));
    container.style.setProperty('--sidebar-width', `${w}px`);
    sidebar.style.width    = `${w}px`;
    sidebar.style.minWidth = `${w}px`;
  }

  function startSidebarResize(e) {
    if (sidebarMinimized || window.innerWidth <= 1100) return;
    isSidebarResizing = true;
    document.getElementById('sidebarResizer')?.classList.add('dragging');
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  }

  function moveSidebarResize(e) {
    if (!isSidebarResizing) return;
    const rect = document.querySelector('.container')?.getBoundingClientRect();
    if (rect) setSidebarWidth(e.clientX - rect.left);
  }

  function stopSidebarResize() {
    if (!isSidebarResizing) return;
    isSidebarResizing = false;
    document.getElementById('sidebarResizer')?.classList.remove('dragging');
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
  }

  function initializeSidebarResize() {
    document.getElementById('sidebarResizer')?.addEventListener('mousedown', startSidebarResize);
    window.addEventListener('mousemove', moveSidebarResize);
    window.addEventListener('mouseup',   stopSidebarResize);
  }

  /* ── Sidebar toggle ────────────────────────────────────────── */

  function toggleSidebar(forceState) {
    const container  = document.querySelector('.container');
    const btn        = document.getElementById('btnSidebarToggle');
    const restoreBtn = document.getElementById('btnSidebarRestore');
    if (!container) return;

    sidebarMinimized = typeof forceState === 'boolean' ? forceState : !sidebarMinimized;
    container.classList.toggle('sidebar-collapsed', sidebarMinimized);

    const label = sidebarMinimized ? 'Show Sidebar' : 'Minimize Sidebar';
    if (btn) { btn.textContent = sidebarMinimized ? '▶' : '◀'; btn.setAttribute('title', label); btn.setAttribute('aria-label', label); }
    if (restoreBtn) { restoreBtn.textContent = '▶'; restoreBtn.setAttribute('title', 'Show Sidebar'); restoreBtn.setAttribute('aria-label', 'Show Sidebar'); }

    if (!sidebarMinimized) {
      const sidebar = document.querySelector('.sidebar');
      const fw = parseInt(sidebar?.style.width || sidebar?.offsetWidth || 300, 10);
      if (Number.isFinite(fw)) setSidebarWidth(fw);
    }
  }

  /* ── Search filter ─────────────────────────────────────────── */

  function normalizeSearch(v) { return String(v ?? '').trim().toLowerCase(); }

  function applyWorksheetSearchFilter() {
    const query    = normalizeSearch(document.getElementById('worksheetSearch')?.value);
    const hasQuery = query.length > 0;
    let   sectionHits = 0, typeHits = 0;

    document.querySelectorAll('#sectionGrid .section-btn').forEach(btn => {
      const match = !hasQuery || normalizeSearch(btn.textContent).includes(query);
      btn.classList.toggle('search-hidden', !match);
      if (match) sectionHits++;
    });

    document.querySelectorAll('.type-card').forEach(card => {
      const match = !hasQuery ||
        normalizeSearch(card.textContent).includes(query) ||
        `type ${normalizeSearch(card.dataset.type)}`.includes(query);
      card.classList.toggle('search-hidden', !match);
      if (match) typeHits++;
    });

    ['card3A3I', 'card2A8', 'card4A121', 'card4A'].forEach(id => {
      const card = document.getElementById(id);
      if (!card) return;
      card.classList.toggle('search-hidden', hasQuery && !card.querySelectorAll('.type-card:not(.search-hidden)').length);
    });

    const emptyEl = document.getElementById('worksheetSearchEmpty');
    if (emptyEl) emptyEl.classList.toggle('is-hidden', !hasQuery || sectionHits > 0 || typeHits > 0);
  }

  /* ── Level field sync ──────────────────────────────────────── */

  function getConfiguredLevel(sectionName) {
    const lvls = WORKSHEET_LEVELS.sectionLevels;
    if (!lvls) return sectionName;
    const raw = lvls[sectionName];
    return (typeof raw === 'string' && raw.trim()) ? raw.trim() : sectionName;
  }

  function syncLevelField(sectionName, force) {
    const el = document.getElementById('wsLevel');
    if (!el) return;
    const current = (el.value || '').trim();
    const configured = getConfiguredLevel(sectionName);
    if (force || !current || current === lastAutoLevel) {
      el.value = configured;
      lastAutoLevel = configured;
    }
  }

  /* ── Section UI ────────────────────────────────────────────── */

  function setActiveSectionButton(name) {
    document.querySelectorAll('.section-btn').forEach(btn =>
      btn.classList.toggle('active', btn.textContent.trim() === name)
    );
  }

  function updateSectionUI() {
    const is3A3I  = currentSection === '3A3I';
    const is2A8   = currentSection === '2A8';
    const is4A121 = currentSection === '4A121';
    const is4A    = currentSection === '4A';

    const toggleCard = (id, show) => document.getElementById(id)?.classList.toggle('is-hidden', !show);
    toggleCard('card3A3I',  is3A3I);
    toggleCard('card2A8',   is2A8);
    toggleCard('card4A121', is4A121);
    toggleCard('card4A',    is4A);

    const cardNR = document.getElementById('cardNumberRange');
    if (cardNR) cardNR.classList.toggle('is-hidden', is2A8 || is4A121 || is4A);

    const combineBtn       = document.getElementById('btnCombine');
    const headerCombineBtn = document.getElementById('btnHeaderCombine');
    if (combineBtn)       combineBtn.classList.toggle('is-hidden', !is3A3I);
    if (headerCombineBtn) headerCombineBtn.classList.toggle('is-hidden', !is3A3I);

    document.querySelectorAll('.type-e-only').forEach(el => el.classList.toggle('is-hidden', !is2A8));
    document.querySelectorAll('.type-f-only').forEach(el => el.classList.toggle('is-hidden', !is4A121));
    document.querySelectorAll('.type-4a-only').forEach(el => el.classList.toggle('is-hidden', !is4A));

    const showBlank = is3A3I && (combineTypes || currentType === 'B' || currentType === 'D' || currentType === 'C' || currentType === 'J');
    document.querySelectorAll('.non-4a-control').forEach(el => el.classList.toggle('is-hidden', !showBlank));

    if (is4A121) normalize4A121GridInputs();

    render4AImageInputFields();
    applyWorksheetSearchFilter();
    syncQuestionCountControl();
  }

  /* ── Question count control ────────────────────────────────── */

  function getEnforcedQuestionCount() {
    if (currentSection === '4A' && is4ATraceType(currentType)) return 2;
    if (!combineTypes && currentType === 'F')  return 1;
    if (!combineTypes && currentType.startsWith('F') && currentSection === '4A121') return 1;
    if (!combineTypes && currentType === 'E')  return 16;
    if (!combineTypes && currentType.startsWith('E') && currentSection === '2A8') return 16;
    return null;
  }

  function syncQuestionCountControl() {
    const el = document.getElementById('totalQ');
    if (!el) return;
    const enforced = getEnforcedQuestionCount();
    if (enforced !== null) {
      el.value = enforced; el.min = enforced; el.max = enforced;
      el.readOnly = true; el.style.cursor = 'not-allowed';
      return;
    }
    const limited = currentSection === '3A3I' && ['A','B','C','D','E','F','G','H','I','J'].includes(currentType) && !combineTypes;
    if (limited) {
      el.min = 1; el.max = 2; el.readOnly = false; el.style.cursor = '';
      el.value = Math.max(1, Math.min(2, parseInt(el.value, 10) || 2));
      return;
    }
    el.min = 1; el.max = 30; el.readOnly = false; el.style.cursor = '';
  }

  /* ── 4A image fields ───────────────────────────────────────── */

  function sync4AImageCacheFromDOM() {
    const traceNumber = getTraceNumber();
    if (!traceNumber || currentSection !== '4A') return;
    const key = `4A${traceNumber}`;
    if (window.WORKSHEET_4A?.readImageValuesFromDOM) {
      traceImageUrlCache[key] = window.WORKSHEET_4A.readImageValuesFromDOM(
        traceNumber, document.getElementById('traceImageInputs')
      );
    }
  }

  function render4AImageInputFields() {
    const host = document.getElementById('traceImageInputs');
    const hint = document.getElementById('traceImageHint');
    if (!host) return;

    if (currentSection !== '4A' || !is4ATraceType(currentType)) {
      host.innerHTML = '';
      if (hint) hint.textContent = 'Add image URLs for both questions. The selected tracing type controls how many image fields are shown for each question.';
      return;
    }

    const traceNumber = getTraceNumber();
    if (!traceNumber) return;
    const key = `4A${traceNumber}`;
    const cached = Array.isArray(traceImageUrlCache[key]) ? traceImageUrlCache[key] : [];

    if (window.WORKSHEET_4A?.buildImageFieldsHTML) {
      host.innerHTML = window.WORKSHEET_4A.buildImageFieldsHTML(traceNumber, cached);
    } else {
      host.innerHTML = '';
    }

    if (hint) {
      hint.textContent = `Insert ${traceNumber} image URL${traceNumber > 1 ? 's' : ''} for Question 1 and ${traceNumber} image URL${traceNumber > 1 ? 's' : ''} for Question 2.`;
    }
    const qi = document.getElementById('trace4AQCount');
    if (qi) qi.value = 2;

    host.querySelectorAll('.trace-image-url').forEach(inp => {
      inp.addEventListener('input', sync4AImageCacheFromDOM);
      inp.addEventListener('change', sync4AImageCacheFromDOM);
    });
  }

  /* ── 4A121 image grid ──────────────────────────────────────── */

  function parseBoundedInt(raw, fallback, min, max) {
    const p = parseInt(raw, 10);
    if (!Number.isFinite(p)) return fallback;
    return Math.max(min, Math.min(max, p));
  }

  function normalize4A121GridInputs() {
    const countEl  = document.getElementById('imageCount4A121');
    const perRowEl = document.getElementById('imagePerRow4A121');
    if (!countEl || !perRowEl) return;
    const range = window.WORKSHEET_4A121?.getSuitableGridRange?.(perRowEl.value) ?? { perRow: 5, minCount: 1, maxCount: 25 };
    perRowEl.value = range.perRow; perRowEl.min = '1'; perRowEl.max = '8';
    countEl.min = String(range.minCount); countEl.max = String(range.maxCount);
    countEl.value = parseBoundedInt(countEl.value, Math.min(15, range.maxCount), range.minCount, range.maxCount);
  }

  function getSectionImageUrl() {
    const inp = document.getElementById('imageUrl4A121');
    const val = (inp?.value || '').trim();
    if (/^https?:\/\//i.test(val)) return val;
    return window.WORKSHEET_4A121?.getConfiguredImageForSection?.('4A121') || '';
  }

  function getSectionImageGrid() {
    const cfg  = window.WORKSHEET_4A121?.getConfiguredGridForSection?.('4A121') ?? { count: 15, perRow: 5 };
    const range = window.WORKSHEET_4A121?.getSuitableGridRange?.(document.getElementById('imagePerRow4A121')?.value ?? 5) ?? { perRow: 5, minCount: 1, maxCount: 25 };
    return {
      count:  parseBoundedInt(document.getElementById('imageCount4A121')?.value, cfg.count, range.minCount, range.maxCount),
      perRow: range.perRow,
    };
  }

  function initializeSectionImageInputs() {
    const imgInp   = document.getElementById('imageUrl4A121');
    const cntInp   = document.getElementById('imageCount4A121');
    const prInp    = document.getElementById('imagePerRow4A121');
    if (!imgInp || !cntInp || !prInp) return;

    const cfgUrl  = window.WORKSHEET_4A121?.getConfiguredImageForSection?.('4A121') || '';
    const cfgGrid = window.WORKSHEET_4A121?.getConfiguredGridForSection?.('4A121') ?? { count: 15, perRow: 5 };
    if (cfgUrl && !imgInp.value.trim()) imgInp.value = cfgUrl;
    if (!cntInp.value.trim()) cntInp.value = cfgGrid.count;
    if (!prInp.value.trim())  prInp.value  = cfgGrid.perRow;
    normalize4A121GridInputs();
  }

  /* ── Combine button state ──────────────────────────────────── */

  function setCombineState(on) {
    combineTypes = on;
    document.getElementById('btnCombine')?.classList.toggle('active', on);
  }

  /* ── Section/Type selection ────────────────────────────────── */

  function selectSection(el, sectionName) {
    sync4AImageCacheFromDOM();
    document.querySelectorAll('.section-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    currentSection = sectionName;
    setCombineState(false);
    syncLevelField(currentSection);
    updateSectionUI();

    // Pick a default type for the section
    if (sectionName === '3A3I' && !['A','B','C','D','E','F','G','H','I','J'].includes(currentType)) {
      const card = document.querySelector('.type-card[data-type="A"]');
      if (card) selectType(card, 'A');
    } else if (sectionName === '2A8' && !currentType.startsWith('E')) {
      const card = document.querySelector('.type-card[data-type="E"]');
      if (card) selectType(card, 'E');
    } else if (sectionName === '4A121' && !currentType.startsWith('F')) {
      const card = document.querySelector('.type-card[data-type="F"]');
      if (card) selectType(card, 'F');
    } else if (sectionName === '4A' && !is4ATraceType(currentType)) {
      const card = document.querySelector('.type-card[data-type="4A1"]');
      if (card) selectType(card, '4A1');
    }
  }

  function selectType(el, t) {
    sync4AImageCacheFromDOM();
    document.querySelectorAll('.type-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    currentType = t;
    setCombineState(false);

    if (t.startsWith('E'))         currentSection = '2A8';
    else if (t.startsWith('F'))    currentSection = '4A121';
    else if (is4ATraceType(t))     currentSection = '4A';
    else                            currentSection = '3A3I';

    syncLevelField(currentSection);
    setActiveSectionButton(currentSection);
    updateSectionUI();

    const titleEl = document.getElementById('wsTitle');
    if (t.startsWith('E') && titleEl && (!titleEl.value || titleEl.value === 'Write the numbers')) {
      titleEl.value = 'Add';
    } else if (t.startsWith('F') && titleEl && (!titleEl.value || titleEl.value === 'Write the numbers' || titleEl.value === 'Add' || titleEl.value === 'Number Tracing')) {
      titleEl.value = window.WORKSHEET_4A121?.getConfiguredPromptForSection?.('4A121') || 'How many are there? Write the number in the box.';
      initializeSectionImageInputs();
    } else if (is4ATraceType(t)) {
      if (titleEl) titleEl.value = 'Number Tracing';
      const levelEl = document.getElementById('wsLevel');
      const tn = getTraceNumber();
      if (levelEl && tn) { levelEl.value = `4A${tn}`; lastAutoLevel = levelEl.value; }
      render4AImageInputFields();
    }

    syncQuestionCountControl();
  }

  /* ── Generate 50-question pool ─────────────────────────────── */

  function buildPoolOptions() {
    return {
      rangeStart:  parseInt(document.getElementById('rangeStart')?.value, 10) || 31,
      rangeEnd:    parseInt(document.getElementById('rangeEnd')?.value, 10)   || 70,
      perRow:      parseInt(document.getElementById('perRow')?.value, 10)     || 10,
      blankCount:  parseInt(document.getElementById('blankCount')?.value, 10) || 4,
      eqAddend:    parseInt(document.getElementById('eqAddend')?.value, 10)   || 3,
      seedNumbers: window.WORKSHEET_2A8?.parseIntegerList?.(document.getElementById('eqNumberList')?.value) || [],
      imageUrl:    getSectionImageUrl(),
      imageCount:  getSectionImageGrid().count,
      imagePerRow: getSectionImageGrid().perRow,
      imageValues: traceImageUrlCache[`4A${getTraceNumber()}`] || [],
      seed:        Date.now(),
    };
  }

  function generatePool() {
    sync4AImageCacheFromDOM();
    const opts = buildPoolOptions();
    currentPool = window.QUESTION_POOL?.generate(currentSection, currentType, opts) || [];

    // Render admin panel
    const grid = document.getElementById('orderPoolGrid');
    if (grid && window.ORDER_MANAGER) {
      window.ORDER_MANAGER.renderPanel(currentPool, grid);
    }

    return currentPool;
  }

  /* ── Main generate worksheet ───────────────────────────────── */

  function generateWorksheet() {
    syncQuestionCountControl();
    sync4AImageCacheFromDOM();

    const totalInput     = document.getElementById('totalQ');
    const requestedCount = Math.max(1, Math.min(30, parseInt(totalInput?.value, 10) || 4));
    const enforced       = getEnforcedQuestionCount();

    // Generate the 50-question pool; admin may have reordered it
    const pool = generatePool();
    const ordered = window.ORDER_MANAGER?.getOrderedQuestions?.() ?? pool;

    // For standard (non-pool-print) mode, pick first N questions
    const questionsToRender = ordered.slice(0, enforced ?? requestedCount);

    const opts = {
      showName:   document.getElementById('chkName')?.checked ?? true,
      showDate:   document.getElementById('chkDate')?.checked ?? true,
      levelLabel: (document.getElementById('wsLevel')?.value || currentSection).trim(),
      title:      document.getElementById('wsTitle')?.value || 'Write the numbers',
      section:    currentSection,
      variationId: currentType,
      poolMode:   false,
    };

    // Handle combine A+B+C+D for 3A3I
    let html;
    if (combineTypes && currentSection === '3A3I') {
      // Build 4 segments, one per type
      const combineQs = ALL_TYPES.map((t, ti) => ({
        ...pool[ti % pool.length],
        variationId: t,
      }));
      html = window.WORKSHEET_BUILDER?.buildWorksheetHTML(combineQs, { ...opts, variationId: 'A' });
    } else {
      // A4 auto-fit: reduce count if needed
      let fittedCount = questionsToRender.length;
      if (enforced === null && currentSection !== '4A') {
        let testCount = questionsToRender.length;
        while (testCount > 1) {
          const testHtml = window.WORKSHEET_BUILDER?.buildWorksheetHTML(ordered.slice(0, testCount), opts);
          if (testHtml && window.WORKSHEET_BUILDER?.doesFitA4(testHtml)) { fittedCount = testCount; break; }
          testCount--;
        }
        if (testCount !== questionsToRender.length && enforced === null) {
          if (totalInput) totalInput.value = fittedCount;
        }
      }
      html = window.WORKSHEET_BUILDER?.buildWorksheetHTML(ordered.slice(0, fittedCount), opts);
    }

    if (!html) return;

    const area = document.getElementById('previewArea');
    if (area) {
      const emptyState = document.getElementById('emptyState');
      if (emptyState) emptyState.remove();
      area.innerHTML = html;
    }
  }

  /* ── Pool-print mode (50 different pages) ──────────────────── */

  function generatePoolPrint() {
    sync4AImageCacheFromDOM();
    const pool    = generatePool();
    const ordered = window.ORDER_MANAGER?.getOrderedQuestions?.() ?? pool;
    const opts = {
      showName:   document.getElementById('chkName')?.checked  ?? true,
      showDate:   document.getElementById('chkDate')?.checked   ?? true,
      levelLabel: (document.getElementById('wsLevel')?.value || currentSection).trim(),
      title:      document.getElementById('wsTitle')?.value || 'Write the numbers',
      section:    currentSection,
      variationId: currentType,
      poolMode:   true,
    };

    const html = window.WORKSHEET_BUILDER?.buildWorksheetHTML(ordered, opts);
    if (!html) return;

    const area = document.getElementById('previewArea');
    if (area) {
      const emptyState = document.getElementById('emptyState');
      if (emptyState) emptyState.remove();
      area.innerHTML = html;
    }
  }

  /* ── Combine A+B+C+D ───────────────────────────────────────── */

  function generateCombinedWorksheet() {
    if (currentSection !== '3A3I') {
      currentSection = '3A3I';
      syncLevelField(currentSection);
      setActiveSectionButton('3A3I');
      updateSectionUI();
      if (!['A','B','C','D'].includes(currentType)) {
        const card = document.querySelector('.type-card[data-type="A"]');
        if (card) selectType(card, 'A');
      }
    }
    setCombineState(true);
    syncQuestionCountControl();
    generateWorksheet();
  }

  /* ── Print ─────────────────────────────────────────────────── */

  function printWorksheet(exactColors) {
    exactColors = exactColors || false;
    sync4AImageCacheFromDOM();

    const pool    = generatePool();
    const ordered = window.ORDER_MANAGER?.getOrderedQuestions?.() ?? pool;
    const enforced = getEnforcedQuestionCount();
    const count   = enforced ?? Math.max(1, Math.min(30, parseInt(document.getElementById('totalQ')?.value, 10) || 4));

    const opts = {
      showName:   document.getElementById('chkName')?.checked  ?? true,
      showDate:   document.getElementById('chkDate')?.checked   ?? true,
      levelLabel: (document.getElementById('wsLevel')?.value || currentSection).trim(),
      title:      document.getElementById('wsTitle')?.value || 'Write the numbers',
      section:    currentSection,
      variationId: currentType,
      poolMode:   false,
    };

    const html = window.WORKSHEET_BUILDER?.buildWorksheetHTML(ordered.slice(0, count), opts);
    if (!html) { alert('Please generate a worksheet first.'); return; }

    // Build all CSS link tags to include in the print popup
    const cssLinks = [
      'styles/base.css',
      'styles/layout.css',
      'styles/sidebar.css',
      'styles/worksheet.css',
      'styles/components/num-box.css',
      'styles/components/equation.css',
      'styles/components/image-question.css',
      'styles/components/trace4a.css',
      'styles/print.css',
    ].map(href => `<link rel="stylesheet" href="${href}"/>`).join('\n');

    const exactColorCSS = exactColors ? `
      <style>
        html, body, * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      </style>` : '';

    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { alert('Pop-up blocked. Please allow pop-ups for this page.'); return; }
    w.document.write(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<title>Worksheet</title>
${cssLinks}
${exactColorCSS}
<style>
  @page { size: A4; margin: 0; }
  body { background: white; margin: 0; }
  .preview-area { display: block; padding: 0; background: white; }
  .ws-page { box-shadow: none; border-radius: 0; }
</style>
</head><body>
<div class="preview-area">${html}</div>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 600);
  }

  /* ── Type-E question randomise ─────────────────────────────── */

  function changeTypeEQuestions() {
    const count = Math.max(1, parseInt(document.getElementById('totalQ')?.value, 10) || 16);
    const vals  = Array.from({ length: count }, () => Math.floor(Math.random() * 11) + 1);
    const el    = document.getElementById('eqNumberList');
    if (el) el.value = vals.join(',');
    if (currentType.startsWith('E')) generateWorksheet();
  }

  /* ── Section image input change ────────────────────────────── */

  function onSection4A121ImageUrlChange() {
    normalize4A121GridInputs();
    if (currentSection === '4A121' || currentType.startsWith('F')) generateWorksheet();
  }

  /* ── Variation card builder (renders type cards from config) ── */

  function buildVariationCards(sectionId, gridContainerId) {
    const container = document.getElementById(gridContainerId);
    if (!container) return;
    const defs = VARIATIONS[sectionId] || [];
    container.innerHTML = defs.map(v => `
      <div class="type-card" data-type="${v.id}" onclick="selectType(this, '${v.id}')">
        <span class="type-badge">${v.label}</span>
        <div class="type-desc">${v.desc}</div>
      </div>
    `).join('');

    // Set the first one active if none is active yet for this section
    if (sectionId === currentSection) {
      const first = container.querySelector('.type-card');
      if (first && !container.querySelector('.type-card.active')) {
        first.classList.add('active');
      }
    }
  }

  /* ── Order manager UI wiring ───────────────────────────────── */

  function initOrderManager() {
    const grid = document.getElementById('orderPoolGrid');
    const shuffleBtn = document.getElementById('btnOrderShuffle');
    const resetBtn   = document.getElementById('btnOrderReset');

    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', () => {
        window.ORDER_MANAGER?.shufflePool?.(grid);
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        window.ORDER_MANAGER?.resetOrder?.(grid);
      });
    }
  }

  /* ── Expose to global scope (used by onclick="..." in HTML) ── */

  window.toggleSidebar           = (f) => toggleSidebar(f);
  window.selectSection           = selectSection;
  window.selectType              = selectType;
  window.generateWorksheet       = generateWorksheet;
  window.generatePoolPrint       = generatePoolPrint;
  window.generateCombinedWorksheet = generateCombinedWorksheet;
  window.printWorksheet          = printWorksheet;
  window.changeTypeEQuestions    = changeTypeEQuestions;
  window.onSection4A121ImageUrlChange = onSection4A121ImageUrlChange;
  window.onWorksheetSearchInput  = () => applyWorksheetSearchFilter();

  /* ── Bootstrap ─────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', () => {
    // Build variation cards from VARIATIONS config
    buildVariationCards('3A3I',  'typeGrid3A3I');
    buildVariationCards('2A8',   'typeGridSpecial');
    buildVariationCards('4A121', 'typeGrid4A121');
    // 4A cards are static in HTML (4A1–4A10)

    initializeSidebarResize();
    initializeSectionImageInputs();
    initOrderManager();
    syncLevelField(currentSection, true);
    updateSectionUI();
    applyWorksheetSearchFilter();
    syncQuestionCountControl();
    generateWorksheet();
  });

})();
