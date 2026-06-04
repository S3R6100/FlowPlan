import { Router } from 'express';
import { todayDateString } from '@flowplan/engine';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { createRoutineSchema } from '../utils/validation.js';

const router = Router();
router.use(requireAuth);

async function syncRoutinesForToday(userId: string) {
  const today = todayDateString();
  await prisma.routine.updateMany({
    where: {
      userId,
      lastCompletedOn: { not: today },
    },
    data: { completedToday: false },
  });
}

router.get('/', async (req: AuthRequest, res) => {
  await syncRoutinesForToday(req.userId!);
  const routines = await prisma.routine.findMany({
    where: { userId: req.userId! },
    orderBy: { title: 'asc' },
  });
  res.json({
    routines: routines.map((r) => ({
      id: r.id,
      title: r.title,
      completedToday: r.completedToday,
    })),
  });
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createRoutineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const routine = await prisma.routine.create({
    data: { userId: req.userId!, title: parsed.data.title },
  });

  res.status(201).json({
    routine: { id: routine.id, title: routine.title, completedToday: false },
  });
});

router.patch('/:id/toggle', async (req: AuthRequest, res) => {
  const today = todayDateString();
  const existing = await prisma.routine.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: 'Rutina no encontrada' });
    return;
  }

  const completedToday = !existing.completedToday;
  const routine = await prisma.routine.update({
    where: { id: existing.id },
    data: {
      completedToday,
      lastCompletedOn: completedToday ? today : null,
    },
  });

  res.json({
    routine: {
      id: routine.id,
      title: routine.title,
      completedToday: routine.completedToday,
    },
  });
});

export default router;
