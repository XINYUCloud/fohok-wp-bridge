import React, { useEffect, useState } from 'react';
import { useApi, useStore } from '../lib/store';
import { Badge, Button, Card, Empty, Field, Loader, Modal, Notice } from '../components/ui';
import { PLUGIN_ZIP_URL } from '../lib/api';

export function PluginGate({ children }: any) {
  const { active } = useStore();
  if (!active?.plugin) {
    return (
      <Notice tone="warn">
        此功能需要安装 FOHOK Bridge 插件。
        <div className="row-actions top-gap">
          <a className="btn btn-primary btn-small" href={PLUGIN_ZIP_URL} target="_blank" rel="noreferrer">下载插件</a>
          <a className="btn btn-ghost btn-small" href="https://github.com/XINYUCloud/fohok-wp-bridge/tree/main/plugin" target="_blank" rel="noreferrer">查看源码</a>
        </div>
      </Notice>
    );
  }
  return children;
}

function useBridge<T>(path: string) {
  const api = useApi();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function load() {
    if (!api) return;
    setLoading(true); setError('');
    try { setData(await api.bridge(path)); } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [api, path]); // eslint-disable-line
  return { data, error, loading, reload: load, setData };
}

export function MenusScreen() {
  const api = useApi();
  const { notify } = useStore();
  const menus = useBridge<any[]>('/menus');
  const locations = useBridge<any>('/menus/locations');
  const [selected, setSelected] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [item, setItem] = useState<any>({ title: '', url: '', type: 'custom', object: 'page', object_id: 0, parent: 0 });

  const current = (menus.data || []).find((m) => m.id === selected) || (menus.data || [])[0];

  async function create() {
    if (!api || !name) return;
    try { await api.bridge('/menus', { method: 'POST', body: { name } }); notify('菜单已创建'); setCreateOpen(false); setName(''); menus.reload(); }
    catch (e: any) { notify(e.message); }
  }
  async function addItem() {
    if (!api || !current) return;
    try { await api.bridge(`/menus/${current.id}/items`, { method: 'POST', body: item }); notify('菜单项已添加'); setItem({ title: '', url: '', type: 'custom', object: 'page', object_id: 0, parent: 0 }); menus.reload(); }
    catch (e: any) { notify(e.message); }
  }
  async function removeItem(id: number) {
    if (!api || !current || !window.confirm('移除该菜单项？')) return;
    try { await api.bridge(`/menus/${current.id}/items/${id}`, { method: 'DELETE' }); menus.reload(); }
    catch (e: any) { notify(e.message); }
  }
  async function assign(location: string, menu: number) {
    if (!api) return;
    try { await api.bridge(`/menus/${menu}/locations`, { method: 'POST', body: { location, menu } }); notify('已分配'); locations.reload(); }
    catch (e: any) { notify(e.message); }
  }
  async function removeMenu(id: number) {
    if (!api || !window.confirm('删除该菜单？')) return;
    try { await api.bridge(`/menus/${id}`, { method: 'DELETE' }); menus.reload(); }
    catch (e: any) { notify(e.message); }
  }

  if (menus.loading) return <Loader />;
  return (
    <PluginGate>
      <div className="stack">
        <Card title="菜单" extra={<Button small onClick={() => setCreateOpen(true)}>+ 新建菜单</Button>}>
          {!menus.data?.length && <Empty text="还没有菜单" />}
          <div className="list">
            {(menus.data || []).map((m) => (
              <div className={`list-row ${current?.id === m.id ? 'active' : ''}`} key={m.id}>
                <div className="row-main"><strong>{m.name}</strong><span className="muted small">{m.count} 项 · {m.slug}</span></div>
                <div className="row-actions">
                  <Button small variant="ghost" onClick={() => setSelected(m.id)}>查看</Button>
                  <Button small variant="danger" onClick={() => removeMenu(m.id)}>删除</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        {current && (
          <Card title={`菜单项 · ${current.name}`}>
            <div className="form-row">
              <Field label="类型"><select value={item.type} onChange={(e) => setItem({ ...item, type: e.target.value })}><option value="custom">自定义链接</option><option value="post_type">文章/页面</option></select></Field>
              <Field label="标题"><input value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} /></Field>
            </div>
            {item.type === 'custom' ? (
              <Field label="URL"><input value={item.url} onChange={(e) => setItem({ ...item, url: e.target.value })} /></Field>
            ) : (
              <div className="form-row">
                <Field label="对象类型"><input value={item.object} onChange={(e) => setItem({ ...item, object: e.target.value })} /></Field>
                <Field label="对象 ID"><input type="number" value={item.object_id} onChange={(e) => setItem({ ...item, object_id: Number(e.target.value) })} /></Field>
              </div>
            )}
            <Field label="父菜单 ID"><input type="number" value={item.parent} onChange={(e) => setItem({ ...item, parent: Number(e.target.value) })} /></Field>
            <Button onClick={addItem}>添加菜单项</Button>
            <div className="list top-gap">
              {current.items?.map((i: any) => (
                <div className="list-row" key={i.id}>
                  <div className="row-main"><strong>{i.title}</strong><span className="muted small">{i.type} · {i.url || `#${i.object_id}`}</span></div>
                  <div className="row-actions"><Button small variant="danger" onClick={() => removeItem(i.id)}>移除</Button></div>
                </div>
              ))}
            </div>
          </Card>
        )}
        {(locations.data?.locations || []).length > 0 && (
          <Card title="菜单位置">
            {locations.data.locations.map((loc: any) => (
              <div className="kv" key={loc.slug}>
                <span>{loc.name}</span>
                <select value={loc.menu || ''} onChange={(e) => assign(loc.slug, Number(e.target.value))}>
                  <option value="">未分配</option>
                  {(locations.data.menus || []).map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            ))}
          </Card>
        )}
      </div>
      <Modal open={createOpen} title="新建菜单" onClose={() => setCreateOpen(false)}>
        <Field label="菜单名称"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Button block onClick={create}>创建</Button>
      </Modal>
    </PluginGate>
  );
}

export function WidgetsScreen() {
  const api = useApi();
  const { notify } = useStore();
  const state = useBridge<any>('/widgets');
  const [draft, setDraft] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (state.data?.assignments) setDraft(state.data.assignments);
  }, [state.data]);

  function move(sidebar: string, index: number, delta: number) {
    const list = [...(draft[sidebar] || [])];
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    setDraft({ ...draft, [sidebar]: list });
  }

  async function save(sidebar: string) {
    if (!api) return;
    try { await api.bridge(`/widgets/sidebars/${sidebar}`, { method: 'POST', body: { widgets: draft[sidebar] || [] } }); notify('已保存'); state.reload(); }
    catch (e: any) { notify(e.message); }
  }

  if (state.loading) return <Loader />;
  return (
    <PluginGate>
      <div className="stack">
        {(state.data?.sidebars || []).map((sidebar: any) => (
          <Card key={sidebar.id} title={sidebar.name} extra={<Button small onClick={() => save(sidebar.id)}>保存排序</Button>}>
            <p className="muted small">{sidebar.description}</p>
            {(draft[sidebar.id] || []).length === 0 && <Empty text="该侧边栏没有小工具" />}
            <div className="list">
              {(draft[sidebar.id] || []).map((id: string, idx: number) => {
                const meta = (state.data.widgets || []).find((w: any) => w.id === id);
                return (
                  <div className="list-row" key={`${id}-${idx}`}>
                    <div className="row-main"><strong>{meta?.name || id}</strong><span className="muted small">{id}</span></div>
                    <div className="row-actions">
                      <Button small variant="ghost" onClick={() => move(sidebar.id, idx, -1)}>↑</Button>
                      <Button small variant="ghost" onClick={() => move(sidebar.id, idx, 1)}>↓</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </PluginGate>
  );
}

export function PluginsScreen() {
  const api = useApi();
  const { notify } = useStore();
  const state = useBridge<any>('/plugins');
  const [slug, setSlug] = useState('');

  async function act(item: any, action: string) {
    if (!api || !window.confirm(`${action} 插件「${item.name}」？`)) return;
    try { await api.bridge(`/plugins/${encodeURIComponent(item.slug)}/${action}`, { method: 'POST' }); notify('操作成功'); state.reload(); }
    catch (e: any) { notify(e.message); }
  }
  async function install() {
    if (!api || !slug) return;
    try { await api.bridge('/plugins/install', { method: 'POST', body: { slug } }); notify('安装完成'); setSlug(''); state.reload(); }
    catch (e: any) { notify(e.message); }
  }

  if (state.loading) return <Loader />;
  return (
    <PluginGate>
      <div className="stack">
        <Card title="安装插件" >
          <div className="inline-form"><input placeholder="wordpress.org 插件 slug" value={slug} onChange={(e) => setSlug(e.target.value)} /><Button onClick={install}>安装</Button></div>
        </Card>
        <Card title={`插件 (${state.data?.items?.length || 0})`}>
          {(state.data?.items || []).map((p: any) => (
            <div className="list-row" key={p.file}>
              <div className="row-main"><strong>{p.name}</strong><span className="muted small">{p.version} · {p.author}</span>
                <div className="row-tags"><Badge tone={p.active ? 'success' : 'default'}>{p.active ? '已启用' : '未启用'}</Badge>{p.update && <Badge tone="warn">可更新 {p.update}</Badge>}</div>
              </div>
              <div className="row-actions">
                <Button small variant="ghost" onClick={() => act(p, p.active ? 'deactivate' : 'activate')}>{p.active ? '停用' : '启用'}</Button>
                {p.update && <Button small variant="ghost" onClick={() => act(p, 'update')}>更新</Button>}
                {!p.active && <Button small variant="danger" onClick={() => act(p, 'delete')}>删除</Button>}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </PluginGate>
  );
}

export function ThemesScreen() {
  const api = useApi();
  const { notify } = useStore();
  const state = useBridge<any>('/themes');

  async function act(item: any, action: string) {
    if (!api || !window.confirm(`${action} 主题「${item.name}」？`)) return;
    try { await api.bridge(`/themes/${encodeURIComponent(item.slug)}/${action}`, { method: 'POST' }); notify('操作成功'); state.reload(); }
    catch (e: any) { notify(e.message); }
  }

  if (state.loading) return <Loader />;
  return (
    <PluginGate>
      <div className="stack">
        <Card title={`主题 (${state.data?.items?.length || 0})`}>
          {(state.data?.items || []).map((t: any) => (
            <div className="list-row" key={t.slug}>
              <div className="row-main"><strong>{t.name}</strong><span className="muted small">{t.version} · {t.author}</span>
                <div className="row-tags"><Badge tone={t.active ? 'success' : 'default'}>{t.active ? '当前主题' : '未启用'}</Badge>{t.update && <Badge tone="warn">可更新 {t.update}</Badge>}</div>
              </div>
              <div className="row-actions">
                {!t.active && <Button small onClick={() => act(t, 'activate')}>启用</Button>}
                {t.update && <Button small variant="ghost" onClick={() => act(t, 'update')}>更新</Button>}
                {!t.active && <Button small variant="danger" onClick={() => act(t, 'delete')}>删除</Button>}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </PluginGate>
  );
}

export function SettingsScreen() {
  const api = useApi();
  const { notify } = useStore();
  const core = useBridge<any>('/settings/core');
  const bridge = useBridge<any>('/settings/bridge');
  const [draft, setDraft] = useState<any>({});
  const [origins, setOrigins] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => { if (core.data) setDraft({ ...core.data }); }, [core.data]);
  useEffect(() => {
    if (bridge.data) {
      const o = bridge.data.allowed_origins;
      setOrigins(Array.isArray(o) ? o.join('\n') : o || '*');
    }
  }, [bridge.data]);

  function value(key: string, v: any) { setDraft((prev: any) => ({ ...prev, [key]: v })); }

  async function saveCore() {
    if (!api) return;
    try { await api.bridge('/settings/core', { method: 'POST', body: draft }); notify('设置已保存'); core.reload(); }
    catch (e: any) { notify(e.message); }
  }
  async function saveBridge() {
    if (!api) return;
    try { await api.bridge('/settings/bridge', { method: 'POST', body: { allowed_origins: origins } }); notify('连接设置已保存'); bridge.reload(); }
    catch (e: any) { notify(e.message); }
  }
  async function regenerate() {
    if (!api || !window.confirm('重新生成会使旧密钥立即失效，继续？')) return;
    try { const r: any = await api.bridge('/settings/bridge/token', { method: 'POST' }); setToken(r.token); notify('新密钥已生成，请立即复制'); bridge.reload(); }
    catch (e: any) { notify(e.message); }
  }

  if (core.loading || bridge.loading) return <Loader />;
  const groups: Record<string, string[]> = {};
  Object.keys(draft).forEach((key) => {
    const group = key.split('_')[0];
    (groups[group] = groups[group] || []).push(key);
  });

  return (
    <PluginGate>
      <div className="stack">
        <Card title="连接设置">
          <Field label="允许的跨域来源" hint="每行一个，* 表示任意来源"><textarea rows={3} value={origins} onChange={(e) => setOrigins(e.target.value)} /></Field>
          <div className="row-actions"><Button onClick={saveBridge}>保存</Button><Button variant="secondary" onClick={regenerate}>重新生成连接密钥</Button></div>
          {token && <Notice tone="success">新密钥（仅显示一次）：<code className="token-box">{token}</code><Button small variant="ghost" onClick={() => { navigator.clipboard.writeText(token); notify('已复制'); }}>复制</Button></Notice>}
        </Card>
        <Card title="站点设置" extra={<Button small onClick={saveCore}>保存设置</Button>}>
          {Object.keys(groups).map((group) => (
            <div className="settings-group" key={group}>
              <h4>{group}</h4>
              {groups[group].map((key) => {
                const v = draft[key];
                if (typeof v === 'boolean') return <label className="kv" key={key}><span>{key}</span><input type="checkbox" checked={v} onChange={(e) => value(key, e.target.checked)} /></label>;
                if (typeof v === 'number') return <label className="kv" key={key}><span>{key}</span><input type="number" value={v} onChange={(e) => value(key, Number(e.target.value))} /></label>;
                if (Array.isArray(v)) return <label className="kv" key={key}><span>{key}</span><input value={v.join(', ')} onChange={(e) => value(key, e.target.value.split(',').map((s) => s.trim()))} /></label>;
                return <label className="kv" key={key}><span>{key}</span><input value={String(v ?? '')} onChange={(e) => value(key, e.target.value)} /></label>;
              })}
            </div>
          ))}
        </Card>
      </div>
    </PluginGate>
  );
}

export function UpdatesScreen() {
  const api = useApi();
  const { notify } = useStore();
  const state = useBridge<any>('/updates');
  const [busy, setBusy] = useState('');

  async function run(type: string) {
    if (!api || !window.confirm(`执行 ${type} 更新？建议先备份站点。`)) return;
    setBusy(type);
    try { const r: any = await api.bridge(`/updates/${type}`, { method: 'POST' }); notify(`更新完成：${JSON.stringify(r)}`); state.reload(); }
    catch (e: any) { notify(e.message); }
    finally { setBusy(''); }
  }

  if (state.loading) return <Loader />;
  return (
    <PluginGate>
      <div className="stack">
        <Notice tone="warn">执行更新前请备份站点。更新依赖服务器文件系统权限，失败时请检查 WP_Filesystem 配置。</Notice>
        <Card title="WordPress 核心">
          {(state.data?.core || []).length === 0 && <Empty text="已是最新版本" />}
          {(state.data?.core || []).map((u: any) => (
            <div className="list-row" key={u.version}><div className="row-main"><strong>WordPress {u.version}</strong></div><div className="row-actions"><Button small onClick={() => run('core')} loading={busy === 'core'}>更新</Button></div></div>
          ))}
        </Card>
        <Card title="插件更新">
          {(state.data?.plugins || []).length === 0 && <Empty text="无需更新" />}
          {(state.data?.plugins || []).map((p: string) => <div className="list-row" key={p}><div className="row-main"><strong>{p}</strong></div></div>)}
          {!!state.data?.plugins?.length && <div className="top-gap"><Button onClick={() => run('plugins')} loading={busy === 'plugins'}>更新全部插件</Button></div>}
        </Card>
        <Card title="主题更新">
          {(state.data?.themes || []).length === 0 && <Empty text="无需更新" />}
          {(state.data?.themes || []).map((t: string) => <div className="list-row" key={t}><div className="row-main"><strong>{t}</strong></div></div>)}
          {!!state.data?.themes?.length && <div className="top-gap"><Button onClick={() => run('themes')} loading={busy === 'themes'}>更新全部主题</Button></div>}
        </Card>
      </div>
    </PluginGate>
  );
}

export function HealthScreen() {
  const state = useBridge<any>('/site/health');
  if (state.loading) return <Loader />;
  return (
    <PluginGate>
      <div className="stack">
        <Card title="站点健康">
          {(state.data?.tests || []).map((t: any) => (
            <div className="list-row" key={t.key}>
              <div className="row-main"><strong>{t.label}</strong><p className="excerpt">{t.description}</p></div>
              <div className="row-actions"><Badge tone={t.status === 'good' ? 'success' : t.status === 'recommended' ? 'warn' : 'error'}>{t.status}</Badge></div>
            </div>
          ))}
        </Card>
      </div>
    </PluginGate>
  );
}
