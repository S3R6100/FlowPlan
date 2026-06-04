# FlowPlan API v0 (alcance recortado)

Base URL: `http://10.0.2.2:3000` (Android emulator) · `http://localhost:3000`

Auth: `Authorization: Bearer <token>`

---

## Auth

- `POST /auth/register` · `POST /auth/login` · `GET /auth/me`

---

## Schedule

### GET /schedule?date=YYYY-MM-DD

```json
{
  "date": "2026-06-01",
  "events": [
    {
      "id": "...",
      "title": "Clase",
      "type": "fixed",
      "startHour": 8,
      "endHour": 10,
      "category": "Universidad",
      "status": "active",
      "color": "#6366F1"
    }
  ],
  "freeBlocks": [{ "startHour": 10, "endHour": 12 }],
  "recommendation": {
    "activityTitle": "Entregar demo FlowPlan",
    "startHour": 10,
    "endHour": 12,
    "category": "Ingeniería Web",
    "reasons": ["Bloque libre...", "Prioridad: critica"],
    "goalId": null,
    "taskId": "...",
    "projectId": "...",
    "kind": "task"
  }
}
```

Sin `zoneId` ni ubicación.

---

## Events (solo **fixed** manual)

- `GET /events?date=`
- `POST /events` — `"type": "fixed"` (default), requiere `startHour`, `endHour`
- `PATCH /events/:id` — cancelar: `{ "status": "cancelled" }`
- `DELETE /events/:id`

Los eventos **dynamic** se crean con `POST /sessions`.

---

## Sessions (podómetro)

### POST /sessions

```json
{
  "goalId": "...",
  "taskId": null,
  "minutes": 45,
  "title": "FlowPlan",
  "startHour": 10,
  "endHour": 10.75,
  "date": "2026-06-01"
}
```

Respuesta incluye `session` y `dynamicEvent` en el timeline.

---

## Tasks · Goals · Week

- `GET/POST/PATCH/DELETE /tasks`
- `GET/POST/PATCH /goals` · `POST /goals/:id/add-hours`
- `GET/PUT /week/profile` · `GET /week/summary`
- `GET/POST /routines` · `PATCH /routines/:id/toggle`
- `GET /milestones` · `PATCH /milestones/:id/complete`
- `GET/POST/PATCH /missions`

---

## Tipos de evento

| type | Creación |
|------|----------|
| `fixed` | Usuario / seed |
| `dynamic` | Automático al guardar sesión del podómetro |
