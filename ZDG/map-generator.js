/**
 * ASCII Map Generator - Integration for ZDG project
 * Based on https://github.com/casanovajose/ZDG_map_creator
 */

const AsciiMapGenerator = (function() {
  'use strict';

  // Store resize observers
  const resizeObservers = new WeakMap();

  // Simple noise function (simplified Perlin-like)
  function noise2D(x, y, seed = 0) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }

  // Multi-octave noise
  function fbm(x, y, octaves = 4, persistence = 0.5, seed = 0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += noise2D(x * frequency, y * frequency, seed + i) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return total / maxValue;
  }

  // Island mask
  function islandMask(x, y, width, height) {
    const dx = (x - width / 2) / (width / 2);
    const dy = (y - height / 2) / (height / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    return Math.max(0, 1 - dist);
  }

  // Get terrain character
  function getTerrainChar(value) {
    if (value < 0.3) return '~'; // deep water
    if (value < 0.4) return '.'; // shore
    if (value < 0.5) return ','; // plains
    if (value < 0.65) return '+'; // forest
    if (value < 0.8) return '^'; // hills
    return 'A'; // mountains
  }

  // Generate map
  function generateMap(cols, rows, seed = Math.random() * 1000) {
    const map = [];
    const scale = 0.1;

    // Generate terrain
    for (let y = 0; y < rows; y++) {
      let row = '';
      for (let x = 0; x < cols; x++) {
        const noiseVal = fbm(x * scale, y * scale, 4, 0.5, seed);
        const mask = islandMask(x, y, cols, rows);
        const height = noiseVal * mask;
        row += getTerrainChar(height);
      }
      map.push(row);
    }

    // Add cities
    const numCities = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < numCities; i++) {
      const x = Math.floor(Math.random() * (cols - 10)) + 5;
      const y = Math.floor(Math.random() * (rows - 10)) + 5;
      if (map[y][x] !== '~' && map[y][x] !== '.') {
        map[y] = map[y].substring(0, x) + '#' + map[y].substring(x + 1);
      }
    }

    // Add tactical labels
    const labels = [
      ['ENEMY', 'FOE', 'HOSTILE', 'OPFOR', 'ADVERSARY'],
      ['ALLY', 'FRIEND', 'FRIENDLY', 'PARTNER', 'COHORT'],
      ['SUSPECT', 'UNKNOWN', 'MYSTERY', 'QUERY', 'SHADOW'],
      ['TARGET', 'OBJECTIVE', 'MARK', 'GOAL', 'AIM']
    ];

    const category = labels[Math.floor(Math.random() * labels.length)];
    const label = category[Math.floor(Math.random() * category.length)];
    
    const labelY = Math.floor(Math.random() * (rows - 2)) + 1;
    const labelX = Math.floor(Math.random() * (cols - label.length - 10)) + 5;
    
    if (labelY < map.length) {
      map[labelY] = map[labelY].substring(0, labelX) + label + map[labelY].substring(labelX + label.length);
    }

    return map;
  }

  /**
   * Draw map into container
   * @param {HTMLElement} containerDiv - The container element
   * @param {Object} options - Options object
   * @param {string} options.color - Text color (default: '#e6e6e6')
   */
  function drawMap(containerDiv, options = {}) {
    if (!containerDiv) return;

    const color = options.color || '#e6e6e6';
    
    // Get container dimensions
    const rect = containerDiv.getBoundingClientRect();
    const width = rect.width || containerDiv.clientWidth;
    const height = rect.height || containerDiv.clientHeight;

    // Calculate grid size based on font metrics
    const fontSize = 12;
    const lineHeight = 12;
    const charWidth = fontSize * 0.6; // Approximate monospace char width

    const cols = Math.floor(width / charWidth);
    const rows = Math.floor(height / lineHeight);

    if (cols <= 0 || rows <= 0) return;

    // Generate map
    const mapLines = generateMap(cols, rows);
    const mapText = mapLines.join('\n');

    // Find or create pre element
    let pre = containerDiv.querySelector('pre.ascii-map');
    if (!pre) {
      pre = document.createElement('pre');
      pre.className = 'ascii-map';
      containerDiv.appendChild(pre);
    }

    // Set content and color
    pre.textContent = mapText;
    pre.style.color = color;
  }

  /**
   * Enable auto-resize for a container
   * @param {HTMLElement} containerDiv - The container element
   * @param {Object} options - Options object
   */
  function enableAutoResize(containerDiv, options = {}) {
    if (!containerDiv || !window.ResizeObserver) return;

    // Disconnect existing observer if any
    disableAutoResize(containerDiv);

    // Create new observer
    const observer = new ResizeObserver(() => {
      drawMap(containerDiv, options);
    });

    observer.observe(containerDiv);
    resizeObservers.set(containerDiv, observer);

    // Draw initial map
    drawMap(containerDiv, options);
  }

  /**
   * Disable auto-resize for a container
   * @param {HTMLElement} containerDiv - The container element
   */
  function disableAutoResize(containerDiv) {
    if (!containerDiv) return;

    const observer = resizeObservers.get(containerDiv);
    if (observer) {
      observer.disconnect();
      resizeObservers.delete(containerDiv);
    }
  }

  // Public API
  return {
    drawMap,
    enableAutoResize,
    disableAutoResize
  };
})();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AsciiMapGenerator;
}
