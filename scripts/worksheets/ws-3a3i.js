/**
 * scripts/worksheets/ws-3a3i.js
 *
 * Renders individual number-sequence questions for the 3A3I section.
 * Supports 10 variation types (A–J).
 *
 * Exports: window.WORKSHEET_3A3I
 *   renderQuestion(nums, variationId, qIdx, blankCount) → HTML string
 */
(function () {

  /** Box colour rotation (10 options for extended colour variety) */
  const BOX_COLORS = [
    'col-purple', 'col-blue', 'col-amber', 'col-green', 'col-pink',
    'col-teal', 'col-red', 'col-indigo', 'col-lime', 'col-sky',
  ];

  const CIRCLE_COLORS = [
    'circle-teal', 'circle-purple', 'circle-amber', 'circle-green', 'circle-pink',
  ];

  // ── Helpers ──────────────────────────────────────────────────

  function colorForQ(qIdx) {
    return BOX_COLORS[qIdx % BOX_COLORS.length];
  }

  function circleColorForIdx(idx) {
    return CIRCLE_COLORS[idx % CIRCLE_COLORS.length];
  }

  function makeBox(n, colorClass) {
    return `<div class="num-box ${colorClass}">${n}</div>`;
  }

  function makeBlankBox() {
    return `<div class="num-box num-blank"></div>`;
  }

  function makeCircle(n, colorClass) {
    return `<div class="num-circle ${colorClass}">${n}</div>`;
  }

  function makeBlankCircle() {
    return `<div class="num-circle circle-blank"></div>`;
  }

  function row(items) {
    return `<div class="num-row">${items.join('')}</div>`;
  }

  function wrapBlock(qIdx, inner) {
    return `<div class="q-block"><div class="q-num">(${qIdx + 1})</div>${inner}</div>`;
  }

  // ── Variation Renderers ───────────────────────────────────────

  /**
   * A — Show all numbers, blank row below for copying.
   */
  function renderA(nums, qIdx) {
    const col = colorForQ(qIdx);
    const topRow  = row(nums.map(n => makeBox(n, col)));
    const botRow  = row(nums.map(() => makeBlankBox()));
    return wrapBlock(qIdx, topRow + botRow);
  }

  /**
   * B — Fill in the first N blanks from the left.
   */
  function renderB(nums, qIdx, blankCount) {
    const col = colorForQ(qIdx);
    const bc  = Math.min(blankCount, nums.length - 1);
    const topRow = row(nums.map(n => makeBox(n, col)));
    const botRow = row(nums.map((n, i) =>
      i < bc ? makeBlankBox() : makeBox(n, col)
    ));
    return wrapBlock(qIdx, topRow + botRow);
  }

  /**
   * C — Circles with randomly missing values.
   */
  function renderC(nums, qIdx, blankCount) {
    const bc = Math.min(blankCount, Math.floor(nums.length * 0.4));
    const blankSet = new Set();
    while (blankSet.size < bc) blankSet.add(Math.floor(Math.random() * nums.length));

    const topRow = row(nums.map((n, i) =>
      blankSet.has(i) ? makeBlankCircle() : makeCircle(n, circleColorForIdx(i))
    ));
    const botRow = row(nums.map((n, i) =>
      makeCircle(n + nums.length, circleColorForIdx(i))
    ));
    return wrapBlock(qIdx, topRow + botRow);
  }

  /**
   * D — Fill in the last N blanks from the right.
   */
  function renderD(nums, qIdx, blankCount) {
    const col = colorForQ(qIdx);
    const bc  = Math.min(blankCount, nums.length - 1);
    const topRow = row(nums.map(n => makeBox(n, col)));
    const botRow = row(nums.map((n, i) => {
      const fromEnd = nums.length - 1 - i;
      return fromEnd < bc ? makeBlankBox() : makeBox(n, col);
    }));
    return wrapBlock(qIdx, topRow + botRow);
  }

  /**
   * E — Sequence in reverse (countdown) order, write forward below.
   */
  function renderE(nums, qIdx) {
    const col  = colorForQ(qIdx);
    const rev  = [...nums].reverse();
    const topRow = row(rev.map(n => makeBox(n, col)));
    const botRow = row(nums.map(() => makeBlankBox()));
    return wrapBlock(qIdx, topRow + botRow);
  }

  /**
   * F — Show only odd-indexed numbers; even-indexed are blank.
   */
  function renderF(nums, qIdx) {
    const col = colorForQ(qIdx);
    const topRow = row(nums.map((n, i) =>
      i % 2 === 0 ? makeBox(n, col) : makeBlankBox()
    ));
    const botRow = row(nums.map(n => makeBlankBox()));
    return wrapBlock(qIdx, topRow + botRow);
  }

  /**
   * G — Show only even-indexed numbers; odd-indexed are blank.
   */
  function renderG(nums, qIdx) {
    const col = colorForQ(qIdx);
    const topRow = row(nums.map((n, i) =>
      i % 2 !== 0 ? makeBox(n, col) : makeBlankBox()
    ));
    const botRow = row(nums.map(n => makeBlankBox()));
    return wrapBlock(qIdx, topRow + botRow);
  }

  /**
   * H — Skip-count by 2: show every other value, blank the rest.
   */
  function renderH(nums, qIdx) {
    const col = colorForQ(qIdx);
    const topRow = row(nums.map((n, i) =>
      i % 2 === 0 ? makeBox(n, col) : makeBlankBox()
    ));
    const botRow = row(nums.map(n => makeBlankBox()));
    return wrapBlock(qIdx, topRow + botRow);
  }

  /**
   * I — Skip-count by 5: show every 5th, blank the rest.
   */
  function renderI(nums, qIdx) {
    const col = colorForQ(qIdx);
    const topRow = row(nums.map((n, i) =>
      i % 5 === 0 ? makeBox(n, col) : makeBlankBox()
    ));
    const botRow = row(nums.map(n => makeBlankBox()));
    return wrapBlock(qIdx, topRow + botRow);
  }

  /**
   * J — Random blanks scattered throughout a single row.
   */
  function renderJ(nums, qIdx, blankCount) {
    const col = colorForQ(qIdx);
    const bc  = Math.max(1, Math.min(blankCount, Math.floor(nums.length * 0.45)));
    const blankSet = new Set();
    while (blankSet.size < bc) blankSet.add(Math.floor(Math.random() * nums.length));

    const topRow = row(nums.map((n, i) =>
      blankSet.has(i) ? makeBlankBox() : makeBox(n, col)
    ));
    return wrapBlock(qIdx, topRow);
  }

  // ── Public API ────────────────────────────────────────────────

  /**
   * renderQuestion(nums, variationId, qIdx, blankCount) → HTML string
   *
   * @param {number[]} nums        - The number sequence for this question
   * @param {string}   variationId - One of A-J
   * @param {number}   qIdx        - 0-based question position (for colour cycling)
   * @param {number}   blankCount  - How many blanks to leave (used by B, C, D, J)
   */
  function renderQuestion(nums, variationId, qIdx, blankCount) {
    switch (variationId) {
      case 'A': return renderA(nums, qIdx);
      case 'B': return renderB(nums, qIdx, blankCount);
      case 'C': return renderC(nums, qIdx, blankCount);
      case 'D': return renderD(nums, qIdx, blankCount);
      case 'E': return renderE(nums, qIdx);
      case 'F': return renderF(nums, qIdx);
      case 'G': return renderG(nums, qIdx);
      case 'H': return renderH(nums, qIdx);
      case 'I': return renderI(nums, qIdx);
      case 'J': return renderJ(nums, qIdx, blankCount);
      default:  return renderA(nums, qIdx);
    }
  }

  window.WORKSHEET_3A3I = { renderQuestion };

})();
