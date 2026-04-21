(function () {
  function parseIntegerList(rawText) {
    return (rawText || '')
      .split(/[^\d-]+/)
      .map(v => parseInt(v, 10))
      .filter(v => Number.isFinite(v));
  }

  function renderEquationQuestion(base, addend, qIdx) {
    return `
      <div class="q-block q-block-equation">
        <div class="q-num">(${qIdx + 1})</div>
        <div class="equation-row">
          <span>${base}</span>
          <span>+</span>
          <span>${addend}</span>
          <span>=</span>
          <span class="eq-answer-line"></span>
        </div>
      </div>
    `;
  }

  function buildEquationGrid(totalQ, eqNumbersRaw, fallbackNumbers, eqAddend) {
    const parsedEqNumbers = parseIntegerList(eqNumbersRaw);
    const seedNumbers = parsedEqNumbers.length ? parsedEqNumbers : (fallbackNumbers.length ? fallbackNumbers : [1]);
    const equationItems = [];

    for (let q = 0; q < totalQ; q++) {
      const base = seedNumbers[q % seedNumbers.length];
      equationItems.push(renderEquationQuestion(base, eqAddend, q));
    }

    return `<div class="equation-grid">${equationItems.join('')}</div>`;
  }

  window.WORKSHEET_2A8 = {
    parseIntegerList,
    renderEquationQuestion,
    buildEquationGrid
  };
})();
