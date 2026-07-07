import {
  computeWeeklyScore,
  getWeekKey,
} from '@flowplan/engine';
import type { RecommendationDto, WeekSummaryDto } from '@flowplan/shared';
import { prisma } from '../lib/prisma.js';
import { toGoalDto } from '../mappers/goal.js';
import { toTaskDto } from '../mappers/task.js';
import { toMilestoneDto } from '../mappers/milestone.js';
import type { computeFreeBlocks } from '@flowplan/engine';
export async function getOrCreateWeekProfile(userId: string, weekKey: string) {
  return prisma.weekProfile.upsert({
    where: { userId_weekKey: { userId, weekKey } },
    create: { userId, weekKey, mode: 'equilibrado', criticalTaskIds: [] },
    update: {},
  });
}

export async function buildWeekSummary(
  userId: string,
  weekKey: string
): Promise<WeekSummaryDto> {
  const profile = await getOrCreateWeekProfile(userId, weekKey);

  const [tasks, goals, milestones] = await Promise.all([
    prisma.task.findMany({ where: { userId, weekKey } }),
    prisma.weeklyGoal.findMany({
      where: { userId, weekKey },
      include: { project: true },
    }),
    prisma.milestone.findMany({
      where: { userId, goal: { weekKey } },
    }),
  ]);

  const score = computeWeeklyScore({
    mode: profile.mode,
    tasks: tasks.map((t) => ({ priority: t.priority, status: t.status })),
    goals: goals.map((g) => ({
      targetHours: g.targetHours,
      currentHours: g.currentHours,
      projectType: g.project?.type,
    })),
    milestones: milestones.map((m) => ({
      completed: m.completed,
      bonusPoints: m.bonusPoints,
    })),
  });

  return {
    weekKey,
    mode: profile.mode as WeekSummaryDto['mode'],
    totalPoints: score.totalPoints,
    rank: score.rank,
    breakdown: score.breakdown,
    goals: goals.map(toGoalDto),
    tasks: tasks.map(toTaskDto),
    milestones: milestones.map(toMilestoneDto),
    hasPendingCriticalTasks: score.hasPendingCriticalTasks,
  };
}
