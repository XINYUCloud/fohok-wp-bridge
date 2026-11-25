import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createApi, APP_VERSION, REPO } from '../lib/api';
import { checkAppUpdate } from '../lib/releases';
import { useStore } from '../lib/store';
import type { AuthMode, Site } from '../types';
import { Badge, Button, Card, Field, Loader, Notice } from '../components/ui';

export function LoginScreen() {
  const { addSite, setActive, notify } = useStore();
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState<AuthMode>('token');
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const candidate: Site = {
        id: `${Date.now()}`, name: url.replace(/^https?:\/\//, '').split('/')[0], url,
        authMode: mode, token, username, password, plugin: false,
      };
      const api = createApi(candidate);
      const me: any = await api.core('/wp/v2/users/me');
      let plugin = false;
      try { await api.bridge('/auth/verify'); plugin = true; } catch { /* 未安装插件 */ }
      candidate.user = me?.name || username || '';
      candidate.plugin = plugin;
      addSite(candidate);
      setActive(candidate.id);
      notify(plugin ? '连接成功，已启用全部功能' : '连接成功，当前仅可用核心功能');
      navigate('/');
    } catch (err: any) {
      setError(err.message || '连接失败');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-brand"><div className="brand-mark">F</div><h1>FOHOK WP Bridge</h1><p>一个 APP，管理你的全部 WordPress 站点</p></div>
      <Card title="连接站点">
        {error && <Notice tone="error">{error}</Notice>}
        <form onSubmit={connect}>
          <Field label="站点地址" hint="例如 https://blog.example.com，不需要带 /wp-json">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-site.com" required />
          </Field>
          <div className="seg">
            <button type="button" className={mode === 'token' ? 'active' : ''} onClick={() => setMode('token')}>连接密钥</button>
            <button type="button" className={mode === 'basic' ? 'active' : ''} onClick={() => setMode('basic')}>应用密码</button>
          </div>
          {mode === 'token' ? (
            <Field label="连接密钥" hint="在插件设置页生成，仅显示一次">
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="粘贴连接密钥" required />
            </Field>
          ) : (
            <>
              <Field label="用户名"><input value={username} onChange={(e) => setUsername(e.target.value)} required /></Field>
              <Field label="应用密码" hint="后台 → 用户 → 个人资料 → 应用密码">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Field>
            </>
          )}
          <Button type="submit" block loading={busy}>连接</Button>
        </form>
        <p className="muted small">未安装插件也可连接：文章、媒体、评论、用户等核心功能直接走 WordPress REST API。</p>
      </Card>
    </div>
  );
}

export function SitesScreen() {
  const { sites, setActive, removeSite, activeId } = useStore();
  const navigate = useNavigate();
  return (
    <div className="stack">
      <Card title="我的站点" extra={<Link to="/login" className="link">+ 添加站点</Link>}>
        {sites.length === 0 && <p className="muted">还没有站点，先添加一个。</p>}
        <div className="list">
          {sites.map((site) => (
            <div className={`list-row ${activeId === site.id ? 'active' : ''}`} key={site.id}>
              <div className="row-main">
                <strong>{site.name}</strong>
                <span className="muted small">{site.url}</span>
                <div className="row-tags">
                  <Badge tone={site.plugin ? 'success' : 'warn'}>{site.plugin ? '全功能' : '核心功能'}</Badge>
                  <Badge>{site.authMode === 'token' ? '连接密钥' : '应用密码'}</Badge>
                  {site.user && <span className="muted small">{site.user}</span>}
                </div>
              </div>
              <div className="row-actions">
                <Button small onClick={() => { setActive(site.id); navigate('/'); }}>进入</Button>
                <Button small variant="ghost" onClick={() => { if (window.confirm(`移除 ${site.name}？`)) removeSite(site.id); }}>移除</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function AboutScreen() {
  const [release, setRelease] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const { notify } = useStore();

  async function check() {
    setChecking(true);
    const found = await checkAppUpdate();
    setRelease(found);
    notify(found ? `发现新版本 ${found.version}` : '已是最新版本');
    setChecking(false);
  }

  useEffect(() => { check(); }, []);

  return (
    <div className="stack">
      <Card title="关于 FOHOK WP Bridge">
        <div className="about-hero"><div className="brand-mark">F</div><div><h2>FOHOK WP Bridge</h2><p className="muted">开源 · 全功能 WordPress 移动客户端</p></div></div>
        <div className="kv"><span>当前版本</span><strong>app-v{APP_VERSION}</strong></div>
        <div className="kv"><span>开发商</span><strong>FOHOK</strong></div>
        <div className="kv"><span>官网</span><a href="https://www.fohok.xin" target="_blank" rel="noreferrer">https://www.fohok.xin</a></div>
        <div className="kv"><span>联系 / 反馈</span><a href="mailto:open@fohok.xin">open@fohok.xin</a></div>
        <div className="kv"><span>仓库</span><a href={`https://github.com/${REPO}`} target="_blank" rel="noreferrer">github.com/{REPO}</a></div>
        <div className="row-actions top-gap">
          <Button onClick={check} loading={checking}>检查更新</Button>
          <a className="btn btn-ghost" href={`https://github.com/${REPO}/releases`} target="_blank" rel="noreferrer">查看发行版</a>
        </div>
        {release && (
          <Notice tone="success">
            发现新版本 <strong>{release.version}</strong>：{release.name}
            <div><a className="link" href={release.url} target="_blank" rel="noreferrer">前往下载 →</a></div>
            {release.body && <pre className="release-notes">{release.body}</pre>}
          </Notice>
        )}
      </Card>
      <Card title="许可"><p className="muted">GPLv2 or later。APP 与插件独立发行：APP 使用 app-v* 标签，插件使用 plugin-v* 标签，互不干扰。</p></Card>
    </div>
  );
}
