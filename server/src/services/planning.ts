import {
  computeWeeklyScore,
  getRecommendation,
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

export async function buildRecommendation(
  userId: string,
  date: string,
  freeBlocks: ReturnType<typeof computeFreeBlocks>
): Promise<RecommendationDto | null> {
  const weekKey = getWeekKey(new Date(date + 'T12:00:00'));
  const now = new Date();
  const hour =
    date === now.toISOString().slice(0, 10) ? now.getHours() + now.getMinutes() / 60 : 0;

  const [tasks, goals, routines] = await Promise.all([
    prisma.task.findMany({ where: { userId, weekKey }, include: { project: true } }),
    prisma.weeklyGoal.findMany({
      where: { userId, weekKey },
      include: { project: true },
    }),
    prisma.routine.findMany({ where: { userId } }),
  ]);

  const hasPendingCriticalTasks = tasks.some(
    (t) => t.priority === 'critica' && t.status !== 'completada'
  );

  return getRecommendation({
    freeBlocks,
    date,
    currentHour: hour,
    hasPendingCriticalTasks,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      category: t.project?.title ?? 'Tarea',
      projectId: t.projectId,
      deadline: t.deadline,
    })),
    goals: goals.map((g) => ({
      id: g.id,
      title: g.title,
      category: g.project?.title ?? 'Meta',
      targetHours: g.targetHours,
      currentHours: g.currentHours,
      projectId: g.projectId,
      projectType: g.project?.type ?? 'personal',
    })),
    routines: routines.map((r) => ({
      id: r.id,
      title: r.title,
      completedToday: r.completedToday,
    })),
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
