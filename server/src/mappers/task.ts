import type { Task } from '@prisma/client';
import type { TaskDto } from '@flowplan/shared';

export function toTaskDto(task: Task): TaskDto {
  return {
    id: task.id,
    title: task.title,
    priority: task.priority as TaskDto['priority'],
    status: task.status as TaskDto['status'],
    deadline: task.deadline,
    weekKey: task.weekKey,
    projectId: task.projectId,
    linkedGoalId: task.linkedGoalId,
    spentMinutes: task.spentMinutes,
  };
}
