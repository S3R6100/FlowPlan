import { Router } from 'express';
import { computeFreeBlocks } from '@flowplan/engine';
import type { ScheduleResponseDto } from '@flowplan/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { parseDateParam } from '../utils/validation.js';
import { toEventDto } from '../mappers/event.js';
import { plannerService } from '../di.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const date = parseDateParam(req.query.date as string | undefined);
  if (!date) {
    res.status(400).json({ error: 'Query param date=YYYY-MM-DD es requerido' });
    return;
  }

  const events = await prisma.event.findMany({
    where: { userId: req.userId!, date },
    orderBy: { startHour: 'asc' },
  });

  const freeBlocks = computeFreeBlocks(
    events.map((e) => ({
      startHour: e.startHour,
      endHour: e.endHour,
      status: e.status,
      type: e.type,
    }))
  );

  const recommendation = await plannerService.getDailyRecommendation(req.userId!, date, freeBlocks);

  const response: ScheduleResponseDto = {
    date,
    events: events.map(toEventDto),
    freeBlocks,
    recommendation,
  };

  res.json(response);
});

export default router;
