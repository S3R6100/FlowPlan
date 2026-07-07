import { getWeekKey } from '@flowplan/engine';
import { Router } from 'express';
import { toTaskDto } from '../mappers/task.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { createTaskSchema, updateTaskSchema, weekKeySchema } from '../utils/validation.js';
import { plannerService } from '../di.js';

const router = Router();
router.use(requireAuth);

function resolveWeekKey(queryWeek: unknown): string {
  const parsed = weekKeySchema.safeParse(queryWeek);
  return parsed.success ? parsed.data : getWeekKey();
}

router.get('/', async (req: AuthRequest, res) => {
  try {
    const weekKey = resolveWeekKey(req.query.week as string | undefined);
    const tasks = await plannerService.getTasks(req.userId!, weekKey);
    res.json({ tasks: tasks.map(toTaskDto), weekKey });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tareas' });
  }
});

router.get('/criticas', async (req: AuthRequest, res) => {
  try {
    const tasks = await plannerService.getCriticalTasks(req.userId!);
    res.json({ tasks: tasks.map(toTaskDto) });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tareas críticas' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  
  try {
    const data = { ...parsed.data, userId: req.userId! };
    const task = await plannerService.createTask(data);
    res.status(201).json({ task: toTaskDto(task) });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear tarea' });
  }
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const parsed = updateTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const task = await plannerService.updateTask(req.params.id as string, req.userId!, parsed.data);
    res.json({ task: toTaskDto(task) });
  } catch (error: any) {
    if (error.message === 'Tarea no encontrada') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al actualizar tarea' });
    }
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    await plannerService.deleteTask(req.params.id as string, req.userId!);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Tarea no encontrada') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Error al eliminar tarea' });
    }
  }
});

export default router;
