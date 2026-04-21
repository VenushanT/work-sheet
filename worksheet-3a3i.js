(function () {
  const BOX_COLORS = ['col-purple', 'col-blue', 'col-amber', 'col-green', 'col-pink'];
  const CIRCLE_COLORS = ['circle-teal', 'circle-purple', 'circle-amber'];

  function renderQuestion(nums, type, qIdx, blankCount) {
    const color = BOX_COLORS[qIdx % BOX_COLORS.length];
    let html = `<div class="q-block"><div class="q-num">(${qIdx + 1})</div>`;
    const bc = Math.min(blankCount, nums.length - 1);

    if (type === 'A') {
      html += `<div class="num-row">${nums.map(n => `<div class="num-box ${color}">${n}</div>`).join('')}</div>`;
      html += `<div class="num-row">${nums.map(() => `<div class="num-box num-blank"></div>`).join('')}</div>`;
    } else if (type === 'B') {
      html += `<div class="num-row">${nums.map(n => `<div class="num-box ${color}">${n}</div>`).join('')}</div>`;
      html += `<div class="num-row">${nums.map((n, i) =>
        i < bc ? `<div class="num-box num-blank"></div>` : `<div class="num-box ${color}">${n}</div>`
      ).join('')}</div>`;
    } else if (type === 'C') {
      const blankSet = new Set();
      const tries = Math.min(bc * 2, Math.floor(nums.length * 0.4));
      while (blankSet.size < tries) blankSet.add(Math.floor(Math.random() * nums.length));

      html += `<div class="num-row">${nums.map((n, i) => {
        if (blankSet.has(i)) return `<div class="num-circle circle-blank"></div>`;
        const c = CIRCLE_COLORS[i % CIRCLE_COLORS.length];
        return `<div class="num-circle ${c}">${n}</div>`;
      }).join('')}</div>`;

      html += `<div class="num-row">${nums.map((n, i) => {
        const c = CIRCLE_COLORS[i % CIRCLE_COLORS.length];
        return `<div class="num-circle ${c}">${n + nums.length}</div>`;
      }).join('')}</div>`;
    } else if (type === 'D') {
      html += `<div class="num-row">${nums.map(n => `<div class="num-box ${color}">${n}</div>`).join('')}</div>`;
      html += `<div class="num-row">${nums.map((n, i) => {
        const fromEnd = nums.length - 1 - i;
        return fromEnd < bc
          ? `<div class="num-box num-blank"></div>`
          : `<div class="num-box ${color}">${n}</div>`;
      }).join('')}</div>`;
    }

    html += '</div>';
    return html;
  }

  window.WORKSHEET_3A3I = {
    renderQuestion
  };
})();
