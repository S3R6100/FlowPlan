import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { toMilestoneDto } from '../mappers/milestone.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const milestones = await prisma.milestone.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ milestones: milestones.map(toMilestoneDto) });
});

router.patch('/:id/complete', async (req: AuthRequest, res) => {
  const existing = await prisma.milestone.findFirst({
    where: { id: req.params.id, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: 'Hito no encontrado' });
    return;
  }

  const completed = req.body?.completed !== false;
  const milestone = await prisma.milestone.update({
    where: { id: existing.id },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
    },
  });

  res.json({ milestone: toMilestoneDto(milestone) });
});

export default router;
