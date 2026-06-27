/**
 * Design-system smoke tests — assert the premium Netflix-style styling
 * contract is present in styles.css (glassmorphism, brand gradient, core
 * components) and that the dark text/background tokens are high-contrast.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { calculateContrastRatio } from "./generators.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(__dirname, "../styles.css"), "utf8");

describe("CSS design system", () => {
  it("applies glassmorphism (backdrop-filter blur) to the top bar and overlays", () => {
    const blurCount = (css.match(/backdrop-filter:\s*blur/g) || []).length;
    expect(blurCount).toBeGreaterThanOrEqual(2);
    expect(css).toMatch(/\.topbar\s*\{[^}]*backdrop-filter/s);
    expect(css).toMatch(/\.overlay\s*\{[^}]*backdrop-filter/s);
  });

  it("defines the brand gradient and Netflix-red accent tokens", () => {
    expect(css).toMatch(/--grad-brand:\s*linear-gradient/);
    expect(css).toMatch(/--red:\s*#e50914/i);
  });

  it("includes the core premium components", () => {
    [".hero", ".hero__slide", ".card", ".card__hover", ".row__track",
     ".watch__player", ".modal", ".skel-card", ".mobile-nav"].forEach((sel) => {
      expect(css.includes(sel)).toBe(true);
    });
  });

  it("ships hover-scale card interactions", () => {
    expect(css).toMatch(/\.card:hover\s+\.card__media\s*\{[^}]*scale/s);
    expect(css).toMatch(/\.card:hover\s+\.card__hover\s*\{[^}]*opacity:\s*1/s);
  });

  it("respects reduced-motion preferences", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it("dark theme primary text on background meets WCAG AA", () => {
    // tokens from :root — keep in sync with styles.css
    const text = "#f4f4f6";
    const bg = "#08080b";
    expect(calculateContrastRatio(text, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
