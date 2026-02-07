import type { ApiResponse } from '@nexus/shared';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

async function readJsonOrText(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();

  if (contentType.includes('application/json')) {
    return raw ? JSON.parse(raw) : null;
  }

  try {
    return raw ? JSON.parse(raw) : raw;
  } catch {
    return raw;
  }
}

export class ApiClient {
  static baseURL = API_BASE;
  static async get<T>(path: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
      });
      const data = await readJsonOrText(response);
      return { ok: response.ok, data };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async post<T>(
    path: string,
    body: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    try {
      const headers = { 'Content-Type': 'application/json', ...(options?.headers || {}) };
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await readJsonOrText(response);
      return { ok: response.ok, data };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async put<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await readJsonOrText(response);
      return { ok: response.ok, data };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async delete<T>(path: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await readJsonOrText(response);
      return { ok: response.ok, data };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
