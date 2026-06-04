import { resolveApiBaseUrl } from '../utils/apiUrl';

export const BASE_URL = resolveApiBaseUrl();

if (__DEV__) {
  console.info(`[FlowPlan] API → ${BASE_URL}`);
}

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

function formatApiError(errorData: unknown, status: number): string {
  if (errorData && typeof errorData === 'object') {
    const data = errorData as Record<string, unknown>;
    if (typeof data.error === 'string') return data.error;
    if (typeof data.message === 'string') return data.message;
  }
  return `Error de API (${status})`;
}

function networkHint(): string {
  return (
    `No se pudo conectar con ${BASE_URL}. ` +
    'Comprueba: (1) `npm run server` en otra terminal, (2) emulador Android → `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` en `.env`, ' +
    '(3) móvil físico → IP de tu PC en la misma Wi‑Fi, (4) reinicia Expo con `npx expo start -c` tras cambiar `.env`.'
  );
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(networkHint());
    }
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Respuesta inválida del servidor (${response.status})`);
    }
  }

  if (!response.ok) {
    throw new Error(formatApiError(data, response.status));
  }

  return data;
}

export const api = {
  get: (endpoint: string) => fetchWithAuth(endpoint, { method: 'GET' }),
  post: (endpoint: string, body?: unknown) =>
    fetchWithAuth(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: (endpoint: string, body?: unknown) =>
    fetchWithAuth(endpoint, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: (endpoint: string, body?: unknown) =>
    fetchWithAuth(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: (endpoint: string) => fetchWithAuth(endpoint, { method: 'DELETE' }),
};
