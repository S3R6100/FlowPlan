import type { TaskPriority, TaskStatus, WeekMode, WeeklyRank } from '@flowplan/shared';

export interface ScoreTaskInput {
  priority: TaskPriority | string;
  status: TaskStatus | string;
}

export interface ScoreGoalInput {
  targetHours: number;
  currentHours: number;
  projectType?: string;
}

export interface ScoreMilestoneInput {
  completed: boolean;
  bonusPoints: number;
}

export interface WeeklyScoreInput {
  mode: WeekMode | string;
  tasks: ScoreTaskInput[];
  goals: ScoreGoalInput[];
  milestones: ScoreMilestoneInput[];
}

export interface WeeklyScoreResult {
  totalPoints: number;
  rank: WeeklyRank;
  breakdown: {
    tasks: number;
    goals: number;
    bonuses: number;
    penalties: number;
  };
  hasPendingCriticalTasks: boolean;
}

const TASK_POINTS: Record<string, { done: number; pendingPenalty: number }> = {
  critica: { done: 100, pendingPenalty: 80 },
  alta: { done: 60, pendingPenalty: 30 },
  media: { done: 35, pendingPenalty: 10 },
  baja: { done: 20, pendingPenalty: 0 },
};

function rankFromPoints(points: number): WeeklyRank {
  if (points >= 800) return 'S';
  if (points >= 600) return 'A';
  if (points >= 400) return 'B';
  if (points >= 200) return 'C';
  return 'D';
}

export function computeWeeklyScore(input: WeeklyScoreInput): WeeklyScoreResult {
  const hasPendingCriticalTasks = input.tasks.some(
    (t) => t.priority === 'critica' && t.status !== 'completada'
  );

  const hobbyWeight = hasPendingCriticalTasks ? 0.15 : 0.4;
  const academicWeight = hasPendingCriticalTasks ? 0.7 : 0.35;
  const generalWeight = hasPendingCriticalTasks ? 0.15 : 0.25;

  let tasksPoints = 0;
  let penalties = 0;

  for (const task of input.tasks) {
    const cfg = TASK_POINTS[task.priority] ?? TASK_POINTS.media;
    if (task.status === 'completada') {
      tasksPoints += cfg.done;
    } else if (task.status === 'pendiente' || task.status === 'en_progreso') {
      penalties += cfg.pendingPenalty;
    }
  }

  let goalsPoints = 0;
  for (const goal of input.goals) {
    const ratio = Math.min(goal.currentHours / Math.max(goal.targetHours, 0.01), 1);
    const type = goal.projectType ?? 'personal';
    let weight = generalWeight;
    if (type === 'academic' || type === 'personal') weight = academicWeight;
    if (type === 'hobby') weight = hobbyWeight;
    goalsPoints += Math.round(ratio * weight * 100);
  }

  let bonuses = 0;
  for (const m of input.milestones) {
    if (m.completed) bonuses += m.bonusPoints;
  }

  const allCriticalDone =
    input.tasks.filter((t) => t.priority === 'critica').length > 0 &&
    !hasPendingCriticalTasks;
  if (allCriticalDone) bonuses += 50;

  const totalPoints = Math.max(0, tasksPoints + goalsPoints + bonuses - penalties);

  return {
    totalPoints,
    rank: rankFromPoints(totalPoints),
    breakdown: {
      tasks: tasksPoints,
      goals: goalsPoints,
      bonuses,
      penalties,
    },
    hasPendingCriticalTasks,
  };
}
