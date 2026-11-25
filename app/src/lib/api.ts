import type { Site } from '../types';

export const APP_VERSION = '1.0.0';
export const REPO = 'XINYUCloud/fohok-wp-bridge';
export const RELEASES_API = `https://api.github.com/repos/${REPO}/releases?per_page=30`;
export const PLUGIN_ZIP_URL = `https://github.com/${REPO}/releases/latest`;

export class WpError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 0, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function normalizeUrl(input: string): string {
  let url = (input || '').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}

function basic(username: string, password: string): string {
  return btoa(unescape(encodeURIComponent(`${username}:${password}`)));
}

export function createApi(site: Site) {
  const base = normalizeUrl(site.url) + '/wp-json';

  async function request(path: string, init: any = {}, bridge = false): Promise<any> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-FOHOK-App': '1',
      ...(init.headers || {}),
    };
    if (site.authMode === 'token' && site.token) headers['X-FOHOK-Token'] = site.token;
    if (site.authMode === 'basic' && site.username) {
      headers.Authorization = `Basic ${basic(site.username, site.password || '')}`;
    }

    const wantMeta = !!init.__meta;
    const options = { ...init };
    delete options.__meta;
    let body = options.body;
    if (body && typeof body === 'object' && !(body instanceof Blob) && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    let res: Response;
    try {
      res = await fetch(base + (bridge ? '/fohok/v1' : '') + path, { ...options, headers, body });
    } catch (e: any) {
      throw new WpError(`无法连接站点：${e.message || '网络错误'}`, 0);
    }

    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) {
      throw new WpError(data?.message || `请求失败 (${res.status})`, res.status, data?.code);
    }
    return wantMeta ? { data, headers: res.headers } : data;
  }

  return {
    core: (path: string, init?: any) => request(path, init, false),
    coreMeta: (path: string, init?: any) => request(path, { ...init, __meta: true }, false),
    bridge: (path: string, init?: any) => request(path, init, true),
    upload: async (file: File) => {
      const headers: Record<string, string> = {
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
        'Content-Type': file.type || 'application/octet-stream',
      };
      return request('/wp/v2/media', { method: 'POST', body: file, headers }, false);
    },
  };
}

export type Api = ReturnType<typeof createApi>;
