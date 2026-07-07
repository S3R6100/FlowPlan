import { Task, Prisma } from '@prisma/client';

export interface ITaskRepository {
  findAll(userId: string, weekKey?: string): Promise<Task[]>;
  findByPriority(userId: string, priority: string): Promise<Task[]>;
  findById(id: string, userId: string): Promise<Task | null>;
  save(data: Prisma.TaskUncheckedCreateInput): Promise<Task>;
  update(id: string, data: Prisma.TaskUpdateInput): Promise<Task>;
  delete(id: string): Promise<void>;
}
