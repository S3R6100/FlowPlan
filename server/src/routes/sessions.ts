import { Router } from 'express';
import { todayDateString } from '@flowplan/engine';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { createSessionSchema } from '../utils/validation.js';

const router = Router();
router.use(requireAuth);

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const {
    goalId,
    taskId,
    routineId,
    minutes,
    title,
    startHour,
    endHour,
    color,
    skipDynamicEvent,
  } = parsed.data;
  const date = parsed.data.date ?? todayDateString();
  const hours = minutes / 60;

  if (!goalId && !taskId && !routineId) {
    res.status(400).json({ error: 'goalId, taskId o routineId es requerido' });
    return;
  }

  let activityTitle = title ?? 'Actividad';
  let activityColor = color ?? '#EC4899';
  let category = 'Dinámico';

  if (goalId) {
    const goal = await prisma.weeklyGoal.findFirst({
      where: { id: goalId, userId: req.userId! },
      include: { project: true },
    });
    if (!goal) {
      res.status(404).json({ error: 'Meta no encontrada' });
      return;
    }
    activityTitle = title ?? goal.title;
    activityColor = color ?? goal.color;
    category = goal.project?.title ?? 'Meta semanal';
    await prisma.weeklyGoal.update({
      where: { id: goal.id },
      data: {
        currentHours: goal.currentHours + hours,
      },
    });
  }

  if (taskId) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: req.userId! },
      include: { project: true },
    });
    if (!task) {
      res.status(404).json({ error: 'Tarea no encontrada' });
      return;
    }
    if (!title) activityTitle = task.title;
    category = task.project?.title ?? 'Tarea';
    await prisma.task.update({
      where: { id: task.id },
      data: {
        status: task.status === 'pendiente' ? 'en_progreso' : task.status,
        spentMinutes: task.spentMinutes + minutes,
      },
    });
  }

  if (routineId) {
    const routine = await prisma.routine.findFirst({
      where: { id: routineId, userId: req.userId! },
    });
    if (!routine) {
      res.status(404).json({ error: 'Rutina no encontrada' });
      return;
    }
    if (!title) activityTitle = routine.title;
    category = 'Rutina';
    await prisma.routine.update({
      where: { id: routine.id },
      data: {
        completedToday: true,
        lastCompletedOn: date,
      },
    });
  }

  const session = await prisma.workSession.create({
    data: {
      userId: req.userId!,
      goalId: goalId ?? null,
      taskId: taskId ?? null,
      minutes,
      date,
    },
  });

  let dynamicEvent = null;

  if (!skipDynamicEvent) {
    const now = new Date();
    const defaultStart =
      date === now.toISOString().slice(0, 10)
        ? Math.max(0, now.getHours() + now.getMinutes() / 60 - hours)
        : 10;
    const blockStart = startHour ?? defaultStart;
    const blockEnd = endHour ?? blockStart + hours;

    dynamicEvent = await prisma.event.create({
      data: {
        userId: req.userId!,
        title: activityTitle,
        category,
        type: 'dynamic',
        date,
        startHour: blockStart,
        endHour: blockEnd > blockStart ? blockEnd : blockStart + 0.5,
        color: activityColor,
        status: 'active',
      },
    });
  }

  res.status(201).json({
    session: {
      id: session.id,
      goalId: session.goalId,
      taskId: session.taskId,
      minutes: session.minutes,
      date: session.date,
    },
    dynamicEvent: dynamicEvent
      ? {
          id: dynamicEvent.id,
          title: dynamicEvent.title,
          type: 'dynamic',
          startHour: dynamicEvent.startHour,
          endHour: dynamicEvent.endHour,
        }
      : null,
  });
});

export default router;
