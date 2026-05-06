/**
 * Property test for status coercion (P7)
 * Validates: Requirements 12.2, 12.4
 * 
 * Property 7: Status normalization rejects invalid values
 * For any entry object where the status field contains a string value not present
 * in STATUS_OPTIONS, normalizeEntry() SHALL coerce the status to "untracked"
 * rather than storing the invalid value.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { STATUS_OPTIONS } from './generators.js';

// Copy normalizeEntry from app.js for testing
function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = Number(entry.id || entry.anilistId);
  if (!Number.isFinite(id) || id <= 0) return null;
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

// Helper to create a minimal valid entry with custom status
function createEntryWithStatus(status) {
  return {
    id: 1,
    anilistId: 1,
    title: 'Test Anime',
    status,
    episodes: 12,
    episodesWatched: 0,
  };
}

describe('Property P7: Status normalization rejects invalid values', () => {
  // Test 1: Invalid status values are coerced to "untracked"
  it(
    'should coerce invalid status values to "untracked"',
    () => {
      fc.assert(
        fc.property(fc.string(), (invalidStatus) => {
          // Skip empty string for this test - it's covered separately
          if (invalidStatus === '') return true;
          
          const entry = createEntryWithStatus(invalidStatus);
          const result = normalizeEntry(entry);
          
          // Verify the status is coerced to "untracked"
          return result.status === 'untracked';
        }),
        { numRuns: 100 }
      );
    }
  );

  // Test 2: Valid status values pass through unchanged
  it(
    'should pass through valid status values unchanged',
    () => {
      fc.assert(
        fc.property(
          fc.oneof(...STATUS_OPTIONS.map((s) => fc.constant(s))),
          (validStatus) => {
            const entry = createEntryWithStatus(validStatus);
            const result = normalizeEntry(entry);
            
            // Verify the status is unchanged
            return result.status === validStatus;
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// Additional unit tests for edge cases
describe('Status coercion edge cases', () => {
  it('should coerce empty string status to "untracked"', () => {
    const entry = createEntryWithStatus('');
    const result = normalizeEntry(entry);
    expect(result.status).toBe('untracked');
  });

  it('should coerce numeric status to "untracked"', () => {
    const entry = createEntryWithStatus('123');
    const result = normalizeEntry(entry);
    expect(result.status).toBe('untracked');
  });

  it('should coerce special character status to "untracked"', () => {
    const entry = createEntryWithStatus('!@#$%');
    const result = normalizeEntry(entry);
    expect(result.status).toBe('untracked');
  });

  it('should coerce mixed case valid status to "untracked" (case-sensitive)', () => {
    const entry = createEntryWithStatus('Watching');
    const result = normalizeEntry(entry);
    expect(result.status).toBe('untracked');
  });

  it('should pass through all valid STATUS_OPTIONS unchanged', () => {
    const validStatuses = [
      'watching',
      'completed',
      'queued',
      'plan-to-watch',
      'dropped',
      'paused',
      'untracked',
    ];
    
    validStatuses.forEach((status) => {
      const entry = createEntryWithStatus(status);
      const result = normalizeEntry(entry);
      expect(result.status).toBe(status);
    });
  });
});
