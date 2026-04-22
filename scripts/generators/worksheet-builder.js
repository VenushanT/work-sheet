/**
 * scripts/generators/worksheet-builder.js
 *
 * Builds the full worksheet HTML string from a pool of question descriptors.
 * Handles all 4 sections and their variations.
 *
 * Exports: window.WORKSHEET_BUILDER
 *   buildWorksheetHTML(questions, globalOptions) → HTML string
 *   buildSinglePageHTML(questions, globalOptions) → HTML string (fits A4)
 */
(function () {

  const WORKSHEET_LOGO_SRC = 'https://www.geniusbees.com/assets/icons/gb-logo.svg';

  /* ── Helpers ───────────────────────────────────────────────── */

  function escapeHtml(val) {
    return String(val || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function parseBoundedInt(raw, fallback, min, max) {
    const p = parseInt(raw, 10);
    if (!Number.isFinite(p)) return fallback;
    return Math.max(min, Math.min(max, p));
  }

  /* ── Header fields ─────────────────────────────────────────── */

  function buildHeaderFields(opts) {
    const { showName, showDate } = opts;
    return `
      ${showName ? `
        <div class="ws-fill-line"><span>First Name:</span><span class="dots"></span></div>
        <div class="ws-fill-line"><span>Last Name:</span><span class="dots"></span></div>
      ` : ''}
      <div class="ws-fill-line"><span>GeniusBees ID:</span><span class="dots"></span></div>
      ${showDate ? `<div class="ws-fill-line"><span>Date:</span><span class="dots"></span></div>` : ''}
    `;
  }

  /* ── Worksheet page header bar ─────────────────────────────── */

  function buildHeaderBar(opts) {
    const { levelLabel, activityTitle, fields } = opts;
    return `
      <div class="ws-header-bar">
        <div class="ws-brand-column">
          <div class="ws-brand-logo-wrap">
            <img class="ws-brand-logo" src="${WORKSHEET_LOGO_SRC}" alt="GeniusBees"/>
          </div>
        </div>
        <div class="ws-center-column">
          <div class="ws-main-title">WORK<span class="muted">SHEET</span></div>
          <div class="ws-meta-line ws-level-line">Level: ${escapeHtml(levelLabel)}</div>
          <div class="ws-meta-line">Activity: ${escapeHtml(activityTitle)}</div>
        </div>
        <div class="ws-right-column">${fields}</div>
      </div>
    `;
  }

  /* ── Footer ────────────────────────────────────────────────── */

  function buildFooter(pageNum, showKidSticker) {
    const sticker = showKidSticker ? `
      <span class="ws-kid-sticker" aria-hidden="true">
        <svg class="ws-kid-svg" viewBox="0 0 120 36" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Fun decoration">
          <circle cx="16" cy="18" r="10" fill="#60a5fa"/>
          <circle cx="36" cy="18" r="10" fill="#34d399"/>
          <circle cx="56" cy="18" r="10" fill="#fbbf24"/>
          <circle cx="76" cy="18" r="10" fill="#f472b6"/>
          <circle cx="96" cy="18" r="10" fill="#c084fc"/>
          <circle cx="106" cy="9" r="5" fill="#fde68a"/>
          <circle cx="104" cy="8" r="1" fill="#111827"/>
          <circle cx="108" cy="8" r="1" fill="#111827"/>
          <path d="M103 10.5 Q106 13 109 10.5" stroke="#111827" stroke-width="1.4" fill="none" stroke-linecap="round"/>
        </svg>
      </span>` : '';

    return `
      <div class="ws-footer">
        <span class="ws-footer-left">${sticker}</span>
        <span>Page: ${pageNum}</span>
      </div>
      <div class="ws-bottom-contact">
        <div class="ws-bottom-contact-line"><span class="u">www.geniusbees.com</span></div>
        <div class="ws-bottom-contact-line"><span class="u">info@geniusbees.com</span></div>
        <div class="ws-bottom-contact-line">Copyright &copy; 2025 <span class="u">GeniusBees</span> Inc. All rights reserved</div>
      </div>
    `;
  }

  /* ── Per-question HTML renderers by section ────────────────── */

  function renderQuestionHTML(descriptor, qIdx) {
    const { section, variationId, data } = descriptor;

    switch (section) {

      case '3A3I': {
        if (window.WORKSHEET_3A3I?.renderQuestion) {
          return window.WORKSHEET_3A3I.renderQuestion(data.nums, variationId, qIdx, data.blankCount);
        }
        return '';
      }

      case '2A8': {
        if (window.WORKSHEET_2A8?.buildEquationGrid) {
          return window.WORKSHEET_2A8.buildEquationGrid(1, variationId, [data.base], data.addend);
        }
        return '';
      }

      case '4A121': {
        if (window.WORKSHEET_4A121?.renderImageQuestion) {
          return window.WORKSHEET_4A121.renderImageQuestion(
            data.imageUrl, data.imageCount, data.imagePerRow, variationId
          );
        }
        return '';
      }

      case '4A': {
        if (window.WORKSHEET_4A?.buildWorksheetData) {
          return window.WORKSHEET_4A.buildWorksheetData({
            traceNumber:  data.traceNumber,
            imageValues:  data.imageValues || [],
          }).questionsHtml || '';
        }
        return '';
      }

      default:
        return '';
    }
  }

  /* ── Layout class selector ─────────────────────────────────── */

  function getLayoutClass(section, variationId, qCount) {
    if (section === '2A8') return 'type-e-layout';
    if (section === '4A121') return 'type-f-layout';
    if (section === '4A') return 'type-4a-layout';
    if (qCount === 1) return 'one-question-layout';
    if (qCount === 2) return 'two-question-layout';
    return '';
  }

  function getQuestionsWrapClass(section) {
    if (section === '2A8') return 'ws-questions-e';
    if (section === '4A121') return 'ws-questions-f';
    return 'ws-questions-default';
  }

  /* ── buildWorksheetHTML ────────────────────────────────────── */

  /**
   * Builds one complete ws-page HTML string for a set of questions.
   *
   * @param {object[]} questions     - QuestionDescriptor[] (from pool, already ordered)
   * @param {object}   globalOptions - UI state / settings
   * @returns {string} HTML for the full page (may contain multiple ws-page divs for 50q pool)
   */
  function buildWorksheetHTML(questions, globalOptions) {
    if (!questions || !questions.length) return '';

    const opts = globalOptions || {};
    const {
      showName   = true,
      showDate   = true,
      levelLabel = '',
      title      = 'Write the numbers',
      section    = '3A3I',
      variationId = 'A',
      poolMode   = false,   // true → render all 50 as separate pages
    } = opts;

    const fields      = buildHeaderFields({ showName, showDate });
    const activityTitle = title;
    const showSticker = section === '3A3I';

    if (poolMode) {
      // Render each question on its own page (for 50-variation prints)
      return questions.map((q, pageIdx) => {
        const qHtml = renderQuestionHTML(q, 0);
        const layoutClass = getLayoutClass(q.section, q.variationId, 1);
        const wrapClass   = getQuestionsWrapClass(q.section);
        const headerBar   = buildHeaderBar({ levelLabel, activityTitle, fields });
        const footer      = buildFooter(pageIdx + 1, showSticker);

        return `
          <div class="ws-page one-question-layout ${layoutClass}" id="wsPage-${pageIdx + 1}">
            ${headerBar}
            <div class="ws-instruction">${escapeHtml(title)}.</div>
            <div class="ws-questions ${wrapClass}">${qHtml}</div>
            ${footer}
          </div>
        `;
      }).join('\n');
    }

    // Standard mode: render all questions on one page
    const questionsHTML = questions.map((q, qIdx) =>
      renderQuestionHTML(q, qIdx)
    ).join('');

    const layoutClass = getLayoutClass(section, variationId, questions.length);
    const wrapClass   = getQuestionsWrapClass(section);

    // Special handling for 4A section (tracing has its own page structure)
    if (section === '4A') {
      const traceData = window.WORKSHEET_4A?.buildWorksheetData({
        traceNumber: questions[0]?.data?.traceNumber || 1,
        imageValues: questions[0]?.data?.imageValues || [],
      });
      if (!traceData) return '';

      const tracingCode  = traceData.worksheetCode || '';
      const tracingTitle = traceData.activityName || 'Number Tracing';
      const tracingInstr = traceData.instructionText || 'Trace the number.';
      const tracingHint  = (traceData.hintText || '').trim();

      return `
        <div class="ws-page type-4a-layout" id="wsPage">
          <div class="ws-header-bar">
            <div class="ws-brand-column">
              <div class="ws-brand-logo-wrap">
                <img class="ws-brand-logo" src="${WORKSHEET_LOGO_SRC}" alt="GeniusBees"/>
              </div>
            </div>
            <div class="ws-center-column">
              <div class="ws-main-title">WORK<span class="muted">SHEET</span></div>
              <div class="ws-meta-line ws-level-line">English Level:${escapeHtml(tracingCode)}</div>
              <div class="ws-meta-line">Activity: ${escapeHtml(tracingTitle)}</div>
            </div>
            <div class="ws-right-column">${fields}</div>
          </div>
          <div class="ws-instruction">${escapeHtml(tracingInstr)}</div>
          ${tracingHint ? `<div class="trace4a-global-hint">Hint: ${escapeHtml(tracingHint)}</div>` : ''}
          <div class="ws-questions ws-questions-default">
            ${traceData.questionsHtml || ''}
          </div>
          ${buildFooter(1, false)}
        </div>
      `;
    }

    const headerBar = buildHeaderBar({ levelLabel, activityTitle, fields });
    const footer    = buildFooter(1, showSticker);
    const prompt    = section === '4A121'
      ? (window.WORKSHEET_4A121?.getConfiguredPromptForSection?.('4A121') || title)
      : `${title}.`;

    return `
      <div class="ws-page ${layoutClass}" id="wsPage">
        ${headerBar}
        <div class="ws-instruction">${escapeHtml(prompt)}</div>
        <div class="ws-questions ${wrapClass}">${questionsHTML}</div>
        ${footer}
      </div>
    `;
  }

  /* ── A4-fit resolver ───────────────────────────────────────── */

  /**
   * Probes the rendered HTML by mounting it off-screen to check if it
   * fits within A4 height (297mm). Used to auto-clamp question count.
   *
   * @param {string} html  - The ws-page HTML to test
   * @returns {boolean}
   */
  function doesFitA4(html) {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;width:210mm;';
    probe.innerHTML = html;
    document.body.appendChild(probe);

    const page = probe.querySelector('.ws-page');
    let fits = true;
    if (page) {
      page.style.height    = '297mm';
      page.style.minHeight = '297mm';
      page.style.maxHeight = '297mm';
      page.style.overflow  = 'hidden';
      fits = page.scrollHeight <= page.clientHeight + 1;
    }

    probe.remove();
    return fits;
  }

  /* ── Exports ───────────────────────────────────────────────── */

  window.WORKSHEET_BUILDER = {
    buildWorksheetHTML,
    doesFitA4,
  };

})();
