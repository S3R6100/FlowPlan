import type { Milestone } from '@prisma/client';
import type { MilestoneDto } from '@flowplan/shared';

export function toMilestoneDto(m: Milestone): MilestoneDto {
  return {
    id: m.id,
    title: m.title,
    bonusPoints: m.bonusPoints,
    completed: m.completed,
    goalId: m.goalId,
  };
}
