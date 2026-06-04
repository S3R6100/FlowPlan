export type EventStatus = 'active' | 'cancelled' | 'modified';

/** fixed = horario fijo (clases, trabajo). dynamic = sesión con podómetro / recomendado */
export type EventKind = 'fixed' | 'dynamic';

export interface TimelineEventDto {
  id: string;
  title: string;
  category: string;
  type: EventKind;
  date: string;
  startHour: number;
  endHour: number;
  status: EventStatus;
  color: string | null;
}

export interface FreeBlockDto {
  startHour: number;
  endHour: number;
}

export interface RecommendationDto {
  activityTitle: string;
  startHour: number;
  endHour: number;
  category: string;
  reasons: string[];
  goalId: string | null;
  taskId: string | null;
  projectId: string | null;
  routineId?: string | null;
  kind: 'task' | 'goal' | 'routine';
}

export interface ScheduleResponseDto {
  date: string;
  events: TimelineEventDto[];
  freeBlocks: FreeBlockDto[];
  recommendation: RecommendationDto | null;
}

export type TaskPriority = 'critica' | 'alta' | 'media' | 'baja';

export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'fallida';

export type WeekMode = 'foco_academico' | 'equilibrado' | 'descanso';

export type WeeklyRank = 'S' | 'A' | 'B' | 'C' | 'D';

export interface AuthUserDto {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResponseDto {
  token: string;
  user: AuthUserDto;
}

export interface TaskDto {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  weekKey: string;
  projectId: string | null;
  linkedGoalId: string | null;
  spentMinutes: number;
}

export interface WeeklyGoalDto {
  id: string;
  title: string;
  targetHours: number;
  currentHours: number;
  color: string;
  weekKey: string;
  projectId: string | null;
}

export interface RoutineDto {
  id: string;
  title: string;
  completedToday: boolean;
}

export interface WeekProfileDto {
  weekKey: string;
  mode: WeekMode;
  criticalTaskIds: string[];
}

export interface MilestoneDto {
  id: string;
  title: string;
  bonusPoints: number;
  completed: boolean;
  goalId: string | null;
}

export interface WeekSummaryDto {
  weekKey: string;
  mode: WeekMode;
  totalPoints: number;
  rank: WeeklyRank;
  breakdown: {
    tasks: number;
    goals: number;
    bonuses: number;
    penalties: number;
  };
  goals: WeeklyGoalDto[];
  tasks: TaskDto[];
  milestones: MilestoneDto[];
  hasPendingCriticalTasks: boolean;
}

export interface WorkSessionDto {
  id: string;
  goalId: string | null;
  taskId: string | null;
  minutes: number;
  date: string;
}
