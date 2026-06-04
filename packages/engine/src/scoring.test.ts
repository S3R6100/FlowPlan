import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeWeeklyScore } from './scoring.js';

describe('computeWeeklyScore', () => {
  it('penalizes pending critical tasks', () => {
    const result = computeWeeklyScore({
      mode: 'foco_academico',
      tasks: [{ priority: 'critica', status: 'pendiente' }],
      goals: [],
      milestones: [],
    });
    assert.equal(result.hasPendingCriticalTasks, true);
    assert.ok(result.breakdown.penalties >= 80);
  });

  it('rewards completed critical task', () => {
    const result = computeWeeklyScore({
      mode: 'equilibrado',
      tasks: [{ priority: 'critica', status: 'completada' }],
      goals: [],
      milestones: [],
    });
    assert.ok(result.breakdown.tasks >= 100);
  });
});
