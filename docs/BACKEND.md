# FlowPlan Backend (Node.js)

## Stack

- Express 5 + TypeScript (`tsx`)
- Prisma + PostgreSQL
- JWT auth (bcrypt)
- `@flowplan/engine` — cálculo de bloques libres

## Setup

```bash
docker compose up -d
cp server/.env.example server/.env
npm install
npm run db:push
npm run db:seed
npm run server
```

API: `http://localhost:3000`  
Health: `GET /health`

## Demo user

- Email: `demo@flowplan.app`
- Password: `demo1234`

## Tests

```bash
npm run engine:test
```

## Alcance actual

Ver [`SCOPE.md`](./SCOPE.md): eventos **fixed** / **dynamic**, recomendaciones **sin ubicación**, tareas y puntuación semanal.

## Bloques 3–4

- Tareas, metas, rutinas, misiones, hitos
- `PUT /week/profile`, `GET /week/summary`
- `POST /sessions` (cronómetro → crea evento `dynamic`)
- Recomendaciones en `GET /schedule` (motor en `@flowplan/engine`)
- Fórmula de puntuación: [`SCORING.md`](./SCORING.md)
