import { z } from 'zod';

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD');

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createEventSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
  type: z.enum(['fixed', 'dynamic']).optional(),
  date: dateStringSchema,
  startHour: z.number().min(0).max(24),
  endHour: z.number().min(0).max(24),
  color: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'modified']).optional(),
});

export const updateEventSchema = createEventSchema.partial();

export function parseDateParam(value: unknown): string | null {
  const result = dateStringSchema.safeParse(value);
  return result.success ? result.data : null;
}

export const weekKeySchema = z.string().regex(/^\d{4}-W\d{2}$/);

export const createTaskSchema = z.object({
  title: z.string().min(1),
  priority: z.enum(['critica', 'alta', 'media', 'baja']).optional(),
  status: z.enum(['pendiente', 'en_progreso', 'completada', 'fallida']).optional(),
  deadline: dateStringSchema.optional().nullable(),
  weekKey: weekKeySchema.optional(),
  projectId: z.string().optional().nullable(),
  linkedGoalId: z.string().optional().nullable(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const createGoalSchema = z.object({
  title: z.string().min(1),
  targetHours: z.number().positive(),
  currentHours: z.number().min(0).optional(),
  color: z.string().optional(),
  weekKey: weekKeySchema.optional(),
  projectId: z.string().optional().nullable(),
});

export const updateGoalSchema = createGoalSchema.partial();

export const weekProfileSchema = z
  .object({
    weekKey: weekKeySchema.optional(),
    mode: z.enum(['foco_academico', 'equilibrado', 'descanso']).optional(),
    criticalTaskIds: z.array(z.string()).optional(),
  })
  .refine((data) => data.mode !== undefined || data.criticalTaskIds !== undefined, {
    message: 'mode o criticalTaskIds requerido',
  });

export const createSessionSchema = z.object({
  goalId: z.string().optional().nullable(),
  taskId: z.string().optional().nullable(),
  routineId: z.string().optional().nullable(),
  minutes: z.number().positive(),
  date: dateStringSchema.optional(),
  title: z.string().optional(),
  startHour: z.number().min(0).max(24).optional(),
  endHour: z.number().min(0).max(24).optional(),
  color: z.string().optional(),
  skipDynamicEvent: z.boolean().optional(),
});

export const createRoutineSchema = z.object({
  title: z.string().min(1),
});

export const createMissionSchema = z.object({
  title: z.string().min(1),
  date: dateStringSchema.optional(),
  deadlineHour: z.number().min(0).max(24).optional().nullable(),
});
