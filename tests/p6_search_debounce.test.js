/**
 * P6 — Search debounce.
 * Rapid keystrokes collapse into a single trailing call after the 350ms idle
 * window — mirroring scheduleSearch() in app.js.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeDebouncer } from "./_appcode.js";

const DELAY = 350;

describe("P6: search debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires once with the latest value after the idle window", () => {
    const run = vi.fn();
    const search = makeDebouncer(run, DELAY);
    ["b", "br", "bre", "brea", "break"].forEach((q) => { search(q); vi.advanceTimersByTime(100); });
    expect(run).not.toHaveBeenCalled();      // still typing within window
    vi.advanceTimersByTime(DELAY);
    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveBeenCalledWith("break");
  });

  it("fires separately for two distinct typing bursts", () => {
    const run = vi.fn();
    const search = makeDebouncer(run, DELAY);
    search("first");
    vi.advanceTimersByTime(DELAY);
    search("second");
    vi.advanceTimersByTime(DELAY);
    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenNthCalledWith(1, "first");
    expect(run).toHaveBeenNthCalledWith(2, "second");
  });

  it("can be cancelled before firing", () => {
    const run = vi.fn();
    const search = makeDebouncer(run, DELAY);
    search("never");
    search.cancel();
    vi.advanceTimersByTime(DELAY * 2);
    expect(run).not.toHaveBeenCalled();
  });
});
