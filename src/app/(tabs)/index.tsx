import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { TimelineEvent, useSchedule } from '../../hooks/useSchedule';
import { useTasks } from '../../hooks/useTasks';
import { useWeek } from '../../hooks/useWeek';
import { api } from '../../services/api';
import { toLocalDateString } from '../../utils/date';

const ROW_HEIGHT = 75;
const TIME_COLUMN_WIDTH = 65;

const PRIORITY_MINUTES: Record<string, number> = {
  critica: 10000,
  alta: 500,
  media: 200,
  baja: 100,
};

export default function HomeScreen() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const {
    events,
    freeBlocks,
    recommendation,
    isLoading,
    cancelEvent,
    updateEventEndHour,
    dismissRecommendation,
    setRecommendation,
    refetch,
    deleteEvent,
  } = useSchedule(currentDate);

  const router = useRouter();
  const { summary } = useWeek();
  const { tasks } = useTasks();

  const { token, user } = useAuth();
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal State
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [isDynamicModalVisible, setIsDynamicModalVisible] = useState(false);

  const [dynamicType, setDynamicType] = useState<'none' | 'goal' | 'task' | 'routine'>('none');
  const [dynamicSelectedId, setDynamicSelectedId] = useState<string | null>(null);

  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > 50) {
          // Swipe Right -> Día Anterior
          setCurrentDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() - 1);
            return d;
          });
        } else if (gestureState.dx < -50) {
          // Swipe Left -> Día Siguiente
          setCurrentDate(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + 1);
            return d;
          });
        }
      }
    })
  ).current;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  useEffect(() => {
    const currentHour = currentTime.getHours();
    if (currentHour > 3 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: (currentHour - 2) * ROW_HEIGHT,
          animated: true
        });
      }, 500);
    }
  }, []);

  const handleAcceptRecommendation = () => {
    setTimerActive(true);
    setTimerSeconds(0);
  };

  const handleCancelRecommendation = () => {
    dismissRecommendation();
  };

  const handleCompleteTimer = async () => {
    if (!recommendation) return;

    setTimerActive(false);
    setTimerSeconds(0);

    try {
      const minutes = Math.floor(timerSeconds / 60) || 1;
      const startHour = recommendation.startHour;
      const endHour = startHour + (minutes / 60);

      await api.post('/sessions', {
        taskId: recommendation.taskId || null,
        goalId: recommendation.goalId || null,
        routineId: recommendation.routineId || null,
        startHour,
        endHour,
        title: recommendation.activityTitle,
        minutes,
        date: toLocalDateString(currentDate),
      });
      dismissRecommendation();
      await refetch();
    } catch (error) {
      console.log('Error saving session', error);
      dismissRecommendation();
    }
  };

  const handleStartDynamic = () => {
    let title = 'Sesión Libre';
    let priority = 'media';

    if (dynamicType === 'goal' && dynamicSelectedId) {
      const g = summary?.goals.find(x => x.id === dynamicSelectedId);
      if (g) title = g.title;
    } else if (dynamicType === 'task' && dynamicSelectedId) {
      const t = tasks.find(x => x.id === dynamicSelectedId);
      if (t) {
        title = t.title;
        priority = t.priority;
      }
    } else if (dynamicType === 'routine' && dynamicSelectedId) {
      const r = summary?.routines.find(x => x.id === dynamicSelectedId);
      if (r) title = r.title;
    }

    setRecommendation({
      activityTitle: title,
      startHour: currentTime.getHours() + currentTime.getMinutes() / 60,
      endHour: currentTime.getHours() + 1,
      category: 'Dinámico',
      reasons: [],
      goalId: dynamicType === 'goal' ? dynamicSelectedId : null,
      taskId: dynamicType === 'task' ? dynamicSelectedId : null,
      routineId: dynamicType === 'routine' ? dynamicSelectedId : null,
      projectId: null,
      kind: dynamicType === 'routine' ? 'routine' : 'dynamic',
      priority: priority,
    });

    setIsDynamicModalVisible(false);
    setDynamicType('none');
    setDynamicSelectedId(null);
    setTimerActive(true);
    setTimerSeconds(0);
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDecimalHour = (decimalHour: number) => {
    const hrs = Math.floor(decimalHour);
    const mins = Math.round((decimalHour - hrs) * 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const currentHourPosition = () => {
    const hrs = currentTime.getHours();
    const mins = currentTime.getMinutes();
    return hrs * ROW_HEIGHT + (mins / 60) * ROW_HEIGHT;
  };

  const hoursArray = Array.from({ length: 24 }, (_, i) => i);

  const changeDay = (offset: number) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + offset);
      return d;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* CABECERA (HEADER): Muestra el nombre de la app, el saludo y el selector de días */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>FlowPlan</Text>
          <Text style={styles.developer}>¡Hola, {user?.name || 'Usuario'}!</Text>
        </View>
        <View style={[styles.dateContainer, { flexDirection: 'row', alignItems: 'center' }]}>
          <TouchableOpacity onPress={() => changeDay(-1)} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={20} color="#38BDF8" />
          </TouchableOpacity>
          <Text style={[styles.dateText, { marginHorizontal: 8 }]}>
            {currentDate.toLocaleDateString('es-ES', {
              weekday: 'long',
              day: 'numeric',
              month: 'short'
            })}
          </Text>
          <TouchableOpacity onPress={() => changeDay(1)} style={{ padding: 4 }}>
            <Ionicons name="chevron-forward" size={20} color="#38BDF8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* CONTENEDOR PRINCIPAL CON GESTOS: Permite deslizar a los lados para cambiar de día */}
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {isLoading && <ActivityIndicator style={{ marginTop: 20 }} color="#6366F1" />}

        {/* TARJETA DE RECOMENDACIÓN / PODÓMETRO: Aparece cuando hay un hueco libre o el cronómetro está activo */}
        {recommendation && (
          <View style={styles.recommendationCard}>
            <View style={styles.recommendationHeader}>
              <Ionicons name="sparkles-outline" size={20} color="#F59E0B" />
              <Text style={styles.recommendationTitle}>Actividad recomendada</Text>
            </View>

            {!timerActive ? (
              <View>
                <Text style={styles.recommendationText}>
                  Detectamos un bloque libre de {formatDecimalHour(recommendation.startHour)} a {formatDecimalHour(recommendation.endHour)}.
                  ¿Deseas iniciar con: {recommendation.activityTitle}?
                </Text>

                {recommendation.reasons && recommendation.reasons.length > 0 && (
                  <View style={styles.reasonsContainer}>
                    {recommendation.reasons.map((r: string, i: number) => (
                      <Text key={i} style={styles.reasonBullet}>• {r}</Text>
                    ))}
                  </View>
                )}

                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={handleAcceptRecommendation}
                  >
                    <Text style={styles.acceptButtonText}>Iniciar Actividad</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={handleCancelRecommendation}
                  >
                    <Text style={styles.rejectButtonText}>Descartar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.timerContainer}>
                {/* CRONÓMETRO ACTIVO: Muestra el tiempo corriendo cuando inicias una actividad */}
                <Text style={styles.timerLabel}>Registrando Progreso de Actividad</Text>
                <Text style={styles.timerValue}>{formatTime(timerSeconds)}</Text>

                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                  <TouchableOpacity
                    style={{ backgroundColor: '#334155', padding: 8, borderRadius: 8, flex: 1, alignItems: 'center' }}
                    onPress={() => setTimerSeconds(prev => Math.max(0, prev - 600))}
                  >
                    <Text style={{ color: '#F8FAFC' }}>-10 min</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#334155', padding: 8, borderRadius: 8, flex: 1, alignItems: 'center' }}
                    onPress={() => setTimerSeconds(prev => prev + 600)}
                  >
                    <Text style={{ color: '#F8FAFC' }}>+10 min</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={handleCompleteTimer}
                >
                  <Text style={styles.completeButtonText}>Completar y Guardar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ZONA DE CALENDARIO SCROLLABLE: La cuadrícula principal donde bajan las horas */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.timelineScrollView}
          contentContainerStyle={styles.timelineContent}
        >
          <View style={styles.timelineWrapper}>
            {/* COLUMNA DE HORAS (Izquierda): Muestra 00:00, 01:00, etc. */}
            <View style={styles.timeColumn}>
              {hoursArray.map((hour) => (
                <View key={hour} style={styles.timeLabelContainer}>
                  <Text style={styles.timeLabel}>
                    {hour.toString().padStart(2, '0')}:00
                  </Text>
                </View>
              ))}
            </View>

            {/* CUADRÍCULA DERECHA: Contiene las líneas horizontales, los eventos y los espacios libres */}
            <View style={styles.eventsColumn}>
              {/* LÍNEAS HORIZONTALES: Forman la cuadrícula de cada hora */}
              {hoursArray.map((hour) => (
                <View key={hour} style={styles.gridLine} />
              ))}

              {/* BLOQUES LIBRES: Rectángulos grises que muestran dónde tienes tiempo disponible */}
              {freeBlocks.map((block, idx) => {
                const top = block.startHour * ROW_HEIGHT;
                const height = (block.endHour - block.startHour) * ROW_HEIGHT;
                return (
                  <View
                    key={`free-${idx}`}
                    style={[styles.freeBlock, { top, height }]}
                  >
                    <Text style={styles.freeBlockText}>Espacio Libre</Text>
                  </View>
                );
              })}


              {/* Nuevo Bloque*/}
              {recommendation && !timerActive && (
                <TouchableOpacity
                  style={[
                    styles.eventCard,
                    {
                      top: recommendation.startHour * ROW_HEIGHT,
                      height: ((PRIORITY_MINUTES[recommendation.priority || 'media'] || 60) / 60) * ROW_HEIGHT - 6,
                      backgroundColor: '#FEF3C7',
                      borderColor: '#F59E0B',
                      borderWidth: 2,
                      borderStyle: 'dashed',
                      zIndex: 10,

                    }
                  ]}
                  onPress={handleAcceptRecommendation}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: 'bold', color: '#B45309', fontSize: 13 }}>
                      Sugerencia: {recommendation.activityTitle}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#D97706', marginTop: 2 }}>
                      Toca para iniciar
                    </Text>
                  </View>
                </TouchableOpacity>
              )}



              {/* Referencia */}
              {/* TARJETAS DE EVENTOS: Son los bloques de colores fijos o dinámicos */}
              {events.map((event) => {
                const top = event.startHour * ROW_HEIGHT;
                const height = (event.endHour - event.startHour) * ROW_HEIGHT;
                const isDynamic = event.type === 'dynamic';
                return (
                  <TouchableOpacity
                    key={event.id}
                    style={[
                      styles.eventCard,
                      { top, height: height - 6 },
                      isDynamic ? styles.eventDynamic : { backgroundColor: event.color || '#6366F1' }
                    ]}
                    onPress={() => setSelectedEvent(event)}
                  >
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View>
                        <Text style={[styles.eventTitle, isDynamic && { color: '#EC4899' }]}>
                          {isDynamic && <Ionicons name="timer-outline" size={14} color="#EC4899" />} {event.title}
                        </Text>
                        <Text style={[styles.eventTime, isDynamic && { color: '#F472B6' }]}>
                          {formatDecimalHour(event.startHour)} - {formatDecimalHour(event.endHour)} | {event.category}
                        </Text>
                      </View>
                      {!isDynamic && (
                        <TouchableOpacity onPress={() => cancelEvent(event.id)}>
                          <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.6)" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* LÍNEA ROJA DEL TIEMPO ACTUAL: Muestra la hora exacta en tiempo real */}
              <View
                style={[
                  styles.currentTimeLine,
                  { top: currentHourPosition() }
                ]}
              >
                <View style={styles.currentTimeDot} />
                <View style={styles.currentTimeLineBar} />
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Botón Flotante */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setIsActionSheetVisible(true)}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Action Sheet (Selector de Tipo) */}
        <Modal
          visible={isActionSheetVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsActionSheetVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.actionSheetContent}>
              <View style={styles.actionSheetHandle} />
              <Text style={styles.modalTitle}>¿Qué deseas crear?</Text>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setIsActionSheetVisible(false);
                  router.push('/create-event');
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#6366F1' }]}>
                  <Ionicons name="calendar" size={24} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.actionTitle}>Evento Fijo</Text>
                  <Text style={styles.actionDesc}>Clase, reunión o bloque sólido.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setIsActionSheetVisible(false);
                  setIsDynamicModalVisible(true);
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#EC4899' }]}>
                  <Ionicons name="timer" size={24} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.actionTitle}>Evento Dinámico</Text>
                  <Text style={styles.actionDesc}>Iniciar cronómetro para una actividad.</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalCancel} onPress={() => setIsActionSheetVisible(false)}>
                <Text style={[styles.modalCancelText, { textAlign: 'center' }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal Dinámico */}
        <Modal
          visible={isDynamicModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsDynamicModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Nuevo Evento Dinámico</Text>

              <Text style={styles.modalLabel}>¿A qué está asociado?</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['none', 'goal', 'task', 'routine'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      dynamicType === type && styles.typeChipActive
                    ]}
                    onPress={() => { setDynamicType(type); setDynamicSelectedId(null); }}
                  >
                    <Text style={[styles.typeChipText, dynamicType === type && styles.typeChipTextActive]}>
                      {type === 'none' ? 'Nada' : type === 'goal' ? 'Meta' : type === 'task' ? 'Tarea' : 'Rutina'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {dynamicType === 'goal' && (
                <ScrollView style={styles.selectionList}>
                  {summary?.goals.length === 0 && <Text style={styles.emptyText}>No hay metas creadas.</Text>}
                  {summary?.goals.map(g => (
                    <TouchableOpacity
                      key={g.id}
                      style={[styles.listItem, dynamicSelectedId === g.id && styles.listItemSelected]}
                      onPress={() => setDynamicSelectedId(g.id)}
                    >
                      <Text style={[styles.listItemText, dynamicSelectedId === g.id && styles.listItemTextSelected]}>{g.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {dynamicType === 'task' && (
                <ScrollView style={styles.selectionList}>
                  {tasks.length === 0 && <Text style={styles.emptyText}>No hay tareas pendientes.</Text>}
                  {tasks.filter(t => t.status !== 'completada').map(t => (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.listItem, dynamicSelectedId === t.id && styles.listItemSelected]}
                      onPress={() => setDynamicSelectedId(t.id)}
                    >
                      <Text style={[styles.listItemText, dynamicSelectedId === t.id && styles.listItemTextSelected]}>{t.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {dynamicType === 'routine' && (
                <ScrollView style={styles.selectionList}>
                  {(summary?.routines.length ?? 0) === 0 && (
                    <Text style={styles.emptyText}>No hay rutinas. Créalas en la pestaña Semana.</Text>
                  )}
                  {summary?.routines.map((r) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.listItem, dynamicSelectedId === r.id && styles.listItemSelected]}
                      onPress={() => setDynamicSelectedId(r.id)}
                    >
                      <Text style={[styles.listItemText, dynamicSelectedId === r.id && styles.listItemTextSelected]}>
                        {r.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setIsDynamicModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSave, { backgroundColor: '#EC4899' }]}
                  onPress={handleStartDynamic}
                  disabled={dynamicType !== 'none' && !dynamicSelectedId}
                >
                  <Text style={styles.modalSaveText}>Iniciar Cronómetro</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal Acciones de Evento Existente */}
        <Modal
          visible={!!selectedEvent}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedEvent(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.actionSheetContent}>
              <View style={styles.actionSheetHandle} />
              <Text style={styles.modalTitle}>{selectedEvent?.title}</Text>
              {selectedEvent && (
                <Text style={styles.actionDesc}>
                  {formatDecimalHour(selectedEvent.startHour)} - {formatDecimalHour(selectedEvent.endHour)}
                </Text>
              )}

              {/* Si es hoy y el tiempo actual está entre startHour y endHour */}
              {selectedEvent &&
                currentDate.toDateString() === new Date().toDateString() &&
                (currentTime.getHours() + currentTime.getMinutes() / 60) > selectedEvent.startHour &&
                (currentTime.getHours() + currentTime.getMinutes() / 60) < selectedEvent.endHour && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={async () => {
                      const currentFloatTime = currentTime.getHours() + currentTime.getMinutes() / 60;
                      await updateEventEndHour(selectedEvent.id, currentFloatTime);
                      setSelectedEvent(null);
                    }}
                  >
                    <View style={[styles.actionIcon, { backgroundColor: '#10B981' }]}>
                      <Ionicons name="checkmark-done" size={24} color="#FFF" />
                    </View>
                    <View>
                      <Text style={styles.actionTitle}>Terminó temprano</Text>
                      <Text style={styles.actionDesc}>Ajustar hora de fin al tiempo actual.</Text>
                    </View>
                  </TouchableOpacity>
                )}

              <TouchableOpacity
                style={styles.actionButton}
                onPress={async () => {
                  if (selectedEvent!.type === 'dynamic') {
                    await deleteEvent(selectedEvent!.id);
                  } else {
                    await cancelEvent(selectedEvent!.id);
                  }
                  setSelectedEvent(null);
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#EF4444' }]}>
                  <Ionicons name="close-circle" size={24} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.actionTitle}>
                    {selectedEvent?.type === 'dynamic' ? 'Eliminar evento' : 'Cancelar hoy'}
                  </Text>
                  <Text style={styles.actionDesc}>
                    {selectedEvent?.type === 'dynamic'
                      ? 'Quitar esta sesión del horario.'
                      : 'Eliminar este evento del horario.'}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalCancel} onPress={() => setSelectedEvent(null)}>
                <Text style={[styles.modalCancelText, { textAlign: 'center' }]}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A'
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F8FAFC'
  },
  developer: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2
  },
  dateContainer: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38BDF8',
    textTransform: 'capitalize'
  },
  recommendationCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC'
  },
  recommendationText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
    marginBottom: 8
  },
  reasonsContainer: {
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  reasonBullet: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
    fontStyle: 'italic'
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  rejectButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  rejectButtonText: {
    color: '#94A3B8',
    fontWeight: '600',
    fontSize: 14
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 10
  },
  timerLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4
  },
  timerValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#EC4899',
    marginBottom: 12,
    letterSpacing: 2
  },
  completeButton: {
    backgroundColor: '#EC4899',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%'
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  timelineScrollView: {
    flex: 1
  },
  timelineContent: {
    paddingVertical: 10
  },
  timelineWrapper: {
    flexDirection: 'row',
    position: 'relative'
  },
  timeColumn: {
    width: TIME_COLUMN_WIDTH,
    alignItems: 'center'
  },
  timeLabelContainer: {
    height: ROW_HEIGHT,
    justifyContent: 'flex-start',
    paddingTop: 4
  },
  timeLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600'
  },
  eventsColumn: {
    flex: 1,
    position: 'relative',
    paddingRight: 16
  },
  gridLine: {
    height: ROW_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: '#1E293B'
  },
  eventCard: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 8,
    padding: 10,
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  eventTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  eventTime: {
    color: '#E2E8F0',
    fontSize: 11,
    marginTop: 4
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10
  },
  currentTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: -4
  },
  currentTimeLineBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#EF4444'
  },
  eventDynamic: {
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    borderWidth: 1,
    borderColor: '#EC4899',
    borderStyle: 'dashed'
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    minHeight: 300,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 20
  },
  modalLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 6
  },
  modalInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#F8FAFC',
    marginBottom: 16
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10
  },
  modalCancel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#94A3B8',
    fontWeight: '600'
  },
  modalSave: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  freeBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderStyle: 'dashed',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1
  },
  freeBlockText: {
    color: '#38BDF8',
    opacity: 0.5,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  actionSheetContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40
  },
  actionSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155'
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F8FAFC'
  },
  actionDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2
  },
  typeChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center'
  },
  typeChipActive: {
    backgroundColor: '#EC4899',
    borderColor: '#EC4899'
  },
  typeChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  typeChipTextActive: {
    color: '#FFFFFF'
  },
  selectionList: {
    maxHeight: 150,
    marginBottom: 16,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 8
  },
  listItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  listItemSelected: {
    backgroundColor: 'rgba(236, 72, 153, 0.1)'
  },
  listItemText: {
    color: '#CBD5E1'
  },
  listItemTextSelected: {
    color: '#EC4899',
    fontWeight: 'bold'
  },
  emptyText: {
    color: '#64748B',
    textAlign: 'center',
    padding: 12,
    fontStyle: 'italic'
  }
});
