// src/lib/api.ts

// Base URL from VITE_API_URL (.env) with fallback
const BASE_URL = (
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL
) || process.env.VITE_API_URL || 'http://localhost:3030';

const RETRIES: Record<string, number> = { GET: 2, POST: 0, PUT: 1, DELETE: 1 };
const calls: Array<{ method: string; url: string; status: number }> = [];

function emit(name: string, detail: any) {
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

function recordCall(method: string, url: string, status: number) {
  calls.push({ method, url, status });
  if (calls.length > 20) calls.shift();
  emit('api:call', calls);
}

async function request(method: string, path: string, body?: any, options: any = {}) {
  const url = new URL(path, BASE_URL).toString();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {}),
  };
  const timeout = options.timeout ?? 10000;

  for (let attempt = 0; attempt <= (RETRIES[method] || 0); attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'omit',
        signal: controller.signal,
      });
      clearTimeout(timer);

      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      let data: any = null;
      if (ct.includes('application/json')) {
        try { data = text ? JSON.parse(text) : null; } catch {
          recordCall(method, path, res.status);
          throw { status: res.status, code: 'bad_json', message: 'Invalid JSON response' };
        }
      } else {
        recordCall(method, path, res.status);
        throw { status: res.status, code: 'bad_json', message: 'Invalid JSON response' };
      }

      if (!res.ok) {
        if (res.status >= 500 && attempt < (RETRIES[method] || 0)) continue;
        const err = {
          status: res.status,
          code: data?.code || 'http_error',
          message: data?.message || res.statusText || 'Request failed',
        };
        recordCall(method, path, res.status);
        throw err;
      }

      recordCall(method, path, res.status);
      return data;
    } catch (err: any) {
      clearTimeout(timer);
      if (err?.name === 'AbortError') {
        const e = { status: 0, code: 'timeout', message: 'Request timed out' };
        recordCall(method, path, 0);
        emit('api:network-error', e);
        throw e;
      }
      if (attempt < (RETRIES[method] || 0)) continue;
      const e = { status: 0, code: 'network_error', message: err?.message || 'Network error' };
      recordCall(method, path, 0);
      emit('api:network-error', e);
      throw e;
    }
  }
}

const api = {
  get<T = any>(path: string, options?: any) {
    return request('GET', path, undefined, options) as Promise<T>;
  },
  post<T = any>(path: string, body?: any, options?: any) {
    return request('POST', path, body, options) as Promise<T>;
  },
  put<T = any>(path: string, body?: any, options?: any) {
    return request('PUT', path, body, options) as Promise<T>;
  },
  delete<T = any>(path: string, options?: any) {
    return request('DELETE', path, undefined, options) as Promise<T>;
  },
  calls,
};

export default api;
