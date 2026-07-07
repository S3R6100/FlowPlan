import { PlannerService } from './services/PlannerService.js';
import { PrismaTaskRepository } from './repositories/PrismaTaskRepository.js';
import { BalancedStrategy } from '@flowplan/engine';

const taskRepository = new PrismaTaskRepository();
const defaultStrategy = new BalancedStrategy();

export const plannerService = new PlannerService(taskRepository, defaultStrategy);
