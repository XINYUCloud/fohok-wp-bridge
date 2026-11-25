import { APP_VERSION, RELEASES_API } from './api';

export interface Release {
  tag: string;
  version: string;
  name: string;
  body: string;
  url: string;
  published_at: string;
}

function compare(a: string, b: string): number {
  const pa = a.split(/[.\-]/).map((x) => parseInt(x, 10) || 0);
  const pb = b.split(/[.\-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

export async function checkAppUpdate(): Promise<Release | null> {
  try {
    const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) return null;
    const list: any[] = await res.json();
    const releases: Release[] = list
      .filter((r) => String(r.tag_name || '').startsWith('app-v'))
      .map((r) => ({
        tag: r.tag_name,
        version: String(r.tag_name).replace(/^app-v/i, '').replace(/^v/i, ''),
        name: r.name || r.tag_name,
        body: r.body || '',
        url: r.html_url,
        published_at: r.published_at,
      }))
      .sort((a, b) => compare(b.version, a.version));
    if (!releases.length) return null;
    return compare(releases[0].version, APP_VERSION) > 0 ? releases[0] : null;
  } catch {
    return null;
  }
}

export function stripHtml(html: string): string {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

export function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('zh-CN', { hour12: false });
}
