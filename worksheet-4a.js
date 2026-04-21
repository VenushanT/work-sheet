(function () {
  const NUMBER_WORDS = {
    1: 'one',
    2: 'two',
    3: 'three',
    4: 'four',
    5: 'five',
    6: 'six',
    7: 'seven',
    8: 'eight',
    9: 'nine',
    10: 'ten'
  };

  const TRACE_COLORS = [
    '#1d4ed8',
    '#db2777',
    '#0f766e',
    '#4c1d95',
    '#dc2626',
    '#0ea5e9',
    '#b45309',
    '#be185d',
    '#047857',
    '#0369a1'
  ];

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getTraceNumberFromType(type) {
    const match = /^4A(10|[1-9])$/.exec(String(type || '').trim());
    return match ? parseInt(match[1], 10) : null;
  }

  function getWorksheetCode(traceNumber) {
    return `4A${traceNumber}`;
  }

  function getTraceWord(traceNumber) {
    return NUMBER_WORDS[traceNumber] || String(traceNumber);
  }

  function normalizeUrl(url) {
    return String(url || '').trim();
  }

  function normalizeImageValues(traceNumber, values) {
    const expected = traceNumber * 2;
    const normalized = [];

    for (let i = 0; i < expected; i++) {
      normalized.push(normalizeUrl(values?.[i]));
    }

    return normalized;
  }

  function splitImageValuesByQuestion(traceNumber, values) {
    const normalized = normalizeImageValues(traceNumber, values);
    return [
      normalized.slice(0, traceNumber),
      normalized.slice(traceNumber, traceNumber * 2)
    ];
  }

  function buildImageFieldsHTML(traceNumber, initialValues) {
    const safeNumber = Math.max(1, Math.min(10, parseInt(traceNumber, 10) || 1));
    const values = normalizeImageValues(safeNumber, initialValues);
    let html = '';

    for (let questionIndex = 0; questionIndex < 2; questionIndex++) {
      html += `<div class="trace-image-group">`;
      html += `<div class="trace-image-group-title">Question ${questionIndex + 1} images (${safeNumber})</div>`;

      for (let slot = 0; slot < safeNumber; slot++) {
        const flatIndex = questionIndex * safeNumber + slot;
        const safeValue = escapeHtml(values[flatIndex]);

        html += `
          <label class="trace-image-field">
            <span class="trace-image-label">Q${questionIndex + 1} Image ${slot + 1}</span>
            <input
              type="url"
              class="field-input field-input-wide trace-image-url"
              data-image-index="${flatIndex}"
              data-question-index="${questionIndex}"
              data-slot-index="${slot}"
              value="${safeValue}"
              placeholder="https://example.com/image-${slot + 1}.png"
            />
          </label>
        `;
      }

      html += `</div>`;
    }

    return html;
  }

  function readImageValuesFromDOM(traceNumber, root) {
    const safeNumber = Math.max(1, Math.min(10, parseInt(traceNumber, 10) || 1));
    const scope = root || document;
    const inputs = scope.querySelectorAll('.trace-image-url');
    const values = Array.from(inputs).map(input => normalizeUrl(input.value));
    return normalizeImageValues(safeNumber, values);
  }

  function buildImageTiles(traceNumber, questionIndex, urls) {
    return urls.map((url, idx) => {
      const safeUrl = normalizeUrl(url);
      const safeAttrUrl = escapeHtml(safeUrl);
      const fallbackHidden = safeUrl ? ' style="display:none;"' : '';

      return `
        <div class="trace4a-image-tile" role="img" aria-label="Image ${idx + 1}">
          ${safeUrl ? `<img class="trace4a-image" src="${safeAttrUrl}" alt="Question ${questionIndex + 1} image ${idx + 1}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"/>` : ''}
          <span class="trace4a-image-fallback"${fallbackHidden}>Image ${idx + 1}</span>
        </div>
      `;
    }).join('');
  }

  function buildQuestionHTML(traceNumber, questionIndex, imageUrls) {
    const worksheetCode = getWorksheetCode(traceNumber);
    const subCode = `${worksheetCode}${questionIndex === 0 ? 'a' : 'b'}`;
    const numberWord = escapeHtml(getTraceWord(traceNumber));
    const color = TRACE_COLORS[(traceNumber - 1) % TRACE_COLORS.length];

    return `
      <div class="trace4a-question">
        <div class="trace4a-code">${subCode}</div>
        <div class="trace4a-image-strip" style="--trace-count:${traceNumber};">
          ${buildImageTiles(traceNumber, questionIndex, imageUrls)}
        </div>
        <div class="trace4a-body">
          <div class="trace4a-left">
            <div class="trace4a-caption">Write the number.</div>
            <div class="trace4a-word">${numberWord}</div>
            <div class="trace4a-digit">${traceNumber}</div>
          </div>
          <div class="trace4a-template" style="background:${color};">
            <div class="trace4a-template-digit">${traceNumber}</div>
          </div>
        </div>
      </div>
    `;
  }

  function buildWorksheetData(options) {
    const traceNumber = Math.max(1, Math.min(10, parseInt(options?.traceNumber, 10) || 1));
    const imageSets = splitImageValuesByQuestion(traceNumber, options?.imageValues || []);

    return {
      worksheetCode: getWorksheetCode(traceNumber),
      activityName: 'Number Tracing',
      instructionText: 'Trace the number.',
      questionsHtml: `
        <div class="trace4a-questions">
          ${buildQuestionHTML(traceNumber, 0, imageSets[0])}
          ${buildQuestionHTML(traceNumber, 1, imageSets[1])}
        </div>
      `,
      questionCount: 2
    };
  }

  window.WORKSHEET_4A = {
    getTraceNumberFromType,
    getWorksheetCode,
    buildImageFieldsHTML,
    readImageValuesFromDOM,
    buildWorksheetData
  };
})();
