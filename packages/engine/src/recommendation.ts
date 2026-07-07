import type { FreeBlockDto, RecommendationDto } from '@flowplan/shared';

export interface RecommendGoal {
  id: string;
  title: string;
  category: string;
  targetHours: number;
  currentHours: number;
  projectId: string | null;
  projectType: string;
}

export interface RecommendTask {
  id: string;
  title: string;
  priority: string;
  status: string;
  category: string;
  projectId: string | null;
  deadline: string | null;
}

export interface RecommendRoutine {
  id: string;
  title: string;
  completedToday: boolean;
}

export interface RecommendInput {
  freeBlocks: FreeBlockDto[];
  goals: RecommendGoal[];
  tasks: RecommendTask[];
  routines: RecommendRoutine[];
  hasPendingCriticalTasks: boolean;
  date: string;
  currentHour?: number;
}

const PRIORITY_SCORE: Record<string, number> = {
  critica: 100,
  alta: 60,
  media: 35,
  baja: 20,
};

interface Candidate {
  score: number;
  kind: 'task' | 'goal' | 'routine';
  title: string;
  category: string;
  goalId: string | null;
  taskId: string | null;
  routineId: string | null;
  projectId: string | null;
  reasons: string[];
  priority: string;
}

export function pickBestFreeBlock(
  freeBlocks: FreeBlockDto[],
  minHours = 0.5,
  currentHour?: number
): FreeBlockDto | null {
  let suitable = freeBlocks.filter((b) => b.endHour - b.startHour >= minHours);

  if (currentHour !== undefined) {
    const upcoming = suitable.filter((b) => b.endHour > currentHour);
    if (upcoming.length > 0) suitable = upcoming;
  }

  suitable.sort((a, b) => b.endHour - b.startHour - (a.endHour - a.startHour));
  return suitable[0] ?? null;
}

export interface IRecommendationStrategy {
  recommend(context: RecommendInput): RecommendationDto | null;
}

