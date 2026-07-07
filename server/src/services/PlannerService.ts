import { IRecommendationStrategy, getWeekKey } from '@flowplan/engine';
import { RecommendationDto, FreeBlockDto } from '@flowplan/shared';
import { ITaskRepository } from '../repositories/ITaskRepository.js';
import { prisma } from '../lib/prisma.js';

export class PlannerService {
  constructor(
    private taskRepository: ITaskRepository,
    private recommendationStrategy: IRecommendationStrategy
  ) {}

  async getDailyRecommendation(
    userId: string,
    date: string,
    freeBlocks: FreeBlockDto[]
  ): Promise<RecommendationDto | null> {
    const weekKey = getWeekKey(new Date(date + 'T12:00:00'));
    const now = new Date();
    const hour = date === now.toISOString().slice(0, 10) ? now.getHours() + now.getMinutes() / 60 : 0;

    // Use repository for tasks
    const tasks = await this.taskRepository.findAll(userId, weekKey);
    // Ideally goals and routines should also use repositories, but for this refactor
    // the PDF explicitly requested ITaskRepository.
    const goals = await prisma.weeklyGoal.findMany({
      where: { userId, weekKey },
      include: { project: true },
    });
    const routines = await prisma.routine.findMany({ where: { userId } });

    // Since our task repository returns pure Tasks, we might need project titles.
    // For a strict implementation, we might do a separate join or let the strategy handle pure tasks.
    // To keep it simple and preserve existing logic, we'll fetch task projects manually or assume category="Tarea"
    const projectIds = Array.from(new Set(tasks.map(t => t.projectId).filter(Boolean))) as string[];
    const projects = await prisma.project.findMany({ where: { id: { in: projectIds } } });
    const projectMap = new Map(projects.map(p => [p.id, p.title]));

    const hasPendingCriticalTasks = tasks.some(
      (t) => t.priority === 'critica' && t.status !== 'completada'
    );

    const input = {
      freeBlocks,
      date,
      currentHour: hour,
      hasPendingCriticalTasks,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        category: t.projectId ? projectMap.get(t.projectId) ?? 'Tarea' : 'Tarea',
        projectId: t.projectId,
        deadline: t.deadline,
      })),
      goals: goals.map((g) => ({
        id: g.id,
        title: g.title,
        category: g.project?.title ?? 'Meta',
        targetHours: g.targetHours,
        currentHours: g.currentHours,
        projectId: g.projectId,
        projectType: g.project?.type ?? 'personal',
      })),
      routines: routines.map((r) => ({
        id: r.id,
        title: r.title,
        completedToday: r.completedToday,
      })),
    };

    return this.recommendationStrategy.recommend(input);
  }

  async createTask(data: any) {
    const weekKey = data.weekKey ?? getWeekKey();
    const task = await this.taskRepository.save({
      userId: data.userId,
      title: data.title,
      priority: data.priority ?? 'media',
      status: data.status ?? 'pendiente',
      deadline: data.deadline ?? null,
      weekKey,
      projectId: data.projectId ?? null,
      linkedGoalId: data.linkedGoalId ?? null,
    });
    return task;
  }

  async getTasks(userId: string, weekKey: string) {
    const tasks = await this.taskRepository.findAll(userId, weekKey);
    const order: Record<string, number> = { critica: 0, alta: 1, media: 2, baja: 3 };
    tasks.sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9));
    return tasks;
  }

  async getCriticalTasks(userId: string) {
    return this.taskRepository.findByPriority(userId, 'critica');
  }

  async updateTask(id: string, userId: string, data: any) {
    const existing = await this.taskRepository.findById(id, userId);
    if (!existing) {
      throw new Error('Tarea no encontrada');
    }

    return this.taskRepository.update(id, {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.deadline !== undefined && { deadline: data.deadline }),
      ...(data.projectId !== undefined && { projectId: data.projectId }),
      ...(data.linkedGoalId !== undefined && { linkedGoalId: data.linkedGoalId }),
    });
  }

  async deleteTask(id: string, userId: string) {
    const existing = await this.taskRepository.findById(id, userId);
    if (!existing) {
      throw new Error('Tarea no encontrada');
    }
    await this.taskRepository.delete(id);
  }
}
