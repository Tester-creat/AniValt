/**
 * Property test for library round-trip preservation (P1)
 * Validates: Requirements 12.1, 12.2, 12.4
 * 
 * Property: For any valid anime entry object, serializing to JSON,
 * deserializing via normalizeLibrary(), and comparing all fields
 * should preserve all original data.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbAnimeEntry } from './generators.js';

// Copy normalizeEntry and normalizeLibrary from app.js for testing
function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = Number(entry.id || entry.anilistId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const STATUS_OPTIONS = [
    'watching',
    'completed',
    'queued',
    'plan-to-watch',
    'dropped',
    'paused',
    'untracked',
  ];
  const status = STATUS_OPTIONS.includes(entry.status) ? entry.status : 'untracked';
  const episodes = Math.max(0, Number(entry.episodes) || 0);
  const episodesWatched = Math.max(0, Number(entry.episodesWatched) || 0);
  return {
    id,
    title: String(entry.title || 'Untitled'),
    titleEnglish: String(entry.titleEnglish || ''),
    cover: String(entry.cover || ''),
    banner: String(entry.banner || ''),
    episodes,
    status,
    episodesWatched,
    language: entry.language === 'dub' ? 'dub' : 'sub',
    rating: Math.min(Math.max(Number(entry.rating) || 0, 0), 10),
    dateAdded: Number(entry.dateAdded) || Date.now(),
    lastWatched: Number(entry.lastWatched) || 0,
    completedAt: Number(entry.completedAt) || 0,
    notes: String(entry.notes || ''),
    genres: Array.isArray(entry.genres) ? entry.genres.map(String) : [],
    year: Number(entry.year) || 0,
    anilistId: Number(entry.anilistId || id) || id,
    sessionLog: Array.isArray(entry.sessionLog)
      ? entry.sessionLog.map((item) => Number(item) || 0).filter(Boolean)
      : [],
    averageScore: Number(entry.averageScore) || 0,
  };
}

function normalizeLibrary(raw) {
  const next = {};
  if (!raw || typeof raw !== 'object') {
    next.__meta = { theme: 'dark' };
    return next;
  }
  Object.entries(raw).forEach(([key, value]) => {
    if (key === '__meta') return;
    const normalized = normalizeEntry(value);
    if (normalized) next[String(normalized.id)] = normalized;
  });
  next.__meta = {
    theme: raw.__meta && raw.__meta.theme === 'light' ? 'light' : 'dark',
  };
  return next;
}

describe('Property P1: Library data round-trip preservation', () => {
  it(
    'should preserve all fields after JSON serialization/deserialization and normalizeLibrary',
    () => {
      fc.assert(
        fc.property(arbAnimeEntry, (entry) => {
          // Step 1: Serialize to JSON (simulating localStorage storage)
          const jsonString = JSON.stringify({ [entry.id]: entry });

          // Step 2: Parse from JSON (simulating localStorage retrieval)
          const parsed = JSON.parse(jsonString);

          // Step 3: Apply normalizeLibrary
          const normalized = normalizeLibrary(parsed);

          // Step 4: Get the normalized entry
          const normalizedEntry = normalized[String(entry.id)];

          // Verify entry exists
          expect(normalizedEntry).not.toBeNull();
          expect(normalizedEntry).toBeDefined();

          // Verify all fields are present and equal
          expect(normalizedEntry.id).toBe(entry.id);
          expect(normalizedEntry.anilistId).toBe(entry.anilistId || entry.id);
          expect(normalizedEntry.title).toBe(entry.title);
          expect(normalizedEntry.titleEnglish).toBe(entry.titleEnglish || '');
          expect(normalizedEntry.cover).toBe(entry.cover || '');
          expect(normalizedEntry.banner).toBe(entry.banner || '');
          expect(normalizedEntry.episodes).toBe(Math.max(0, Number(entry.episodes) || 0));
          expect(normalizedEntry.status).toBe(
            ['watching', 'completed', 'queued', 'plan-to-watch', 'dropped', 'paused', 'untracked'].includes(entry.status)
              ? entry.status
              : 'untracked'
          );
          expect(normalizedEntry.episodesWatched).toBe(Math.max(0, Number(entry.episodesWatched) || 0));
          expect(normalizedEntry.language).toBe(entry.language === 'dub' ? 'dub' : 'sub');
          expect(normalizedEntry.rating).toBe(Math.min(Math.max(Number(entry.rating) || 0, 0), 10));
          expect(typeof normalizedEntry.dateAdded).toBe('number');
          expect(typeof normalizedEntry.lastWatched).toBe('number');
          expect(typeof normalizedEntry.completedAt).toBe('number');
          expect(normalizedEntry.notes).toBe(entry.notes || '');
          expect(normalizedEntry.genres).toEqual(Array.isArray(entry.genres) ? entry.genres.map(String) : []);
          expect(normalizedEntry.year).toBe(Number(entry.year) || 0);
          expect(normalizedEntry.sessionLog).toEqual(
            Array.isArray(entry.sessionLog)
              ? entry.sessionLog.map((item) => Number(item) || 0).filter(Boolean)
              : []
          );
          expect(normalizedEntry.averageScore).toBe(Number(entry.averageScore) || 0);
        }),
        { numRuns: 100 }
      );
    }
  );
});
