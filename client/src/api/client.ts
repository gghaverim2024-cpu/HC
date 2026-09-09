const TOKEN_KEY = 'hc_israel_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T = any>(
  path: string,
  options: { method?: string; body?: any; isForm?: boolean } = {}
): Promise<T> {
  const { method = 'GET', body, isForm } = options;
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : null;

  if (!res.ok) {
    throw new ApiError(data?.error || 'שגיאת שרת', res.status);
  }
  return data as T;
}

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const data = await apiFetch<{ url: string }>('/upload', { method: 'POST', body: form, isForm: true });
  return data.url;
}
