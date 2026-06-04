import type { Event } from '@prisma/client';
import type { TimelineEventDto } from '@flowplan/shared';

export function toEventDto(event: Event): TimelineEventDto {
  const type =
    event.type === 'dynamic' ? 'dynamic' : 'fixed';

  return {
    id: event.id,
    title: event.title,
    category: event.category,
    type,
    date: event.date,
    startHour: event.startHour,
    endHour: event.endHour,
    status: event.status as TimelineEventDto['status'],
    color: event.color,
  };
}
