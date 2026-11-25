import React, { useState } from 'react';
import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './lib/store';
import { LoginScreen, SitesScreen, AboutScreen } from './screens/AuthAbout';
import { DashboardScreen, ContentScreen, EditorScreen, MediaScreen, CommentsScreen, UsersScreen, TaxonomyScreen } from './screens/Core';
import { MenusScreen, WidgetsScreen, PluginsScreen, ThemesScreen, SettingsScreen, UpdatesScreen, HealthScreen } from './screens/Advanced';
import { APP_VERSION } from './lib/api';

const NAV = [
  { group: '概览', items: [{ to: '/', label: '仪表盘', icon: '◉' }, { to: '/sites', label: '站点管理', icon: '▤' }] },
  { group: '内容', items: [
    { to: '/content/posts', label: '文章', icon: '📝' }, { to: '/content/pages', label: '页面', icon: '📄' },
    { to: '/media', label: '媒体库', icon: '🖼' }, { to: '/comments', label: '评论', icon: '💬' },
    { to: '/users', label: '用户', icon: '👤' }, { to: '/taxonomy', label: '分类标签', icon: '🏷' },
  ] },
  { group: '高级功能（需插件）', items: [
    { to: '/menus', label: '菜单', icon: '☰' }, { to: '/widgets', label: '小工具', icon: '◫' },
    { to: '/plugins', label: '插件', icon: '🧩' }, { to: '/themes', label: '主题', icon: '🎨' },
    { to: '/settings', label: '设置', icon: '⚙' }, { to: '/updates', label: '更新', icon: '⬆' },
    { to: '/health', label: '站点健康', icon: '♥' },
  ] },
  { group: '关于', items: [{ to: '/about', label: 'FOHOK / 检查更新', icon: 'ⓘ' }] },
];

function Layout({ children }: any) {
  const { active, sites, setActive, toast } = useStore();
  const [drawer, setDrawer] = useState(false);
  const close = () => setDrawer(false);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="icon-btn menu-toggle" onClick={() => setDrawer(!drawer)}>☰</button>
        <div className="topbar-brand"><span className="brand-mark small">F</span><strong>WP Bridge</strong></div>
        <select className="site-switch" value={active?.id || ''} onChange={(e) => { setActive(e.target.value || null); close(); }}>
          <option value="">选择站点</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <NavLink to="/about" className="topbar-about">v{APP_VERSION}</NavLink>
      </header>
      {drawer && <div className="scrim" onClick={close} />}
      <aside className={`drawer ${drawer ? 'open' : ''}`}>
        <div className="drawer-site">{active ? <><strong>{active.name}</strong><span className="muted small">{active.url}</span></> : <strong>未选择站点</strong>}</div>
        <nav>
          {NAV.map((section) => (
            <div className="nav-group" key={section.group}>
              <div className="nav-group-title">{section.group}</div>
              {section.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={close}>
                  <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="main" onClick={() => { if (drawer) close(); }}>{children}</main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function RequireSite({ children }: any) {
  const { active } = useStore();
  if (!active) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function RoutesView() {
  const wrap = (el: React.ReactNode) => <RequireSite>{el}</RequireSite>;
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/sites" element={<Layout><SitesScreen /></Layout>} />
      <Route path="/" element={wrap(<DashboardScreen />)} />
      <Route path="/content/:type" element={wrap(<ContentScreen />)} />
      <Route path="/editor/:type" element={wrap(<EditorScreen />)} />
      <Route path="/editor/:type/:id" element={wrap(<EditorScreen />)} />
      <Route path="/media" element={wrap(<MediaScreen />)} />
      <Route path="/comments" element={wrap(<CommentsScreen />)} />
      <Route path="/users" element={wrap(<UsersScreen />)} />
      <Route path="/taxonomy" element={wrap(<TaxonomyScreen />)} />
      <Route path="/menus" element={wrap(<MenusScreen />)} />
      <Route path="/widgets" element={wrap(<WidgetsScreen />)} />
      <Route path="/plugins" element={wrap(<PluginsScreen />)} />
      <Route path="/themes" element={wrap(<ThemesScreen />)} />
      <Route path="/settings" element={wrap(<SettingsScreen />)} />
      <Route path="/updates" element={wrap(<UpdatesScreen />)} />
      <Route path="/health" element={wrap(<HealthScreen />)} />
      <Route path="/about" element={wrap(<AboutScreen />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <HashRouter><RoutesView /></HashRouter>;
}
