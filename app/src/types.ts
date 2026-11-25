export type AuthMode = 'token' | 'basic';

export interface Site {
  id: string;
  name: string;
  url: string;
  authMode: AuthMode;
  username?: string;
  password?: string;
  token?: string;
  plugin: boolean;
  user?: string;
}

export interface WpErrorShape {
  code?: string;
  message?: string;
  data?: any;
}

export interface SiteInfo {
  name: string;
  description: string;
  url: string;
  admin_url: string;
  wp_version: string;
  locale: string;
  timezone: string;
  active_theme: string;
  counts: { posts: number; pages: number; media: number; comments: number; users: number };
  updates: { core: number; plugins: number; themes: number; total: number };
}
