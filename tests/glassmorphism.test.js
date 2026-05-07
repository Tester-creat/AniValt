/**
 * Glassmorphism CSS Property Tests
 *
 * These tests verify that the glassmorphism CSS rules are correctly defined
 * in styles.css. They read the CSS file as a string and assert that the
 * required properties are present for each component.
 *
 * Validates: Requirements 1.1, 1.2, 1.5
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(__dirname, '../styles.css'), 'utf8');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the CSS rule block(s) for a given selector.
 * Handles compact single-line rules and multi-line rules.
 * Returns the concatenated content of all matching rule blocks.
 *
 * @param {string} selector - Plain CSS selector, e.g. ".continue-card"
 * @returns {string|null}
 */
function getRuleBlock(selector) {
  // Escape special regex chars in the selector string
  const escaped = selector.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  // Match the selector (possibly preceded by whitespace/newline) followed by {…}
  // Use [\s\S]*? to handle both single-line and multi-line blocks
  const pattern = new RegExp(
    '(?:^|\\n)\\s*' + escaped + '\\s*\\{([\\s\\S]*?)\\}',
    'g'
  );
  let combined = '';
  let match;
  while ((match = pattern.exec(css)) !== null) {
    combined += match[1];
  }
  return combined.length > 0 ? combined : null;
}

/**
 * Check whether a CSS property:value pair appears inside a rule block string.
 * Handles optional whitespace around the colon.
 *
 * @param {string} block - CSS rule block content
 * @param {string} property - CSS property name (plain string)
 * @param {string} valuePattern - Regex pattern for the value
 * @returns {boolean}
 */
function ruleHas(block, property, valuePattern) {
  if (!block) return false;
  const escapedProp = property.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const pattern = new RegExp(escapedProp + '\\s*:\\s*' + valuePattern);
  return pattern.test(block);
}

/**
 * Check whether a CSS property:value pair appears anywhere in the stylesheet.
 *
 * @param {string} property - CSS property name (plain string)
 * @param {string} valuePattern - Regex pattern for the value
 * @returns {boolean}
 */
function cssHas(property, valuePattern) {
  const escapedProp = property.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  const pattern = new RegExp(escapedProp + '\\s*:\\s*' + valuePattern);
  return pattern.test(css);
}

// ─── Glass card components — backdrop-filter and background ──────────────────

describe('Glass card components — backdrop-filter and background', () => {
  it('.continue-card has backdrop-filter: blur(12px)', () => {
    const block = getRuleBlock('.continue-card');
    expect(block).not.toBeNull();
    expect(ruleHas(block, 'backdrop-filter', 'blur\\(12px\\)')).toBe(true);
  });

  it('.continue-card has background: var(--glass-bg)', () => {
    const block = getRuleBlock('.continue-card');
    expect(ruleHas(block, 'background', 'var\\(--glass-bg\\)')).toBe(true);
  });

  it('.poster-card has backdrop-filter: blur(12px)', () => {
    const block = getRuleBlock('.poster-card');
    expect(block).not.toBeNull();
    expect(ruleHas(block, 'backdrop-filter', 'blur\\(12px\\)')).toBe(true);
  });

  it('.poster-card has background: var(--glass-bg)', () => {
    const block = getRuleBlock('.poster-card');
    expect(ruleHas(block, 'background', 'var\\(--glass-bg\\)')).toBe(true);
  });

  it('.discover-card has backdrop-filter: blur(12px)', () => {
    const block = getRuleBlock('.discover-card');
    expect(block).not.toBeNull();
    expect(ruleHas(block, 'backdrop-filter', 'blur\\(12px\\)')).toBe(true);
  });

  it('.discover-card has background: var(--glass-bg)', () => {
    const block = getRuleBlock('.discover-card');
    expect(ruleHas(block, 'background', 'var\\(--glass-bg\\)')).toBe(true);
  });

  it('.stats-strip has backdrop-filter: blur(16px)', () => {
    const block = getRuleBlock('.stats-strip');
    expect(block).not.toBeNull();
    expect(ruleHas(block, 'backdrop-filter', 'blur\\(16px\\)')).toBe(true);
  });

  it('.stats-strip has background: var(--glass-bg)', () => {
    const block = getRuleBlock('.stats-strip');
    expect(ruleHas(block, 'background', 'var\\(--glass-bg\\)')).toBe(true);
  });

  it('.library-toolbar has backdrop-filter: blur(12px)', () => {
    const block = getRuleBlock('.library-toolbar');
    expect(block).not.toBeNull();
    expect(ruleHas(block, 'backdrop-filter', 'blur\\(12px\\)')).toBe(true);
  });

  it('.library-toolbar has background: var(--glass-bg)', () => {
    const block = getRuleBlock('.library-toolbar');
    expect(ruleHas(block, 'background', 'var\\(--glass-bg\\)')).toBe(true);
  });

  it('.watch-sidebar has backdrop-filter: blur(20px)', () => {
    const block = getRuleBlock('.watch-sidebar');
    expect(block).not.toBeNull();
    expect(ruleHas(block, 'backdrop-filter', 'blur\\(20px\\)')).toBe(true);
  });

  it('.watch-sidebar has background: var(--glass-bg)', () => {
    const block = getRuleBlock('.watch-sidebar');
    expect(ruleHas(block, 'background', 'var\\(--glass-bg\\)')).toBe(true);
  });
});

