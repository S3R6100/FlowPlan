import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { createEventSchema, parseDateParam, updateEventSchema } from '../utils/validation.js';
import { toEventDto } from '../mappers/event.js';

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

  res.json({ events: events.map(toEventDto) });
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  const eventType = data.type ?? 'fixed';

  if (eventType === 'dynamic') {
    res.status(400).json({
      error:
        'Los eventos dinámicos se crean al completar el podómetro (POST /sessions), no manualmente',
    });
    return;
  }

  if (data.endHour <= data.startHour) {
    res.status(400).json({ error: 'endHour debe ser mayor que startHour' });
    return;
  }

  const event = await prisma.event.create({
    data: {
      userId: req.userId!,
      title: data.title,
      category: data.category ?? 'General',
      type: 'fixed',
      date: data.date,
      startHour: data.startHour,
      endHour: data.endHour,
      color: data.color ?? null,
      status: data.status ?? 'active',
    },
  });

  res.status(201).json({ event: toEventDto(event) });
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const parsed = updateEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.event.findFirst({
    where: { id: req.params.id as string, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: 'Evento no encontrado' });
    return;
  }

  const data = parsed.data;
  if (
    data.startHour !== undefined &&
    data.endHour !== undefined &&
    data.endHour <= data.startHour
  ) {
    res.status(400).json({ error: 'endHour debe ser mayor que startHour' });
    return;
  }

  const event = await prisma.event.update({
    where: { id: existing.id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.type !== undefined && { type: data.type }),
      ...(data.date !== undefined && { date: data.date }),
      ...(data.startHour !== undefined && { startHour: data.startHour }),
      ...(data.endHour !== undefined && { endHour: data.endHour }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  res.json({ event: toEventDto(event) });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.event.findFirst({
    where: { id: req.params.id as string, userId: req.userId! },
  });
  if (!existing) {
    res.status(404).json({ error: 'Evento no encontrado' });
    return;
  }

  await prisma.event.delete({ where: { id: existing.id } });
  res.status(204).send();
});

export default router;
