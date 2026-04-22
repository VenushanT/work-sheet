/**
 * scripts/generators/question-pool.js
 *
 * Generates a pool of 50 unique question descriptors for any section + variation.
 * Each descriptor contains enough data to render one question without re-generating.
 *
 * The order-manager (admin/order-manager.js) can reorder the pool before rendering.
 *
 * Exports: window.QUESTION_POOL
 *   generate(sectionId, variationId, options) → QuestionDescriptor[]  (up to 50)
 *   applyOrder(pool, orderedIndices)          → QuestionDescriptor[]
 */
(function () {

  const POOL_SIZE = 50;

  /* ── Seeded randomness ─────────────────────────────────────── */

  /**
   * Simple LCG seeded random — gives reproducible pools when the
   * admin wants to regenerate the same set.
   */
  function seededRandom(seed) {
    let s = seed || Date.now();
    return function () {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  function shuffle(arr, rng) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ── 3A3I pool generator ───────────────────────────────────── */

  function generate3A3I(variationId, options) {
    const start    = Math.max(0, parseInt(options.rangeStart, 10) || 31);
    const end      = Math.max(start + 1, parseInt(options.rangeEnd, 10) || 70);
    const perRow   = Math.max(2, Math.min(20, parseInt(options.perRow, 10) || 10));
    const blankCnt = Math.max(1, parseInt(options.blankCount, 10) || 4);
    const rng      = seededRandom(options.seed);

    const allNums  = [];
    for (let i = start; i <= end; i++) allNums.push(i);

    const pool = [];

    // Slide a window of `perRow` numbers across the range, generating unique segments.
    // If we run out of distinct windows, wrap around with a random offset.
    const maxDistinct = Math.max(1, allNums.length - perRow + 1);
    const offsets     = [];
    for (let i = 0; i < maxDistinct; i++) offsets.push(i);

    const shuffledOffsets = shuffle(offsets, rng);
    let idx = 0;

    while (pool.length < POOL_SIZE) {
      const offset = shuffledOffsets[idx % shuffledOffsets.length] +
                     (Math.floor(idx / shuffledOffsets.length) * Math.max(1, Math.floor(rng() * 3)));
      idx++;

      const safeOffset = offset % Math.max(1, allNums.length);
      const nums = [];
      for (let i = 0; i < perRow; i++) {
        nums.push(allNums[(safeOffset + i) % allNums.length]);
      }

      pool.push({
        id:          pool.length + 1,
        section:     '3A3I',
        variationId,
        label:       `Q${pool.length + 1}: ${nums[0]}–${nums[nums.length - 1]} (${variationId})`,
        data:        { nums, blankCount: blankCnt },
      });
    }

    return pool.slice(0, POOL_SIZE);
  }

  /* ── 2A8 pool generator ────────────────────────────────────── */

  function generate2A8(variationId, options) {
    const addend      = Math.max(0, Math.min(99, parseInt(options.eqAddend, 10) || 3));
    const seedNumbers = options.seedNumbers || [];
    const rng         = seededRandom(options.seed);
    const pool        = [];

    while (pool.length < POOL_SIZE) {
      const qIdx  = pool.length;
      const base  = seedNumbers.length
        ? seedNumbers[qIdx % seedNumbers.length]
        : Math.floor(rng() * 11) + 1;

      pool.push({
        id:          pool.length + 1,
        section:     '2A8',
        variationId,
        label:       `Q${pool.length + 1}: ${base} ${variationId.includes('3') ? '−' : '+'} ${addend} (${variationId})`,
        data:        { base, addend, variationId },
      });
    }

    return pool.slice(0, POOL_SIZE);
  }

  /* ── 4A121 pool generator ──────────────────────────────────── */

  function generate4A121(variationId, options) {
    const imageUrl  = options.imageUrl  || '';
    const imagePerRow = Math.max(1, Math.min(8, parseInt(options.imagePerRow, 10) || 5));
    const maxCount  = imagePerRow * 5;
    const rng       = seededRandom(options.seed);
    const pool      = [];

    while (pool.length < POOL_SIZE) {
      // Vary the image count across the pool for uniqueness
      const count = Math.max(1, Math.min(maxCount, Math.floor(rng() * maxCount) + 1));
      pool.push({
        id:          pool.length + 1,
        section:     '4A121',
        variationId,
        label:       `Q${pool.length + 1}: ${count} images (${variationId})`,
        data:        { imageUrl, imageCount: count, imagePerRow, variationId },
      });
    }

    return pool.slice(0, POOL_SIZE);
  }

  /* ── 4A pool generator ─────────────────────────────────────── */

  function generate4A(variationId, options) {
    // Each question in 4A is a full tracing page (2 sub-questions),
    // so we generate 50 descriptor entries all pointing to the same tracing type.
    const pool = [];
    const traceNumber = parseInt((variationId || '4A1').replace('4A', ''), 10) || 1;

    while (pool.length < POOL_SIZE) {
      pool.push({
        id:          pool.length + 1,
        section:     '4A',
        variationId,
        label:       `Q${pool.length + 1}: Trace ${traceNumber} (${variationId})`,
        data:        { traceNumber, imageValues: options.imageValues || [] },
      });
    }
    return pool.slice(0, POOL_SIZE);
  }

  /* ── Public API ────────────────────────────────────────────── */

  /**
   * generate(sectionId, variationId, options) → QuestionDescriptor[]
   *
   * options may include:
   *   rangeStart, rangeEnd, perRow, blankCount  — for 3A3I
   *   eqAddend, seedNumbers                     — for 2A8
   *   imageUrl, imageCount, imagePerRow         — for 4A121
   *   imageValues                               — for 4A
   *   seed                                      — for reproducibility
   */
  function generate(sectionId, variationId, options) {
    options = options || {};
    switch (sectionId) {
      case '3A3I':  return generate3A3I(variationId, options);
      case '2A8':   return generate2A8(variationId, options);
      case '4A121': return generate4A121(variationId, options);
      case '4A':    return generate4A(variationId, options);
      default:      return generate3A3I('A', options);
    }
  }

  /**
   * applyOrder(pool, orderedIndices) → QuestionDescriptor[]
   *
   * Reorders the pool based on an array of 0-based indices
   * (produced by the admin order-manager panel).
   */
  function applyOrder(pool, orderedIndices) {
    if (!Array.isArray(orderedIndices) || !orderedIndices.length) return pool;
    return orderedIndices
      .map(i => pool[i])
      .filter(Boolean);
  }

  window.QUESTION_POOL = { generate, applyOrder };

})();
