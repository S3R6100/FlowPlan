import type { WeeklyGoal } from '@prisma/client';
import type { WeeklyGoalDto } from '@flowplan/shared';

export function toGoalDto(goal: WeeklyGoal): WeeklyGoalDto {
  return {
    id: goal.id,
    title: goal.title,
    targetHours: goal.targetHours,
    currentHours: goal.currentHours,
    color: goal.color,
    weekKey: goal.weekKey,
    projectId: goal.projectId,
  };
}
