import { getWeekKey } from '@flowplan/engine';
import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { toTaskDto } from '../mappers/task.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { createTaskSchema, updateTaskSchema, weekKeySchema } from '../utils/validation.js';

const router = Router();
router.use(requireAuth);

function resolveWeekKey(queryWeek: unknown): string {
  const parsed = weekKeySchema.safeParse(queryWeek);
  return parsed.success ? parsed.data : getWeekKey();
}

router.get('/', async (req: AuthRequest, res) => {
  const weekKey = resolveWeekKey(req.query.week);
  const tasks = await prisma.task.findMany({
    where: { userId: req.userId!, weekKey },
    orderBy: { createdAt: 'asc' },
  });
  const order: Record<string, number> = { critica: 0, alta: 1, media: 2, baja: 3 };
  tasks.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
  res.json({ tasks: tasks.map(toTaskDto), weekKey });
});

router.get('/criticas', async (req: AuthRequest, res) => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.userId!, priority: 'critica' },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ tasks: tasks.map(toTaskDto) });
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const data = parsed.data;
  const weekKey = data.weekKey ?? getWeekKey();

  const task = await prisma.task.create({
    data: {
      userId: req.userId!,
      title: data.title,
      priority: data.priority ?? 'media',
      status: data.status ?? 'pendiente',
      deadline: data.deadline ?? null,
      weekKey,
      projectId: data.projectId ?? null,
      linkedGoalId: data.linkedGoalId ?? null,
    },
  });

  res.status(201).json({ task: toTaskDto(task) });
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.task.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: 'Tarea no encontrada' });
    return;
  }

  const data = parsed.data;
  const task = await prisma.task.update({
    where: { id: existing.id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.deadline !== undefined && { deadline: data.deadline }),
      ...(data.projectId !== undefined && { projectId: data.projectId }),
      ...(data.linkedGoalId !== undefined && { linkedGoalId: data.linkedGoalId }),
    },
  });

  res.json({ task: toTaskDto(task) });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.task.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: 'Tarea no encontrada' });
    return;
  }
  await prisma.task.delete({ where: { id: existing.id } });
  res.status(204).send();
});

export default router;