export class BalancedStrategy implements IRecommendationStrategy {
  recommend(input: RecommendInput): RecommendationDto | null {
    const block = pickBestFreeBlock(input.freeBlocks, 0.5, input.currentHour);
    if (!block) return null;

    const blockHours = block.endHour - block.startHour;
    const candidates: Candidate[] = [];

    for (const task of input.tasks) {
      if (task.status === 'completada' || task.status === 'fallida') continue;

      let score = PRIORITY_SCORE[task.priority] ?? 20;
      if (task.priority === 'critica' && input.hasPendingCriticalTasks) score += 50;
      if (task.deadline && task.deadline <= input.date) score += 30;

      candidates.push({
        score,
        kind: 'task',
        title: task.title,
        category: task.category,
        goalId: null,
        taskId: task.id,
        routineId: null,
        projectId: task.projectId,
        reasons: [
          `Bloque libre de ${block.startHour}:00 a ${block.endHour}:00 (${blockHours.toFixed(1)}h)`,
          `Prioridad: ${task.priority}`,
        ],
        priority: task.priority,
      });
    }

    for (const goal of input.goals) {
      if (goal.currentHours >= goal.targetHours) continue;

      const deficit = goal.targetHours - goal.currentHours;
      let score = Math.min(deficit * 10, 80);
      if (goal.projectType === 'academic' && input.hasPendingCriticalTasks) score += 40;
      if (goal.projectType === 'hobby' && !input.hasPendingCriticalTasks) score += 35;
      if (goal.projectType === 'hobby' && input.hasPendingCriticalTasks) score *= 0.3;

      candidates.push({
        score,
        kind: 'goal',
        title: goal.title,
        category: goal.category,
        goalId: goal.id,
        taskId: null,
        routineId: null,
        projectId: goal.projectId,
        reasons: [
          `Te faltan ${deficit.toFixed(1)}h de ${goal.targetHours}h esta semana`,
          `Actividad dinámica`,
          `Hueco: ${blockHours.toFixed(1)}h`,
        ],
        priority: 'media',
      });
    }

    for (const routine of input.routines) {
      if (routine.completedToday) continue;

      candidates.push({
        score: input.hasPendingCriticalTasks ? 15 : 45,
        kind: 'routine',
        title: routine.title,
        category: 'Rutina',
        goalId: null,
        taskId: null,
        routineId: routine.id,
        projectId: null,
        reasons: ['Rutina diaria pendiente', `Hueco de ${blockHours.toFixed(1)}h`],
        priority: 'media',
      });
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const sessionHours = Math.min(blockHours, best.kind === 'routine' ? 1 : blockHours);

    return {
      activityTitle: best.title,
      startHour: block.startHour,
      endHour: Math.min(block.endHour, block.startHour + sessionHours),
      category: best.category,
      reasons: best.reasons,
      goalId: best.goalId,
      taskId: best.taskId,
      projectId: best.projectId,
      kind: best.kind,
      routineId: best.routineId,
    };
  }
}

export class AcademicStrategy implements IRecommendationStrategy {
  recommend(input: RecommendInput): RecommendationDto | null {
    const block = pickBestFreeBlock(input.freeBlocks, 0.5, input.currentHour);
    if (!block) return null;

    const blockHours = block.endHour - block.startHour;
    const candidates: Candidate[] = [];

    for (const task of input.tasks) {
      if (task.status === 'completada' || task.status === 'fallida') continue;

      let score = PRIORITY_SCORE[task.priority] ?? 20;
      // In academic mode, critical tasks have massive priority
      if (task.priority === 'critica') score += 100;
      if (task.deadline && task.deadline <= input.date) score += 50;

      candidates.push({
        score,
        kind: 'task',
        title: task.title,
        category: task.category,
        goalId: null,
        taskId: task.id,
        routineId: null,
        projectId: task.projectId,
        reasons: [
          `Bloque libre de ${block.startHour}:00 a ${block.endHour}:00 (${blockHours.toFixed(1)}h)`,
          `Prioridad (Académica): ${task.priority}`,
        ],
        priority: task.priority,
      });
    }

    for (const goal of input.goals) {
      if (goal.currentHours >= goal.targetHours) continue;

      const deficit = goal.targetHours - goal.currentHours;
      let score = Math.min(deficit * 10, 80);
      if (goal.projectType === 'academic') {
        score += 80; // High priority for academic goals
      } else if (goal.projectType === 'hobby') {
        score *= 0.1; // Extremely low priority for hobbies in academic mode
      }

      candidates.push({
        score,
        kind: 'goal',
        title: goal.title,
        category: goal.category,
        goalId: goal.id,
        taskId: null,
        routineId: null,
        projectId: goal.projectId,
        reasons: [
          `Foco académico: ${deficit.toFixed(1)}h restantes`,
          `Hueco: ${blockHours.toFixed(1)}h`,
        ],
        priority: 'media',
      });
    }

    for (const routine of input.routines) {
      if (routine.completedToday) continue;

      candidates.push({
        score: input.hasPendingCriticalTasks ? 5 : 30,
        kind: 'routine',
        title: routine.title,
        category: 'Rutina',
        goalId: null,
        taskId: null,
        routineId: routine.id,
        projectId: null,
        reasons: ['Rutina diaria', `Hueco de ${blockHours.toFixed(1)}h`],
        priority: 'media',
      });
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const sessionHours = Math.min(blockHours, best.kind === 'routine' ? 1 : blockHours);

    return {
      activityTitle: best.title,
      startHour: block.startHour,
      endHour: Math.min(block.endHour, block.startHour + sessionHours),
      category: best.category,
      reasons: best.reasons,
      goalId: best.goalId,
      taskId: best.taskId,
      projectId: best.projectId,
      kind: best.kind,
      routineId: best.routineId,
    };
  }
}