// ─── Glass card components — border ──────────────────────────────────────────

describe('Glass card components — border', () => {
  const cards = ['.continue-card', '.poster-card', '.discover-card'];

  for (const selector of cards) {
    it(`${selector} has a 1px solid glass border`, () => {
      const block = getRuleBlock(selector);
      expect(block).not.toBeNull();
      // Accept either var(--glass-border) or the literal rgba value
      const hasVarBorder = ruleHas(block, 'border', '1px solid var\\(--glass-border\\)');
      const hasLiteralBorder = ruleHas(block, 'border', '1px solid rgba\\(255,\\s*255,\\s*255,\\s*0\\.07\\)');
      expect(hasVarBorder || hasLiteralBorder).toBe(true);
    });
  }
});

// ─── Card hover states — transform and box-shadow ────────────────────────────

describe('Card hover states — transform and box-shadow', () => {
  it('.continue-card:hover has transform: scale(...)', () => {
    const block = getRuleBlock('.continue-card:hover');
    expect(block).not.toBeNull();
    expect(ruleHas(block, 'transform', 'scale\\(')).toBe(true);
  });

  it('.continue-card:hover has box-shadow with rgba values', () => {
    const block = getRuleBlock('.continue-card:hover');
    expect(block).not.toBeNull();
    // box-shadow value contains rgba() color stops
    expect(/box-shadow\s*:[^;]*rgba\(/.test(block)).toBe(true);
  });

  it('.poster-card:hover has transform: scale(...)', () => {
    const block = getRuleBlock('.poster-card:hover');
    expect(block).not.toBeNull();
    expect(ruleHas(block, 'transform', 'scale\\(')).toBe(true);
  });

  it('.poster-card:hover has box-shadow with rgba values', () => {
    const block = getRuleBlock('.poster-card:hover');
    expect(block).not.toBeNull();
    // box-shadow value contains rgba() color stops
    expect(/box-shadow\s*:[^;]*rgba\(/.test(block)).toBe(true);
  });

  it('.discover-card:hover has transform: scale(...)', () => {
    const block = getRuleBlock('.discover-card:hover');
    expect(block).not.toBeNull();
    expect(ruleHas(block, 'transform', 'scale\\(')).toBe(true);
  });

  it('.discover-card:hover has box-shadow with rgba values', () => {
    const block = getRuleBlock('.discover-card:hover');
    expect(block).not.toBeNull();
    // box-shadow value contains rgba() color stops
    expect(/box-shadow\s*:[^;]*rgba\(/.test(block)).toBe(true);
  });
});

// ─── Cross-browser support — -webkit-backdrop-filter ─────────────────────────

describe('Cross-browser support — -webkit-backdrop-filter', () => {
  const components = [
    '.continue-card',
    '.poster-card',
    '.discover-card',
    '.stats-strip',
    '.library-toolbar',
    '.watch-sidebar',
  ];

  for (const selector of components) {
    it(`${selector} has -webkit-backdrop-filter alongside backdrop-filter`, () => {
      const block = getRuleBlock(selector);
      expect(block).not.toBeNull();
      expect(/-webkit-backdrop-filter/.test(block)).toBe(true);
    });
  }

  it('-webkit-backdrop-filter is present in the stylesheet globally', () => {
    expect(css).toContain('-webkit-backdrop-filter');
  });
});

// ─── Hero section — viewport min-heights ─────────────────────────────────────

describe('Hero section — viewport min-heights', () => {
  it('.hero-section has min-height: 400px in base styles', () => {
    // Search for the base .hero-section rule (outside any @media block)
    // by finding the first occurrence of .hero-section { ... }
    const pattern = /\.hero-section\s*\{([^}]*)\}/;
    const match = css.match(pattern);
    expect(match).not.toBeNull();
    expect(/min-height\s*:\s*400px/.test(match[1])).toBe(true);
  });

  it('.hero-section has min-height: 300px inside the mobile breakpoint (@media max-width: 768px)', () => {
    // There are multiple @media (max-width: 768px) blocks.
    // Find the one that contains .hero-section by scanning all occurrences.
    const mediaQuery = '@media (max-width: 768px)';
    let searchFrom = 0;
    let foundMediaBlock = null;

    while (searchFrom < css.length) {
      const mediaStart = css.indexOf(mediaQuery, searchFrom);
      if (mediaStart === -1) break;

      // Find the opening brace of this media block
      const braceOpen = css.indexOf('{', mediaStart);
      if (braceOpen === -1) break;

      // Walk forward to find the matching closing brace
      let depth = 0;
      let i = braceOpen;
      while (i < css.length) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}') {
          depth--;
          if (depth === 0) break;
        }
        i++;
      }
      const mediaBlock = css.slice(braceOpen, i + 1);

      // Check if this block contains .hero-section
      if (mediaBlock.includes('.hero-section')) {
        foundMediaBlock = mediaBlock;
        break;
      }

      searchFrom = i + 1;
    }

    expect(foundMediaBlock).not.toBeNull();

    // Within the media block, find .hero-section rule
    const heroPattern = /\.hero-section\s*\{([^}]*)\}/;
    const heroMatch = foundMediaBlock.match(heroPattern);
    expect(heroMatch).not.toBeNull();
    expect(/min-height\s*:\s*300px/.test(heroMatch[1])).toBe(true);
  });
});

