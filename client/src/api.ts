interface Options {
  method?: string;
  body?: unknown;
  form?: FormData;
}

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const init: RequestInit = {
    method: opts.method || 'GET',
    credentials: 'include'
  };
  if (opts.form) {
    init.body = opts.form;
  } else if (opts.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(opts.body);
  }

  const res = await fetch(`/api${path}`, init);
  const type = res.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (data && data.message) || '请求失败，请稍后重试';
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return data as T;
}

export async function downloadExport() {
  const res = await fetch('/api/auth/export', { credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error((data && data.message) || '导出失败');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'petcare-export.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
