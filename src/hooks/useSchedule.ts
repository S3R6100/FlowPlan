import { useFocusEffect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { toLocalDateString } from '../utils/date';
import { useAuth } from './useAuth';

export interface TimelineEvent {
  date?: string;
  id: string;
  title: string;
  startHour: number;
  endHour: number;
  type: 'fixed' | 'dynamic';
  color: string;
  category: string;
  status: string;
}

export interface FreeBlock {
  startHour: number;
  endHour: number;
}

export interface Recommendation {
  activityTitle: string;
  startHour: number;
  endHour: number;
  category: string;
  reasons: string[];
  goalId: string | null;
  taskId: string | null;
  projectId: string | null;
  routineId?: string | null;
  kind: string;
}

function dismissKey(date: string) {
  return `flowplan_dismiss_rec_${date}`;
}

export const useSchedule = (date: Date) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [freeBlocks, setFreeBlocks] = useState<FreeBlock[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  const fetchSchedule = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const dateString = toLocalDateString(date);
      const data = (await api.get(`/schedule?date=${dateString}`)) as any;

      setEvents(data.events.filter((e: TimelineEvent) => e.status === 'active'));
      setFreeBlocks(data.freeBlocks || []);

      const dismissed = await SecureStore.getItemAsync(dismissKey(dateString));
      const rec = data.recommendation as Recommendation | null;
      if (rec && dismissed === rec.activityTitle) {
        setRecommendation(null);
      } else {
        setRecommendation(rec);
      }
    } catch (error) {
      console.error('Error fetching schedule', error);
      setEvents([]);
      setFreeBlocks([]);
      setRecommendation(null);
    } finally {
      setIsLoading(false);
    }
  }, [date, token]);

  useFocusEffect(
    useCallback(() => {
      fetchSchedule();
    }, [fetchSchedule])
  );

  const dismissRecommendation = async () => {
    if (recommendation) {
      await SecureStore.setItemAsync(
        dismissKey(toLocalDateString(date)),
        recommendation.activityTitle
      );
    }
    setRecommendation(null);
  };

  const cancelEvent = async (id: string) => {
    await api.patch(`/events/${id}`, { status: 'cancelled' });
    await SecureStore.deleteItemAsync(dismissKey(toLocalDateString(date)));
    await fetchSchedule();
  };

  const updateEventEndHour = async (id: string, newEndHour: number) => {
    await api.patch(`/events/${id}`, { endHour: newEndHour });
    await fetchSchedule();
  };

  const deleteEvent = async (id: string) => {
    await api.delete(`/events/${id}`);
    await fetchSchedule();
  };

  const addEvent = async (eventData: {
    title: string;
    startHour: number;
    endHour: number;
    color?: string;
  }) => {
    const dateString = toLocalDateString(date);
    await api.post('/events', {
      ...eventData,
      date: dateString,
      type: 'fixed',
    });
    await fetchSchedule();
  };

  return {
    events,
    freeBlocks,
    recommendation,
    isLoading,
    refetch: fetchSchedule,
    cancelEvent,
    deleteEvent,
    updateEventEndHour,
    dismissRecommendation,
    setRecommendation,
    addEvent,
  };
};
