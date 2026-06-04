# Alcance recortado FlowPlan

## Incluido

### Dos tipos de eventos

| Tipo | Uso | En timeline | Ocupa huecos libres |
|------|-----|-------------|---------------------|
| **fixed** | Clases, trabajo, compromisos con hora | Sí, creados por el usuario (`POST /events`) | Sí |
| **dynamic** | Hobbies, proyecto personal, sesiones con podómetro | Sí, al completar `POST /sessions` | No |

### Recomendaciones (sin ubicación)

- Analiza **huecos libres** (solo bloqueados por eventos fijos).
- Sugiere tareas, metas semanales o rutinas según prioridad y modo de semana.
- Al aceptar → **cronómetro** → `POST /sessions` crea evento **dynamic** y suma progreso.

### Tareas y puntuación

- CRUD tareas, perfil de semana, `GET /week/summary` (rango S–D).
- Metas semanales, hitos bonus, misiones, rutinas.

## Excluido (por ahora)

- Mapas, zonas, GPS, recomendación por ubicación.
- `GET /zones` eliminado.

## API principal

Ver [`API.md`](./API.md).
