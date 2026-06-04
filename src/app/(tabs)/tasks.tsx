import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks } from '../../hooks/useTasks';
import { useWeek } from '../../hooks/useWeek';

export default function TasksScreen() {
  const { tasks, isLoading, toggleTask, addTask, deleteTask } = useTasks();
  const { summary, setCriticalTaskIds, refetch: refetchWeek } = useWeek();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('media');

  const criticalIds = summary?.criticalTaskIds ?? [];

  const pendingTasks = tasks.filter(
    (t) => t.status === 'pendiente' || t.status === 'en_progreso'
  );
  const completedTasks = tasks.filter((t) => t.status === 'completada');

  const handleCreateTask = async () => {
    if (!newTaskTitle) {
      Alert.alert('Título requerido', 'Ingresa el título de la tarea');
      return;
    }
    try {
      await addTask(newTaskTitle, newTaskPriority);
      setIsModalVisible(false);
      setNewTaskTitle('');
      setNewTaskPriority('media');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo crear');
    }
  };

  const handleToggleComplete = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completada' ? 'pendiente' : 'completada';
    await toggleTask(id, newStatus);
    await refetchWeek();
  };

  const handleToggleCritical = async (taskId: string) => {
    const next = criticalIds.includes(taskId)
      ? criticalIds.filter((id) => id !== taskId)
      : [...criticalIds, taskId];
    try {
      await setCriticalTaskIds(next);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo actualizar');
    }
  };

  const confirmDelete = (id: string, title: string) => {
    Alert.alert('Eliminar tarea', `¿Eliminar "${title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(id);
            const next = criticalIds.filter((cid) => cid !== id);
            if (next.length !== criticalIds.length) {
              await setCriticalTaskIds(next);
            }
          } catch (error) {
            Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  const formatSpentTime = (minutes?: number) => {
    if (!minutes) return '0m';
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const renderTask = (
    task: (typeof tasks)[0],
    completed: boolean
  ) => {
    const isCrit = task.priority === 'critica';
    const isWeekCritical = criticalIds.includes(task.id);


    return (
      <TouchableOpacity
        key={task.id}
        style={[
          completed ? styles.taskCardCompleted : styles.taskCard,
          isCrit && styles.criticalCard,
          isWeekCritical && styles.weekCriticalCard,
        ]}
        onPress={() => handleToggleComplete(task.id, task.status)}
        onLongPress={() => {
          Alert.alert(task.title, 'Elige una acción', [
            {
              text: isWeekCritical ? 'Quitar de críticas (semana)' : 'Marcar crítica (semana)',
              onPress: () => handleToggleCritical(task.id),
            },
            { text: 'Eliminar', style: 'destructive', onPress: () => confirmDelete(task.id, task.title) },
            { text: 'Cancelar', style: 'cancel' },
          ]);
        }}
      >
        <Ionicons
          name={completed ? 'checkbox' : 'square-outline'}
          size={24}
          color={completed ? '#10B981' : isCrit ? '#EF4444' : '#64748B'}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={[
              completed ? styles.taskTitleCompleted : styles.taskTitle,
              isCrit && styles.criticalText,
            ]}
          >
            {task.title}
          </Text>
          <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
            {formatSpentTime(task.spentMinutes)} dedicados
            {isWeekCritical ? ' · Crítica esta semana' : ''}
            {'Prioridad: ' + task.priority}
          </Text>
        </View>
        {(isCrit || isWeekCritical) && (
          <Ionicons name="warning" size={16} color="#EF4444" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* SCROLL PRINCIPAL: Permite deslizar la pantalla si hay muchas tareas */}
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* CABECERA (HEADER): Título principal de la pantalla */}
        <View style={styles.header}>
          <Text style={styles.title}>Tareas de la Semana</Text>

          <Text style={styles.subtitle}>
            Toca para completar. Mantén pulsado para marcar crítica o eliminar.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#6366F1" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* SECCIÓN DE TAREAS PENDIENTES */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pendientes</Text>
              {pendingTasks.length === 0 ? (
                <Text style={styles.emptyText}>No hay tareas pendientes.</Text>
              ) : (
                pendingTasks.map((task) => renderTask(task, false))
              )}
            </View>

            {/* SECCIÓN DE TAREAS COMPLETADAS */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Completadas</Text>
              {completedTasks.length === 0 ? (
                <Text style={styles.emptyText}>Aún no has completado tareas.</Text>
              ) : (
                completedTasks.map((task) => renderTask(task, true))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* BOTÓN FLOTANTE (FAB): Botón circular en la esquina inferior para crear tareas */}
      <TouchableOpacity style={styles.fab} onPress={() => setIsModalVisible(true)}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* MODAL DE CREACIÓN: La ventana emergente que sale al presionar el botón flotante */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        {/* FONDO OSCURO DEL MODAL */}
        <View style={styles.modalOverlay}>
          {/* CONTENEDOR BLANCO/GRIS DEL MODAL */}
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear Tarea</Text>

            <Text style={styles.modalLabel}>Título de la tarea</Text>
            <TextInput
              style={styles.modalInput}
              placeholderTextColor="#64748B"
              placeholder="Ej. Terminar reporte"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />

            <Text style={styles.modalLabel}>Prioridad</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {['baja', 'media', 'critica'].map((prio) => (
                <TouchableOpacity
                  key={prio}
                  style={[
                    styles.priorityChip,
                    newTaskPriority === prio && styles.priorityChipActive,
                    newTaskPriority === prio &&
                    prio === 'critica' && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                  ]}
                  onPress={() => setNewTaskPriority(prio)}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      newTaskPriority === prio && styles.priorityChipTextActive,
                    ]}
                  >
                    {prio.charAt(0).toUpperCase() + prio.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleCreateTask}>
                <Text style={styles.modalSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC' },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 12 },
  emptyText: { color: '#64748B', fontStyle: 'italic' },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  weekCriticalCard: { borderColor: '#F59E0B' },
  criticalCard: {
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  taskTitle: { fontSize: 16, color: '#F8FAFC', flex: 1 },
  criticalText: { color: '#EF4444', fontWeight: 'bold' },
  taskCardCompleted: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 12,
    opacity: 0.7,
  },
  taskTitleCompleted: {
    fontSize: 16,
    color: '#64748B',
    flex: 1,
    textDecorationLine: 'line-through',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#6366F1',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    zIndex: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 300,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 20 },
  modalLabel: { fontSize: 14, color: '#94A3B8', marginBottom: 6 },
  modalInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    marginBottom: 16,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  priorityChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  priorityChipText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  priorityChipTextActive: { color: '#FFFFFF' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  modalCancel: { paddingVertical: 12, paddingHorizontal: 16 },
  modalCancelText: { color: '#94A3B8', fontWeight: '600' },
  modalSave: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalSaveText: { color: '#FFFFFF', fontWeight: 'bold' },
});
