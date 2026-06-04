import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from '../services/api';
import { useAuth } from './useAuth';
import { toLocalDateString } from '../utils/date';

export interface Goal {
  id: string;
  title: string;
  currentHours: number;
  targetHours: number;
  color: string;
}

export interface Routine {
  id: string;
  title: string;
  completedToday: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  bonusPoints: number;
  completed: boolean;
  goalId: string | null;
}

export interface DailyMission {
  id: string;
  title: string;
  status: string;
  deadlineHour: number | null;
}

export interface WeekBreakdown {
  tasks: number;
  goals: number;
  bonuses: number;
  penalties: number;
}

export interface WeekSummary {
  score: string;
  totalPoints: number;
  mode: 'foco_academico' | 'equilibrado' | 'descanso';
  goals: Goal[];
  routines: Routine[];
  milestones: Milestone[];
  mission: DailyMission | null;
  breakdown: WeekBreakdown;
  hasPendingCriticalTasks: boolean;
  criticalTaskIds: string[];
}

export const useWeek = () => {
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  const fetchSummary = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const today = toLocalDateString();
      const [summaryResponse, routinesResponse, missionsResponse, milestonesResponse, profileResponse] =
        await Promise.all([
          api.get('/week/summary'),
          api.get('/routines'),
          api.get(`/missions?date=${today}`),
          api.get('/milestones'),
          api.get('/week/profile').catch(() => null),
        ]);

      const missions = missionsResponse?.missions ?? [];
      const pendingMission =
        missions.find((m: DailyMission) => m.status === 'pendiente') ??
        missions[0] ??
        null;

      setSummary({
        score: summaryResponse?.rank || 'C',
        totalPoints: summaryResponse?.totalPoints ?? 0,
        mode: summaryResponse?.mode || profileResponse?.profile?.mode || 'equilibrado',
        goals: summaryResponse?.goals || [],
        routines: routinesResponse?.routines || [],
        milestones: milestonesResponse?.milestones || [],
        mission: pendingMission,
        breakdown: summaryResponse?.breakdown ?? {
          tasks: 0,
          goals: 0,
          bonuses: 0,
          penalties: 0,
        },
        hasPendingCriticalTasks: summaryResponse?.hasPendingCriticalTasks ?? false,
        criticalTaskIds: profileResponse?.profile?.criticalTaskIds ?? [],
      });
    } catch (error) {
      console.error('Error fetching week summary', error);
      setSummary({
        score: 'C',
        totalPoints: 0,
        mode: 'equilibrado',
        goals: [],
        routines: [],
        milestones: [],
        mission: null,
        breakdown: { tasks: 0, goals: 0, bonuses: 0, penalties: 0 },
        hasPendingCriticalTasks: false,
        criticalTaskIds: [],
      });
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fetchSummary])
  );

  const addManualSession = async (goalId: string, minutes: number) => {
    try {
      await api.post('/sessions', {
        goalId,
        minutes,
        date: toLocalDateString(),
        skipDynamicEvent: true,
      });
      await fetchSummary();
    } catch (error) {
      console.error('Error adding session', error);
      throw error;
    }
  };

  const toggleRoutine = async (id: string) => {
    try {
      const res = await api.patch(`/routines/${id}/toggle`, {});
      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          routines: prev.routines.map((r) =>
            r.id === id
              ? { ...r, completedToday: res.routine.completedToday }
              : r
          ),
        };
      });
      await fetchSummary();
    } catch (error) {
      console.error('Error toggling routine', error);
      await fetchSummary();
    }
  };

  const toggleMission = async (missionId: string, completed: boolean) => {
    try {
      await api.patch(`/missions/${missionId}`, {
        status: completed ? 'completada' : 'pendiente',
      });
      await fetchSummary();
    } catch (error) {
      console.error('Error toggling mission', error);
    }
  };

  const toggleMilestone = async (milestoneId: string, completed: boolean) => {
    try {
      await api.patch(`/milestones/${milestoneId}/complete`, { completed });
      await fetchSummary();
    } catch (error) {
      console.error('Error toggling milestone', error);
    }
  };

  const addGoal = async (title: string, targetHours: number) => {
    await api.post('/goals', { title, targetHours });
    await fetchSummary();
  };

  const addRoutine = async (title: string) => {
    await api.post('/routines', { title });
    await fetchSummary();
  };

  const updateWeekMode = async (mode: WeekSummary['mode']) => {
    await api.put('/week/profile', { mode });
    await fetchSummary();
  };

  const setCriticalTaskIds = async (criticalTaskIds: string[]) => {
    await api.put('/week/profile', { criticalTaskIds });
    await fetchSummary();
  };

  return {
    summary,
    isLoading,
    refetch: fetchSummary,
    addManualSession,
    toggleRoutine,
    toggleMission,
    toggleMilestone,
    addGoal,
    addRoutine,
    updateWeekMode,
    setCriticalTaskIds,
  };
};
