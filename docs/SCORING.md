# Puntuación semanal v0

## Tareas

| Prioridad | Completada | Pendiente (penalización) |
|-----------|------------|---------------------------|
| crítica   | +100       | -80                       |
| alta      | +60        | -30                       |
| media     | +35        | -10                       |
| baja      | +20        | 0                         |

## Metas (horas)

`ratio = min(current / target, 1)` × peso × 100

- Con **críticas pendientes**: académico/personal 70%, hobby 15%, general 15%
- Sin críticas pendientes: académico 35%, hobby 40%, general 25%

## Bonus

- Hito completado: `bonusPoints` (default 40)
- Todas las críticas completadas: +50
- Modo `foco_academico` sin críticas pendientes: +25

## Rangos

| Puntos | Rango |
|--------|-------|
| ≥800   | S     |
| ≥600   | A     |
| ≥400   | B     |
| ≥200   | C     |
| <200   | D     |

Implementación: `packages/engine/src/scoring.ts`
