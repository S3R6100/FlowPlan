import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { toLocalDateString } from '../../utils/date';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
const WEEKS_AHEAD = 12;
const BATCH_SIZE = 10;

const DAYS = [
  { id: 1, label: 'L' },
  { id: 2, label: 'M' },
  { id: 3, label: 'X' },
  { id: 4, label: 'J' },
  { id: 5, label: 'V' },
  { id: 6, label: 'S' },
  { id: 0, label: 'D' },
];

async function postInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<unknown>
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}

export default function CreateEventScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const toggleDay = (id: number) => {
    setSelectedDays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const generateDates = (days: number[], weeks: number = WEEKS_AHEAD) => {
    const dates: string[] = [];
    const today = new Date();

    for (let d = 0; d < weeks * 7; d++) {
      const iterDate = new Date(today);
      iterDate.setDate(today.getDate() + d);
      if (days.includes(iterDate.getDay())) {
        dates.push(toLocalDateString(iterDate));
      }
    }
    return dates;
  };

  const parseTime = (timeStr: string) => {
    if (timeStr.includes(':')) {
      const [h, m] = timeStr.split(':');
      return parseInt(h, 10) + parseInt(m, 10) / 60;
    }
    return parseFloat(timeStr);
  };

  const handleSave = async () => {
    if (!title || !startHour || !endHour || selectedDays.length === 0) {
      Alert.alert('Campos incompletos', 'Llena todos los campos y selecciona al menos un día.');
      return;
    }

    setIsSaving(true);
    try {
      const datesToCreate = generateDates(selectedDays);
      const start = parseTime(startHour);
      const end = parseTime(endHour);

      if (isNaN(start) || isNaN(end) || start >= end) {
        Alert.alert('Horario inválido', 'La hora de fin debe ser posterior a la de inicio.');
        return;
      }

      if (isNaN(start) || isNaN(end)) {
        Alert.alert('Hora Invalida');
        return;
      }



      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(startHour) || !timeRegex.test(endHour)) {
        Alert.alert('Formato de hora inválido', 'Por favor usa el formato de 24 horas');
        return;
      }




      await postInBatches(datesToCreate, BATCH_SIZE, (date) =>
        api.post('/events', {
          title,
          startHour: start,
          endHour: end,
          color: selectedColor,
          date,
          type: 'fixed',
        })
      );

      router.back();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al guardar';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Evento Fijo</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Título de la actividad</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Clase de Matemáticas, Gimnasio..."
            placeholderTextColor="#64748B"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Hora Inicio (Ej: 14:30)</Text>
            <TextInput
              style={styles.input}
              placeholder="14:30"
              placeholderTextColor="#64748B"
              keyboardType="numbers-and-punctuation"
              value={startHour}
              onChangeText={setStartHour}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 16 }]}>
            <Text style={styles.label}>Hora Fin (Ej: 16:00)</Text>
            <TextInput
              style={styles.input}
              placeholder="16:00"
              placeholderTextColor="#64748B"
              keyboardType="numbers-and-punctuation"
              value={endHour}
              onChangeText={setEndHour}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Color del evento</Text>
          <View style={styles.colorContainer}>
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color },
                  selectedColor === color && styles.colorCircleSelected,
                ]}
                onPress={() => setSelectedColor(color)}
              >
                {selectedColor === color && (
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Días de la semana</Text>
          <Text style={styles.subLabel}>
            Se crearán eventos para las próximas {WEEKS_AHEAD} semanas.
          </Text>
          <View style={styles.daysContainer}>
            {DAYS.map((day) => {
              const isSelected = selectedDays.includes(day.id);
              return (
                <TouchableOpacity
                  key={day.id}
                  style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}
                  onPress={() => toggleDay(day.id)}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Guardar Eventos</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' },
  container: { flex: 1 },
  content: { padding: 20 },
  inputGroup: { marginBottom: 24 },
  row: { flexDirection: 'row', marginBottom: 24 },
  label: { fontSize: 14, color: '#E2E8F0', fontWeight: '600', marginBottom: 8 },
  subLabel: { fontSize: 12, color: '#64748B', marginBottom: 12 },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 14,
    color: '#F8FAFC',
    fontSize: 16,
  },
  colorContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: { borderWidth: 3, borderColor: '#FFFFFF' },
  daysContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelected: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  dayText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 16 },
  dayTextSelected: { color: '#FFFFFF' },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
