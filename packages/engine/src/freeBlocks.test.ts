import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeFreeBlocks } from './freeBlocks.js';

describe('computeFreeBlocks', () => {
  it('returns full day when no events', () => {
    assert.deepEqual(computeFreeBlocks([]), [{ startHour: 0, endHour: 24 }]);
  });

  it('excludes cancelled events', () => {
    const free = computeFreeBlocks([
      { startHour: 8, endHour: 10, status: 'cancelled' },
    ]);
    assert.deepEqual(free, [{ startHour: 0, endHour: 24 }]);
  });

  it('ignores dynamic events when computing free blocks', () => {
    const free = computeFreeBlocks([
      { startHour: 8, endHour: 10, status: 'active', type: 'fixed' },
      { startHour: 10, endHour: 12, status: 'active', type: 'dynamic' },
    ]);
    assert.ok(free.some((b) => b.startHour === 0 && b.endHour === 8));
    assert.ok(free.some((b) => b.startHour === 10 && b.endHour === 24));
  });

  it('computes gaps between active events', () => {
    const free = computeFreeBlocks([
      { startHour: 8, endHour: 10, status: 'active' },
      { startHour: 14, endHour: 16, status: 'active' },
    ]);
    assert.ok(free.some((b) => b.startHour === 0 && b.endHour === 8));
    assert.ok(free.some((b) => b.startHour === 10 && b.endHour === 14));
    assert.ok(free.some((b) => b.startHour === 16 && b.endHour === 24));
  });
});
