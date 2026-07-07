import { Router } from 'express';
import { getWeekKey } from '@flowplan/engine';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { createGoalSchema, updateGoalSchema, weekKeySchema } from '../utils/validation.js';
import { toGoalDto } from '../mappers/goal.js';

const router = Router();
router.use(requireAuth);

function resolveWeekKey(queryWeek: unknown): string {
  const parsed = weekKeySchema.safeParse(queryWeek);
  return parsed.success ? parsed.data : getWeekKey();
}

router.get('/', async (req: AuthRequest, res) => {
  const weekKey = resolveWeekKey(req.query.week as string | undefined);
  const goals = await prisma.weeklyGoal.findMany({
    where: { userId: req.userId!, weekKey },
    orderBy: { title: 'asc' },
  });
  res.json({ goals: goals.map(toGoalDto), weekKey });
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const weekKey = data.weekKey ?? getWeekKey();

  const goal = await prisma.weeklyGoal.create({
    data: {
      userId: req.userId!,
      title: data.title,
      targetHours: data.targetHours,
      currentHours: data.currentHours ?? 0,
      color: data.color ?? '#6366F1',
      weekKey,
      projectId: data.projectId ?? null,
    },
  });

  res.status(201).json({ goal: toGoalDto(goal) });
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const parsed = updateGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.weeklyGoal.findFirst({
    where: { id: req.params.id as string, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: 'Meta no encontrada' });
    return;
  }

  const data = parsed.data;
  const goal = await prisma.weeklyGoal.update({
    where: { id: existing.id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.targetHours !== undefined && { targetHours: data.targetHours }),
      ...(data.currentHours !== undefined && { currentHours: data.currentHours }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.projectId !== undefined && { projectId: data.projectId }),
    },
  });

  res.json({ goal: toGoalDto(goal) });
});

router.post('/:id/add-hours', async (req: AuthRequest, res) => {
  const hours = Number(req.body?.hours ?? 0.5);
  if (hours <= 0 || hours > 24) {
    res.status(400).json({ error: 'hours debe ser entre 0 y 24' });
    return;
  }

  const existing = await prisma.weeklyGoal.findFirst({
    where: { id: req.params.id as string, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: 'Meta no encontrada' });
    return;
  }

  const next = Math.min(existing.currentHours + hours, existing.targetHours);
  const goal = await prisma.weeklyGoal.update({
    where: { id: existing.id },
    data: { currentHours: next },
  });

  res.json({ goal: toGoalDto(goal) });
});

export default router;
