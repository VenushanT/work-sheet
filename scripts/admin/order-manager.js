/**
 * scripts/admin/order-manager.js
 *
 * Admin drag-and-drop question order panel.
 *
 * Renders a list of mini-cards (one per question in the pool) inside a
 * given container element. The admin can drag to reorder them. The current
 * order is persisted to localStorage and returned via getOrderedQuestions().
 *
 * Exports: window.ORDER_MANAGER
 *   renderPanel(questions, container)  — draws the sortable card list
 *   getOrderedQuestions()              — returns questions in current admin order
 *   shufflePool()                      — randomises current order
 *   resetOrder()                       — restores original pool order
 *   saveOrder(order)                   — persists to localStorage
 *   loadOrder()                        — restores from localStorage
 */
(function () {

  const LS_KEY = 'ws_question_order';
  let _pool    = [];   // Original pool (as generated)
  let _order   = [];   // Current admin-controlled order (array of pool indices)

  /* ── Persistence ───────────────────────────────────────────── */

  function saveOrder(order) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(order));
    } catch (_) { /* storage unavailable */ }
  }

  function loadOrder() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* corrupt data */ }
    return null;
  }

  /* ── Getters ───────────────────────────────────────────────── */

  function getOrderedQuestions() {
    if (!_order.length) return _pool;
    return _order.map(i => _pool[i]).filter(Boolean);
  }

  /* ── Panel render ──────────────────────────────────────────── */

  /**
   * renderPanel(questions, container)
   *
   * @param {object[]} questions  - QuestionDescriptor[] from QUESTION_POOL.generate()
   * @param {Element}  container  - DOM element to render into (e.g. #orderPoolGrid)
   */
  function renderPanel(questions, container) {
    if (!container) return;
    _pool  = questions;
    _order = _pool.map((_, i) => i);   // Default: original order

    // Restore persisted order if valid
    const saved = loadOrder();
    if (
      Array.isArray(saved) &&
      saved.length === _pool.length &&
      saved.every(i => Number.isInteger(i) && i >= 0 && i < _pool.length)
    ) {
      _order = saved;
    }

    _renderCards(container);
  }

  function _renderCards(container) {
    container.innerHTML = '';

    _order.forEach((poolIdx, position) => {
      const q  = _pool[poolIdx];
      if (!q) return;

      const card = document.createElement('div');
      card.className      = 'order-q-card';
      card.draggable      = true;
      card.dataset.pos    = position;
      card.dataset.idx    = poolIdx;

      card.innerHTML = `
        <span class="order-q-handle" aria-hidden="true">⠿</span>
        <span class="order-q-index">${position + 1}</span>
        <span class="order-q-label">${_escapeHtml(q.label)}</span>
        <span class="order-q-type-badge">${_escapeHtml(q.variationId)}</span>
      `;

      _attachDragHandlers(card, container);
      container.appendChild(card);
    });
  }

  /* ── Drag-and-drop ─────────────────────────────────────────── */

  let _dragSrcPos = null;

  function _attachDragHandlers(card, container) {
    card.addEventListener('dragstart', e => {
      _dragSrcPos = parseInt(card.dataset.pos, 10);
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      container.querySelectorAll('.order-q-card').forEach(c => c.classList.remove('drag-over'));
      _dragSrcPos = null;
    });

    card.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      container.querySelectorAll('.order-q-card').forEach(c => c.classList.remove('drag-over'));
      card.classList.add('drag-over');
    });

    card.addEventListener('drop', e => {
      e.preventDefault();
      const destPos = parseInt(card.dataset.pos, 10);
      if (_dragSrcPos === null || _dragSrcPos === destPos) return;

      // Reorder _order array
      const moved = _order.splice(_dragSrcPos, 1)[0];
      _order.splice(destPos, 0, moved);

      saveOrder(_order);
      _renderCards(container);   // re-render with new positions
    });
  }

  /* ── Admin actions ─────────────────────────────────────────── */

  function shufflePool(container) {
    // Fisher-Yates shuffle
    for (let i = _order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [_order[i], _order[j]] = [_order[j], _order[i]];
    }
    saveOrder(_order);
    if (container) _renderCards(container);
  }

  function resetOrder(container) {
    _order = _pool.map((_, i) => i);
    saveOrder(_order);
    if (container) _renderCards(container);
  }

  /* ── Utility ───────────────────────────────────────────────── */

  function _escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* ── Exports ───────────────────────────────────────────────── */

  window.ORDER_MANAGER = {
    renderPanel,
    getOrderedQuestions,
    shufflePool,
    resetOrder,
    saveOrder,
    loadOrder,
  };

})();
