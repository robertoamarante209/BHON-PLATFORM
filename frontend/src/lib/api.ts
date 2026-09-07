export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ErrorPayload = { error?: string; message?: string; code?: string };

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const response = await fetch(path, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    let payload: ErrorPayload = {};
    try {
      payload = await response.json() as ErrorPayload;
    } catch {
      // Respostas não JSON são convertidas em uma mensagem operacional segura.
    }
    throw new ApiError(payload.error || payload.message || 'Não foi possível concluir a operação.', response.status, payload.code);
  }
  return response.json() as Promise<T>;
}