// ─── Theme CSS variables ──────────────────────────────────────────────────────

describe('Theme CSS variables', () => {
  it('dark theme (:root) has --glass-bg: rgba(15, 15, 30, 0.45)', () => {
    const rootPattern = /:root\s*\{([^}]*)\}/s;
    const rootMatch = css.match(rootPattern);
    expect(rootMatch).not.toBeNull();
    expect(/--glass-bg\s*:\s*rgba\(15,\s*15,\s*30,\s*0\.45\)/.test(rootMatch[1])).toBe(true);
  });

  it('light theme ([data-theme="light"]) has --glass-bg: rgba(255, 253, 255, 0.65)', () => {
    const lightPattern = /\[data-theme="light"\]\s*\{([^}]*)\}/s;
    const lightMatch = css.match(lightPattern);
    expect(lightMatch).not.toBeNull();
    expect(/--glass-bg\s*:\s*rgba\(255,\s*253,\s*255,\s*0\.65\)/.test(lightMatch[1])).toBe(true);
  });

  it('dark theme (:root) defines --glass-border', () => {
    const rootPattern = /:root\s*\{([^}]*)\}/s;
    const rootMatch = css.match(rootPattern);
    expect(rootMatch).not.toBeNull();
    expect(/--glass-border/.test(rootMatch[1])).toBe(true);
  });

  it('light theme ([data-theme="light"]) defines --glass-border', () => {
    const lightPattern = /\[data-theme="light"\]\s*\{([^}]*)\}/s;
    const lightMatch = css.match(lightPattern);
    expect(lightMatch).not.toBeNull();
    expect(/--glass-border/.test(lightMatch[1])).toBe(true);
  });
});
