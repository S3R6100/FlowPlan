import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEFAULT_PORT = '3000';

/**
 * Resuelve la URL del API según plataforma.
 * - Android emulador: 10.0.2.2 → localhost del PC
 * - Expo Go (móvil físico): misma IP que Metro (debuggerHost)
 * - iOS sim / web: localhost
 *
 * Si defines EXPO_PUBLIC_API_URL en .env, tiene prioridad (reinicia Expo tras cambiarlo).
 */
export function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  const port = process.env.EXPO_PUBLIC_API_PORT?.trim() || DEFAULT_PORT;

  if (Platform.OS === 'web') {
    return `http://localhost:${port}`;
  }

  const debuggerHost = Constants.expoGoConfig?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${port}`;
    }
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}`;
  }

  if (Platform.OS === 'ios') {
    return `http://localhost:${port}`;
  }

  return `http://localhost:${port}`;
}
