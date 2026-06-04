import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getWeekKey, todayDateString } from '@flowplan/engine';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'demo@flowplan.app';
  const password = await bcrypt.hash('demo1234', 10);
  const date = todayDateString();
  const weekKey = getWeekKey();

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,
      name: 'Usuario Demo',
    },
  });

  await prisma.event.deleteMany({ where: { userId: user.id, date } });
  await prisma.workSession.deleteMany({ where: { userId: user.id } });
  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.weeklyGoal.deleteMany({ where: { userId: user.id } });
  await prisma.milestone.deleteMany({ where: { userId: user.id } });
  await prisma.weekProfile.deleteMany({ where: { userId: user.id } });
  await prisma.project.deleteMany({ where: { userId: user.id } });
  await prisma.routine.deleteMany({ where: { userId: user.id } });
  await prisma.dailyMission.deleteMany({ where: { userId: user.id, date } });

  await prisma.event.createMany({
    data: [
      {
        userId: user.id,
        title: 'Clase: Ingeniería en Software',
        category: 'Universidad',
        type: 'fixed',
        date,
        startHour: 8,
        endHour: 10,
        color: '#6366F1',
        status: 'active',
      },
      {
        userId: user.id,
        title: 'Almuerzo y Descanso',
        category: 'Rutina',
        type: 'fixed',
        date,
        startHour: 12,
        endHour: 13,
        color: '#4B5563',
        status: 'active',
      },
      {
        userId: user.id,
        title: 'Trabajo Parcial',
        category: 'Trabajo',
        type: 'fixed',
        date,
        startHour: 14,
        endHour: 16,
        color: '#3B82F6',
        status: 'active',
      },
    ],
  });

  const projectIng = await prisma.project.create({
    data: {
      userId: user.id,
      title: 'Ingeniería Web',
      type: 'academic',
      color: '#6366F1',
    },
  });

  const projectGuitar = await prisma.project.create({
    data: {
      userId: user.id,
      title: 'Guitarra',
      type: 'hobby',
      color: '#F59E0B',
    },
  });

  const goalFlowPlan = await prisma.weeklyGoal.create({
    data: {
      userId: user.id,
      projectId: projectIng.id,
      title: 'Proyecto Personal: FlowPlan',
      targetHours: 10,
      currentHours: 6,
      color: '#3B82F6',
      weekKey,
    },
  });

  await prisma.weeklyGoal.create({
    data: {
      userId: user.id,
      projectId: projectGuitar.id,
      title: 'Práctica de Guitarra',
      targetHours: 4,
      currentHours: 2,
      color: '#F59E0B',
      weekKey,
    },
  });

  await prisma.weeklyGoal.create({
    data: {
      userId: user.id,
      title: 'Lectura Técnica',
      targetHours: 3,
      currentHours: 1,
      color: '#10B981',
      weekKey,
    },
  });

  const taskDemo = await prisma.task.create({
    data: {
      userId: user.id,
      projectId: projectIng.id,
      title: 'Entregar demo FlowPlan (core funcional)',
      priority: 'critica',
      status: 'pendiente',
      deadline: date,
      weekKey,
      linkedGoalId: goalFlowPlan.id,
    },
  });

  await prisma.task.create({
    data: {
      userId: user.id,
      projectId: projectIng.id,
      title: 'Documentar API en memoria',
      priority: 'alta',
      status: 'pendiente',
      weekKey,
    },
  });

  const goalGuitar = await prisma.weeklyGoal.findFirst({
    where: { userId: user.id, projectId: projectGuitar.id },
  });

  if (goalGuitar) {
    await prisma.milestone.create({
      data: {
        userId: user.id,
        goalId: goalGuitar.id,
        title: 'Aprender canción (hito hobby)',
        bonusPoints: 40,
        completed: false,
      },
    });
  }

  await prisma.weekProfile.upsert({
    where: { userId_weekKey: { userId: user.id, weekKey } },
    create: {
      userId: user.id,
      weekKey,
      mode: 'foco_academico',
      criticalTaskIds: [taskDemo.id],
    },
    update: {
      mode: 'foco_academico',
      criticalTaskIds: [taskDemo.id],
    },
  });

  await prisma.routine.createMany({
    data: [
      {
        userId: user.id,
        title: 'Planificación del día',
        completedToday: true,
        lastCompletedOn: date,
      },
      { userId: user.id, title: 'Ejercicio diario' },
      { userId: user.id, title: 'Lectura de noticias' },
    ],
  });

  await prisma.dailyMission.create({
    data: {
      userId: user.id,
      title: 'Estudiar 1h para el parcial de Ingeniería en Software',
      date,
      deadlineHour: 23,
      status: 'pendiente',
    },
  });

  console.log('Seed OK');
  console.log(`  email: ${email}`);
  console.log(`  password: demo1234`);
  console.log(`  date: ${date}`);
  console.log(`  weekKey: ${weekKey}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
