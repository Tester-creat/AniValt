/**
 * Property test for normalization idempotence (P2)
 * Validates: Requirements 12.2, 12.3
 * 
 * Property: For any anime entry object (including malformed or partially-populated),
 * applying normalizeEntry() twice should produce the same result as applying it once.
 * i.e., normalizeEntry(normalizeEntry(x)) is deeply equal to normalizeEntry(x).
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbMalformedEntry } from './generators.js';

// Copy normalizeEntry from app.js for testing
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

// Deep equality helper for comparing normalized entries
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

describe('Property P2: Entry normalization is idempotent', () => {
  it(
    'should produce the same result when normalizeEntry is applied twice',
    () => {
      fc.assert(
        fc.property(arbMalformedEntry, (entry) => {
          // Apply normalizeEntry once
          const result1 = normalizeEntry(entry);
          
          // Apply normalizeEntry again
          const result2 = normalizeEntry(result1);
          
          // Verify deep equality
          expect(deepEqual(result1, result2)).toBe(true);
        }),
        { numRuns: 100 }
      );
    }
  );
});
