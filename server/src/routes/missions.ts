import { Router } from 'express';
import { todayDateString } from '@flowplan/engine';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { createMissionSchema, parseDateParam } from '../utils/validation.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const date = parseDateParam(req.query.date as string | undefined) ?? todayDateString();
  const missions = await prisma.dailyMission.findMany({
    where: { userId: req.userId!, date },
  });
  res.json({ missions, date });
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createMissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const mission = await prisma.dailyMission.create({
    data: {
      userId: req.userId!,
      title: parsed.data.title,
      date: parsed.data.date ?? todayDateString(),
      deadlineHour: parsed.data.deadlineHour ?? null,
    },
  });

  res.status(201).json({ mission });
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const status = req.body?.status;
  if (!['pendiente', 'completada', 'fallida'].includes(status)) {
    res.status(400).json({ error: 'status inválido' });
    return;
  }

  const existing = await prisma.dailyMission.findFirst({
    where: { id: req.params.id as string, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: 'Misión no encontrada' });
    return;
  }

  const mission = await prisma.dailyMission.update({
    where: { id: existing.id },
    data: { status },
  });

  res.json({ mission });
});

export default router;
