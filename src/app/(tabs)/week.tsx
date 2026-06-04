import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useWeek, type WeekSummary } from '../../hooks/useWeek';
import { useAuth } from '../../hooks/useAuth';

const MODES: { id: WeekSummary['mode']; label: string }[] = [
  { id: 'foco_academico', label: 'Foco académico' },
  { id: 'equilibrado', label: 'Equilibrado' },
  { id: 'descanso', label: 'Descanso' },
];

export default function GoalsScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const {
    summary,
    isLoading,
    toggleRoutine,
    toggleMission,
    toggleMilestone,
    addManualSession,
    addGoal,
    addRoutine,
    updateWeekMode,
  } = useWeek();

  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTargetHours, setNewGoalTargetHours] = useState('');
  const [isRoutineModalVisible, setIsRoutineModalVisible] = useState(false);
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [savingMinutes, setSavingMinutes] = useState<string | null>(null);

  const handleCreateGoal = async () => {
    if (!newGoalTitle || !newGoalTargetHours) return;
    try {
      await addGoal(newGoalTitle, parseFloat(newGoalTargetHours));
      setIsGoalModalVisible(false);
      setNewGoalTitle('');
      setNewGoalTargetHours('');
    } catch {
      Alert.alert('Error', 'No se pudo crear la meta');
    }
  };

  const handleCreateRoutine = async () => {
    if (!newRoutineTitle) return;
    try {
      await addRoutine(newRoutineTitle);
      setIsRoutineModalVisible(false);
      setNewRoutineTitle('');
    } catch {
      Alert.alert('Error', 'No se pudo crear la rutina');
    }
  };

  const handleAddMinutes = async (goalId: string) => {
    setSavingMinutes(goalId);
    try {
      await addManualSession(goalId, 30);
    } catch {
      Alert.alert('Error', 'No se pudo registrar el tiempo');
    } finally {
      setSavingMinutes(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (isLoading || !summary) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'S':
        return '#8B5CF6';
      case 'A':
        return '#10B981';
      case 'B':
        return '#3B82F6';
      case 'C':
        return '#F59E0B';
      default:
        return '#EF4444';
    }
  };

  const missionDone = summary.mission?.status === 'completada';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* SCROLL PRINCIPAL: Para poder bajar y ver todas las metas y misiones */}
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* CABECERA (TOP ROW): Título de la pestaña y botón de cerrar sesión */}
        <View style={styles.topRow}>
          <Text style={styles.title}>Semana</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* BANNER DE PUNTAJE (SCORE BANNER): Muestra el Rango actual (S, A, B, C, D) y los puntos totales */}
        <View style={[styles.scoreBanner, { borderColor: getScoreColor(summary.score) }]}>
          <View>
            <Text style={styles.scoreTitle}>Rango semanal</Text>
            <Text style={styles.scorePoints}>{summary.totalPoints} pts</Text>
            <Text style={styles.breakdown}>
              Tareas +{summary.breakdown.tasks} · Metas +{summary.breakdown.goals} · Bonus +
              {summary.breakdown.bonuses}
              {summary.breakdown.penalties > 0
                ? ` · Penalización -${summary.breakdown.penalties}`
                : ''}
            </Text>
          </View>
          <View style={[styles.scoreCircle, { backgroundColor: getScoreColor(summary.score) }]}>
            <Text style={styles.scoreText}>{summary.score}</Text>
          </View>
        </View>

        {/* SELECTOR DE MODO DE SEMANA: Foco académico, Equilibrado, Descanso */}
        <Text style={styles.sectionLabel}>Modo de la semana</Text>
        <View style={styles.modeRow}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modeChip, summary.mode === m.id && styles.modeChipActive]}
              onPress={() => updateWeekMode(m.id)}
            >
              <Text
                style={[styles.modeChipText, summary.mode === m.id && styles.modeChipTextActive]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TARJETA DE MISIÓN DEL DÍA: Reto diario para mantener la racha */}
        {summary.mission && (
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="trophy-outline" size={22} color="#F59E0B" />
              <Text style={styles.cardTitle}>Misión del día</Text>
            </View>
            <Text style={styles.missionText}>{summary.mission.title}</Text>
            {summary.mission.deadlineHour != null && (
              <Text style={styles.missionDeadline}>
                Antes de las {Math.floor(summary.mission.deadlineHour)}:00
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.missionButton,
                missionDone ? styles.missionButtonCompleted : styles.missionButtonPending,
              ]}
              onPress={() => toggleMission(summary.mission!.id, !missionDone)}
            >
              <Ionicons
                name={missionDone ? 'checkbox' : 'square-outline'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.missionButtonText}>
                {missionDone ? 'Misión completada' : 'Marcar completada'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {summary.milestones.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Hitos (bonus)</Text>
            {summary.milestones.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.milestoneRow}
                onPress={() => toggleMilestone(m.id, !m.completed)}
              >
                <Ionicons
                  name={m.completed ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={m.completed ? '#10B981' : '#64748B'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.milestoneTitle, m.completed && styles.doneText]}>
                    {m.title}
                  </Text>
                  <Text style={styles.milestoneBonus}>+{m.bonusPoints} pts al completar</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Metas semanales</Text>
          <TouchableOpacity onPress={() => setIsGoalModalVisible(true)}>
            <Ionicons name="add-circle" size={24} color="#6366F1" />
          </TouchableOpacity>
        </View>
        {summary.goals.map((goal) => {
          const percentage = Math.min((goal.currentHours / goal.targetHours) * 100, 100);
          return (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.goalInfo}>
                <Text style={styles.goalTitle}>{goal.title}</Text>
                <Text style={styles.goalProgressText}>
                  {goal.currentHours.toFixed(1)}h / {goal.targetHours}h
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${percentage}%`, backgroundColor: goal.color || '#3B82F6' },
                  ]}
                />
              </View>
              <TouchableOpacity
                style={styles.incrementButton}
                onPress={() => handleAddMinutes(goal.id)}
                disabled={savingMinutes === goal.id}
              >
                {savingMinutes === goal.id ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.incrementButtonText}>Registrar 30 min</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Rutinas diarias</Text>
          <TouchableOpacity onPress={() => setIsRoutineModalVisible(true)}>
            <Ionicons name="add-circle" size={24} color="#10B981" />
          </TouchableOpacity>
        </View>
        <View style={styles.routinesCard}>
          {summary.routines.length === 0 ? (
            <Text style={styles.emptyText}>Sin rutinas</Text>
          ) : (
            summary.routines.map((routine, index) => (
              <TouchableOpacity
                key={routine.id}
                style={[
                  styles.routineItem,
                  index < summary.routines.length - 1 && styles.routineDivider,
                ]}
                onPress={() => toggleRoutine(routine.id)}
              >
                <Ionicons
                  name={routine.completedToday ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={routine.completedToday ? '#10B981' : '#64748B'}
                />
                <Text
                  style={[
                    styles.routineTitle,
                    routine.completedToday && styles.routineCompletedText,
                  ]}
                >
                  {routine.title}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={isGoalModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear meta semanal</Text>
            <Text style={styles.modalLabel}>Título</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. Práctica de guitarra"
              placeholderTextColor="#64748B"
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
            />
            <Text style={styles.modalLabel}>Horas objetivo</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. 10"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={newGoalTargetHours}
              onChangeText={setNewGoalTargetHours}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsGoalModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleCreateGoal}>
                <Text style={styles.modalSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isRoutineModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Crear rutina diaria</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. Ejercicio diario"
              placeholderTextColor="#64748B"
              value={newRoutineTitle}
              onChangeText={setNewRoutineTitle}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setIsRoutineModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleCreateRoutine}>
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
  centered: { justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC' },
  logoutBtn: { padding: 8 },
  scoreBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  scoreTitle: { fontSize: 14, color: '#94A3B8', fontWeight: 'bold', textTransform: 'uppercase' },
  scorePoints: { fontSize: 24, color: '#F8FAFC', fontWeight: '900', marginTop: 4 },
  breakdown: { fontSize: 11, color: '#64748B', marginTop: 8, maxWidth: 220 },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
  sectionLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 8, fontWeight: '600' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modeChipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  modeChipText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  modeChipTextActive: { color: '#FFF' },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#F8FAFC' },
  missionText: { fontSize: 14, color: '#CBD5E1', lineHeight: 20, marginBottom: 8 },
  missionDeadline: { fontSize: 12, color: '#F59E0B', marginBottom: 12 },
  missionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  missionButtonPending: { backgroundColor: '#3B82F6' },
  missionButtonCompleted: { backgroundColor: '#10B981' },
  missionButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 12 },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  milestoneTitle: { fontSize: 14, color: '#F8FAFC', fontWeight: '600' },
  milestoneBonus: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  doneText: { textDecorationLine: 'line-through', color: '#64748B' },
  goalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  goalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalTitle: { fontSize: 14, fontWeight: 'bold', color: '#F8FAFC', flex: 1 },
  goalProgressText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  progressBarBg: {
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  incrementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#334155',
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    minWidth: 140,
  },
  incrementButtonText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  routinesCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  routineItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  routineDivider: { borderBottomWidth: 1, borderBottomColor: '#334155' },
  routineTitle: { fontSize: 14, color: '#F8FAFC', fontWeight: '500' },
  routineCompletedText: { color: '#64748B', textDecorationLine: 'line-through' },
  emptyText: { color: '#64748B', padding: 16, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 16 },
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
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelText: { color: '#94A3B8', fontWeight: '600', padding: 12 },
  modalSave: { backgroundColor: '#6366F1', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  modalSaveText: { color: '#FFFFFF', fontWeight: 'bold' },
});
