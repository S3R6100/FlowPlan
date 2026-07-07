import { Router } from 'express';
import { getWeekKey } from '@flowplan/engine';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { weekKeySchema, weekProfileSchema } from '../utils/validation.js';
import { buildWeekSummary, getOrCreateWeekProfile } from '../services/planning.js';

const router = Router();
router.use(requireAuth);

function resolveWeekKey(queryWeek: unknown): string {
  const parsed = weekKeySchema.safeParse(queryWeek);
  return parsed.success ? parsed.data : getWeekKey();
}

router.get('/profile', async (req: AuthRequest, res) => {
  const weekKey = resolveWeekKey(req.query.week as string | undefined);
  const profile = await getOrCreateWeekProfile(req.userId!, weekKey);
  res.json({
    profile: {
      weekKey: profile.weekKey,
      mode: profile.mode,
      criticalTaskIds: profile.criticalTaskIds,
    },
  });
});

router.put('/profile', async (req: AuthRequest, res) => {
  const parsed = weekProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const weekKey = parsed.data.weekKey ?? getWeekKey();
  const existing = await getOrCreateWeekProfile(req.userId!, weekKey);
  const profile = await prisma.weekProfile.upsert({
    where: { userId_weekKey: { userId: req.userId!, weekKey } },
    create: {
      userId: req.userId!,
      weekKey,
      mode: parsed.data.mode ?? 'equilibrado',
      criticalTaskIds: parsed.data.criticalTaskIds ?? [],
    },
    update: {
      ...(parsed.data.mode !== undefined && { mode: parsed.data.mode }),
      ...(parsed.data.criticalTaskIds !== undefined && {
        criticalTaskIds: parsed.data.criticalTaskIds,
      }),
    },
  });

  res.json({
    profile: {
      weekKey: profile.weekKey,
      mode: profile.mode,
      criticalTaskIds: profile.criticalTaskIds,
    },
  });
});

router.get('/summary', async (req: AuthRequest, res) => {
  const weekKey = resolveWeekKey(req.query.week as string | undefined);
  const summary = await buildWeekSummary(req.userId!, weekKey);
  res.json(summary);
});

export default router;
