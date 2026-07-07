import { Task, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ITaskRepository } from './ITaskRepository.js';

export class PrismaTaskRepository implements ITaskRepository {
  async findAll(userId: string, weekKey?: string): Promise<Task[]> {
    return prisma.task.findMany({
      where: { userId, ...(weekKey ? { weekKey } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByPriority(userId: string, priority: string): Promise<Task[]> {
    return prisma.task.findMany({
      where: { userId, priority },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string, userId: string): Promise<Task | null> {
    return prisma.task.findFirst({
      where: { id, userId },
    });
  }

  async save(data: Prisma.TaskUncheckedCreateInput): Promise<Task> {
    return prisma.task.create({ data });
  }

  async update(id: string, data: Prisma.TaskUpdateInput): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.task.delete({ where: { id } });
  }
}
