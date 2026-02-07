import type { ApiResponse } from '@nexus/shared';

const API_BASE = (() => {
  const envBase = import.meta.env.VITE_API_BASE;
  if (envBase) return envBase;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.endsWith('wolfethyst.tv')) {
      return 'https://api.wolfethyst.tv';
    }
  }

  return '/api';
})();

async function parseResponse<T>(response: Response): Promise<{ data?: T; error?: string }> {
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();

  if (contentType.includes('application/json')) {
    if (!raw) return {};
    try {
      return { data: JSON.parse(raw) as T };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Invalid JSON response' };
    }
  }

  if (!raw) return { error: 'Empty non-JSON response' };
  return { error: raw };
}

export class ApiClient {
  static baseURL = API_BASE;
  static async get<T>(path: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
      });
      const result = await parseResponse<T>(response);
      return { ok: response.ok && !result.error, data: result.data, error: result.error };
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
      const result = await parseResponse<T>(response);
      return { ok: response.ok && !result.error, data: result.data, error: result.error };
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
      const result = await parseResponse<T>(response);
      return { ok: response.ok && !result.error, data: result.data, error: result.error };
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
      const result = await parseResponse<T>(response);
      return { ok: response.ok && !result.error, data: result.data, error: result.error };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
