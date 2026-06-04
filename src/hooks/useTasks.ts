import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from './useAuth';

export interface Task {
  id: string;
  title: string;
  priority: string;
  status: 'pendiente' | 'completada' | 'en_progreso' | 'fallida';
  projectId?: string | null;
  spentMinutes?: number;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  const fetchTasks = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await api.get('/tasks');
      setTasks(response?.tasks ?? []);
    } catch (error) {
      console.error('Error fetching tasks', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchCriticalTasks = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const response = await api.get('/tasks/criticas');
      setTasks(response?.tasks ?? []);
    } catch (error) {
      console.error('Error fetching critical tasks', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks])
  );

  const toggleTask = async (id: string, newStatus: 'pendiente' | 'completada') => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
    try {
      await api.patch(`/tasks/${id}`, { status: newStatus });
      await fetchTasks();
    } catch (error) {
      console.error('Error toggling task', error);
      await fetchTasks();
    }
  };

  const addTask = async (title: string, priority: string) => {
    await api.post('/tasks', { title, priority });
    await fetchTasks();
  };

  const deleteTask = async (id: string) => {
    await api.delete(`/tasks/${id}`);
    await fetchTasks();
  };

  return {
    tasks,
    isLoading,
    refetch: fetchTasks,
    toggleTask,
    addTask,
    deleteTask,
  };
};
