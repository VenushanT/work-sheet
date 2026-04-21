(function () {
  // Configuration for 4A121 image-based worksheets
  const WORKSHEET_IMAGES_CONFIG = {
    sectionImages: {
      '4A121': ''
    },
    sectionGrid: {
      '4A121': {
        count: 15,
        perRow: 5
      }
    },
    sectionPrompts: {
      '4A121': 'How many butterflies are there? Write the number in the box.'
    }
  };

  function parseBoundedInt(rawValue, fallbackValue, minValue, maxValue) {
    const parsed = parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) return fallbackValue;
    return Math.max(minValue, Math.min(maxValue, parsed));
  }

  function getConfiguredImageForSection(sectionName) {
    const sectionImages = WORKSHEET_IMAGES_CONFIG?.sectionImages;
    if (!sectionImages || typeof sectionImages !== 'object') return '';

    const rawValue = sectionImages[sectionName];
    if (typeof rawValue !== 'string') return '';

    const trimmed = rawValue.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : '';
  }

  function getConfiguredPromptForSection(sectionName) {
    const sectionPrompts = WORKSHEET_IMAGES_CONFIG?.sectionPrompts;
    if (!sectionPrompts || typeof sectionPrompts !== 'object') return '';

    const rawValue = sectionPrompts[sectionName];
    if (typeof rawValue !== 'string') return '';

    return rawValue.trim();
  }

  function getConfiguredGridForSection(sectionName) {
    const sectionGrid = WORKSHEET_IMAGES_CONFIG?.sectionGrid;
    if (!sectionGrid || typeof sectionGrid !== 'object') {
      return { count: 15, perRow: 5 };
    }

    const rawGrid = sectionGrid[sectionName];
    if (!rawGrid || typeof rawGrid !== 'object') {
      return { count: 15, perRow: 5 };
    }

    return {
      count: parseBoundedInt(rawGrid.count, 15, 1, 40),
      perRow: parseBoundedInt(rawGrid.perRow, 5, 1, 8)
    };
  }

  function getSuitableGridRange(perRowValue) {
    const safePerRow = parseBoundedInt(perRowValue, 5, 1, 8);
    return {
      perRow: safePerRow,
      minCount: 1,
      maxCount: safePerRow * 5
    };
  }

  function getAdaptiveImageTileSize(imageCount, imagePerRow) {
    const safeCount = parseBoundedInt(imageCount, 15, 1, 40);
    const safePerRow = parseBoundedInt(imagePerRow, 5, 1, 8);
    const rows = Math.ceil(safeCount / safePerRow);

    const gapSize = safePerRow <= 4 ? 14 : (safePerRow <= 6 ? 12 : 10);
    const sizeByColumns = Math.floor((640 - gapSize * (safePerRow - 1)) / safePerRow);
    const sizeByRows = Math.floor((480 - gapSize * (rows - 1)) / Math.max(rows, 1));
    return Math.max(56, Math.min(160, Math.min(sizeByColumns, sizeByRows)));
  }

  function renderImageQuestion(imageUrl, imageCount, imagePerRow) {
    const safeCount = parseBoundedInt(imageCount, 15, 1, 40);
    const safePerRow = parseBoundedInt(imagePerRow, 5, 1, 8);
    const tileSize = getAdaptiveImageTileSize(safeCount, safePerRow);
    const gapSize = safePerRow <= 4 ? 14 : (safePerRow <= 6 ? 12 : 10);

    const gridItems = Array.from({ length: safeCount }, () => {
      return `<img class="ws-image-item" src="${imageUrl}" alt="Worksheet object counting visual"/>`;
    }).join('');

    const imageBlock = imageUrl
      ? `<div class="ws-image-grid" style="grid-template-columns: repeat(${safePerRow}, ${tileSize}px); gap: ${gapSize}px;">${gridItems}</div>`
      : '<div class="ws-image-missing">Image link is missing. Paste a valid URL in the 4A121 Image Link field in the sidebar.</div>';

    return `
      <div class="ws-image-question">
        <div class="ws-image-frame">
          ${imageBlock}
          <div class="ws-answer-box-row"><div class="ws-answer-box" aria-label="Answer box"></div></div>
        </div>
      </div>
    `;
  }

  window.WORKSHEET_4A121 = {
    parseBoundedInt,
    getConfiguredImageForSection,
    getConfiguredPromptForSection,
    getConfiguredGridForSection,
    getSuitableGridRange,
    renderImageQuestion
  };
})();
