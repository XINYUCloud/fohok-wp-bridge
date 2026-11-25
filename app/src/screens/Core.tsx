import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi, useStore } from '../lib/store';
import { formatDate, stripHtml } from '../lib/releases';
import { Badge, Button, Card, Empty, Field, Loader, Modal, Notice, Pager } from '../components/ui';

function useLoad<T>(loader: () => Promise<T>, deps: any[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function run() {
    setLoading(true); setError('');
    try { setData(await loader()); } catch (e: any) { setError(e.message || '加载失败'); }
    finally { setLoading(false); }
  }
  useEffect(() => { run(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return { data, error, loading, reload: run, setData };
}

export function DashboardScreen() {
  const api = useApi();
  const { active } = useStore();
  const info = useLoad<any>(() => api!.bridge('/site/info'), [api]);
  const me = useLoad<any>(() => api!.core('/wp/v2/users/me'), [api]);

  const quick = [
    { to: '/content/posts', label: '文章', icon: '📝' },
    { to: '/content/pages', label: '页面', icon: '📄' },
    { to: '/media', label: '媒体', icon: '🖼' },
    { to: '/comments', label: '评论', icon: '💬' },
    { to: '/users', label: '用户', icon: '👤' },
    { to: '/taxonomy', label: '分类标签', icon: '🏷' },
    { to: '/menus', label: '菜单', icon: '☰' },
    { to: '/updates', label: '更新', icon: '⬆' },
  ];

  if (!api) return <Loader />;
  return (
    <div className="stack">
      {!active?.plugin && <Notice tone="warn">未检测到 FOHOK Bridge 插件，仅显示核心功能。<Link className="link" to="/about">查看安装说明 →</Link></Notice>}
      {info.loading && <Loader />}
      {info.error && <Notice tone="error">站点信息获取失败：{info.error}</Notice>}
      {info.data && (
        <>
          <Card title={info.data.name}>
            <p className="muted">{info.data.description || '暂无站点描述'}</p>
            <div className="stat-grid">
              <div><strong>{info.data.counts.posts}</strong><span>文章</span></div>
              <div><strong>{info.data.counts.pages}</strong><span>页面</span></div>
              <div><strong>{info.data.counts.media}</strong><span>媒体</span></div>
              <div><strong>{info.data.counts.comments}</strong><span>评论</span></div>
              <div><strong>{info.data.counts.users}</strong><span>用户</span></div>
            </div>
            <div className="kv"><span>WordPress</span><strong>{info.data.wp_version}</strong></div>
            <div className="kv"><span>当前主题</span><strong>{info.data.active_theme}</strong></div>
            <div className="kv"><span>站点地址</span><a href={info.data.url} target="_blank" rel="noreferrer">{info.data.url}</a></div>
            {info.data.updates.total > 0 && <Notice tone="warn">有 {info.data.updates.total} 项可用更新（核心 {info.data.updates.core} / 插件 {info.data.updates.plugins} / 主题 {info.data.updates.themes}）。<Link className="link" to="/updates">前往更新 →</Link></Notice>}
          </Card>
        </>
      )}
      {!info.data && me.data && <Card title="站点"><div className="kv"><span>当前用户</span><strong>{me.data.name}</strong></div></Card>}
      <Card title="快捷入口">
        <div className="quick-grid">
          {quick.map((q) => (
            <Link className={`quick ${q.to.includes('menus') || q.to.includes('updates') ? 'disabled' : ''}`} to={q.to} key={q.to}>
              <span className="quick-icon">{q.icon}</span><span>{q.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function ContentScreen() {
  const api = useApi();
  const { notify } = useStore();
  const navigate = useNavigate();
  const params = useParams();
  const type = params.type || 'posts';
  const [types, setTypes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [pages, setPages] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api?.core('/wp/v2/types').then((d: any) => {
      setTypes(Object.keys(d).map((k) => ({ slug: k, name: d[k].name, base: d[k].rest_base })));
    }).catch(() => {});
  }, [api]);

  async function load() {
    if (!api) return;
    setBusy(true);
    try {
      const result: any = await api.coreMeta(`/wp/v2/${type}?per_page=20&page=${page}&orderby=date&order=desc&status=any${query ? `&search=${encodeURIComponent(query)}` : ''}`);
      setItems(result.data || []);
      setPages(Number(result.headers.get('X-WP-TotalPages') || 1));
    } catch (e: any) { notify(e.message); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, [api, type, page, query]); // eslint-disable-line

  async function trash(item: any, force = false) {
    if (!api || !window.confirm(force ? '永久删除？不可恢复。' : '移至回收站？')) return;
    try { await api.core(`/wp/v2/${type}/${item.id}${force ? '?force=true' : ''}`, { method: 'DELETE' }); notify('已删除'); load(); }
    catch (e: any) { notify(e.message); }
  }

  return (
    <div className="stack">
      <Card title={`内容 · ${types.find((t) => t.slug === type)?.name || type}`} extra={<Button small onClick={() => navigate(`/editor/${type}`)}>+ 新建</Button>}>
        <div className="toolbar">
          <select value={type} onChange={(e) => { navigate(`/content/${e.target.value}`); setPage(1); }}>
            {(types.length ? types : [{ slug: 'posts', name: '文章' }, { slug: 'pages', name: '页面' }]).map((t) => <option value={t.slug} key={t.slug}>{t.name}</option>)}
          </select>
          <input placeholder="搜索" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); setQuery(search); } }} />
          <Button small onClick={() => { setPage(1); setQuery(search); }}>搜索</Button>
        </div>
        {busy && <Loader />}
        {!busy && items.length === 0 && <Empty text="没有内容" />}
        <div className="list">
          {items.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="row-main">
                <button className="row-title" onClick={() => navigate(`/editor/${type}/${item.id}`)}>{stripHtml(item.title?.rendered) || '（无标题）'}</button>
                <div className="row-tags">
                  <Badge tone={item.status === 'publish' ? 'success' : 'warn'}>{item.status}</Badge>
                  <span className="muted small">#{item.id} · {formatDate(item.date)}</span>
                </div>
                <p className="excerpt">{stripHtml(item.excerpt?.rendered || item.content?.rendered || '').slice(0, 140)}</p>
              </div>
              <div className="row-actions">
                <Button small variant="ghost" onClick={() => navigate(`/editor/${type}/${item.id}`)}>编辑</Button>
                <Button small variant="ghost" onClick={() => window.open(item.link, '_blank')}>查看</Button>
                <Button small variant="danger" onClick={() => trash(item)}>回收站</Button>
              </div>
            </div>
          ))}
        </div>
        <Pager page={page} pages={pages} onPage={setPage} />
      </Card>
    </div>
  );
}

export function EditorScreen() {
  const api = useApi();
  const { notify } = useStore();
  const navigate = useNavigate();
  const { type = 'posts', id } = useParams();
  const [form, setForm] = useState<any>({ title: '', slug: '', excerpt: '', content: '', status: 'draft', comment_status: 'open' });
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!api || !id) return;
    api.core(`/wp/v2/${type}/${id}`).then((d: any) => setForm({
      title: d.title?.rendered || '', slug: d.slug || '', excerpt: d.excerpt?.rendered || '',
      content: d.content?.rendered || '', status: d.status, comment_status: d.comment_status,
    })).catch((e: any) => notify(e.message)).finally(() => setLoading(false));
  }, [api, id, type]); // eslint-disable-line

  function set(key: string, value: any) { setForm((prev: any) => ({ ...prev, [key]: value })); }

  async function save() {
    if (!api) return;
    setSaving(true);
    try {
      const body: any = { ...form, excerpt: form.excerpt || '' };
      const result: any = id
        ? await api.core(`/wp/v2/${type}/${id}`, { method: 'POST', body })
        : await api.core(`/wp/v2/${type}`, { method: 'POST', body });
      notify('已保存');
      if (!id) navigate(`/editor/${type}/${result.id}`);
    } catch (e: any) { notify(e.message); }
    finally { setSaving(false); }
  }

  if (loading || !api) return <Loader />;
  return (
    <div className="stack">
      <Card title={id ? '编辑内容' : '新建内容'} extra={<Button small variant="ghost" onClick={() => navigate(-1)}>返回</Button>}>
        <Field label="标题"><input value={form.title} onChange={(e) => set('title', e.target.value)} /></Field>
        <Field label="别名 (slug)"><input value={form.slug} onChange={(e) => set('slug', e.target.value)} /></Field>
        <div className="form-row">
          <Field label="状态"><select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="publish">发布</option><option value="draft">草稿</option><option value="pending">待审核</option><option value="private">私密</option><option value="future">定时</option></select></Field>
          <Field label="评论"><select value={form.comment_status} onChange={(e) => set('comment_status', e.target.value)}><option value="open">允许</option><option value="closed">关闭</option></select></Field>
        </div>
        <Field label="摘要"><textarea rows={3} value={form.excerpt} onChange={(e) => set('excerpt', e.target.value)} /></Field>
        <Field label="正文（支持 HTML / 区块标记）" hint="可直接粘贴 HTML 源码"><textarea className="editor" rows={16} value={form.content} onChange={(e) => set('content', e.target.value)} /></Field>
        <Button onClick={save} loading={saving} block>保存</Button>
      </Card>
    </div>
  );
}

export function MediaScreen() {
  const api = useApi();
  const { notify } = useStore();
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [uploading, setUploading] = useState(false);

  async function load() {
    if (!api) return;
    const r: any = await api.coreMeta(`/wp/v2/media?per_page=24&page=${page}&orderby=date&order=desc`);
    setItems(r.data || []);
    setPages(Number(r.headers.get('X-WP-TotalPages') || 1));
  }
  useEffect(() => { load(); }, [api, page]); // eslint-disable-line

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!api || !e.target.files) return;
    setUploading(true);
    const files = Array.from(e.target.files);
    for (const file of files) {
      try { await api.upload(file); notify(`已上传 ${file.name}`); } catch (err: any) { notify(`${file.name}: ${err.message}`); }
    }
    setUploading(false);
    setPage(1); await load();
    e.target.value = '';
  }

  async function remove(item: any) {
    if (!api || !window.confirm(`删除媒体「${item.title?.rendered}」？`)) return;
    try { await api.core(`/wp/v2/media/${item.id}`, { method: 'DELETE', body: { force: true } }); notify('已删除'); load(); }
    catch (e: any) { notify(e.message); }
  }

  return (
    <div className="stack">
      <Card title="媒体库" extra={<label className="btn btn-primary btn-small">上传文件<input type="file" multiple hidden onChange={onFiles} /></label>}>
        {uploading && <Loader label="上传中…" />}
        {!uploading && items.length === 0 && <Empty text="媒体库为空" />}
        <div className="media-grid">
          {items.map((item) => (
            <div className="media-item" key={item.id}>
              {item.media_details?.sizes?.thumbnail?.source_url
                ? <img src={item.media_details.sizes.thumbnail.source_url} alt={item.title?.rendered || ''} />
                : <div className="media-placeholder">📎</div>}
              <div className="media-info"><span title={item.title?.rendered}>{item.title?.rendered || item.slug}</span><button className="link danger" onClick={() => remove(item)}>删除</button></div>
            </div>
          ))}
        </div>
        <Pager page={page} pages={pages} onPage={setPage} />
      </Card>
    </div>
  );
}

export function CommentsScreen() {
  const api = useApi();
  const { notify } = useStore();
  const [status, setStatus] = useState('approve');
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!api) return;
    setBusy(true);
    try { setItems(await api.core(`/wp/v2/comments?per_page=50&status=${status}&orderby=date&order=desc`)); }
    catch (e: any) { notify(e.message); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, [api, status]); // eslint-disable-line

  async function act(item: any, payload: any, label: string) {
    if (!api) return;
    if (label === '删除' && !window.confirm('删除该评论？')) return;
    try {
      if (label === '删除') await api.core(`/wp/v2/comments/${item.id}`, { method: 'DELETE', body: { force: true } });
      else await api.core(`/wp/v2/comments/${item.id}`, { method: 'POST', body: payload });
      notify('操作成功'); load();
    } catch (e: any) { notify(e.message); }
  }

  return (
    <div className="stack">
      <Card title="评论管理" extra={<div className="seg small-seg">{['approve', 'hold', 'spam', 'trash'].map((s) => <button key={s} className={status === s ? 'active' : ''} onClick={() => setStatus(s)}>{({ approve: '已批准', hold: '待审核', spam: '垃圾', trash: '回收站' } as any)[s]}</button>)}</div>}>
        {busy && <Loader />}
        {!busy && items.length === 0 && <Empty text="暂无评论" />}
        <div className="list">
          {items.map((c) => (
            <div className="list-row" key={c.id}>
              <div className="row-main">
                <strong>{stripHtml(c.author_name)}</strong>
                <span className="muted small">{formatDate(c.date)} · 文章 #{c.post}</span>
                <p className="excerpt">{stripHtml(c.content?.rendered)}</p>
              </div>
              <div className="row-actions">
                {c.status !== 'approve' && <Button small variant="ghost" onClick={() => act(c, { status: 'approve' }, '批准')}>批准</Button>}
                {c.status !== 'spam' && <Button small variant="ghost" onClick={() => act(c, { status: 'spam' }, '垃圾')}>垃圾</Button>}
                <Button small variant="danger" onClick={() => act(c, {}, '删除')}>删除</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function UsersScreen() {
  const api = useApi();
  const { notify } = useStore();
  const [items, setItems] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ username: '', email: '', password: '', roles: ['subscriber'] });

  async function load() {
    if (!api) return;
    try {
      const [users, roleData] = await Promise.all([api.core('/wp/v2/users?per_page=100'), api.bridge('/system/roles')]);
      setItems(users || []); setRoles(roleData || []);
    } catch (e: any) { notify(e.message); }
  }
  useEffect(() => { load(); }, [api]); // eslint-disable-line

  async function create() {
    if (!api) return;
    try { await api.core('/wp/v2/users', { method: 'POST', body: form }); notify('用户已创建'); setOpen(false); load(); }
    catch (e: any) { notify(e.message); }
  }

  async function changeRole(user: any, role: string) {
    if (!api) return;
    try { await api.core(`/wp/v2/users/${user.id}`, { method: 'POST', body: { roles: [role] } }); notify('角色已更新'); load(); }
    catch (e: any) { notify(e.message); }
  }

  async function remove(user: any) {
    if (!api || !window.confirm(`删除用户 ${user.name}？`)) return;
    try { await api.core(`/wp/v2/users/${user.id}`, { method: 'DELETE', body: { force: true, reassign: user.id } }); notify('已删除'); load(); }
    catch (e: any) { notify(e.message); }
  }

  return (
    <div className="stack">
      <Card title="用户" extra={<Button small onClick={() => setOpen(true)}>+ 新建用户</Button>}>
        <div className="list">
          {items.map((u) => (
            <div className="list-row" key={u.id}>
              <div className="row-main">
                <strong>{u.name}</strong><span className="muted small">@{u.slug} · {u.email}</span>
                <div className="row-tags">{(u.roles || []).map((r: string) => <Badge key={r}>{r}</Badge>)}</div>
              </div>
              <div className="row-actions">
                <select value={(u.roles || [])[0] || 'subscriber'} onChange={(e) => changeRole(u, e.target.value)}>
                  {(roles.length ? roles.map((r) => r.slug) : ['administrator', 'editor', 'author', 'contributor', 'subscriber']).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <Button small variant="danger" onClick={() => remove(u)}>删除</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Modal open={open} title="新建用户" onClose={() => setOpen(false)}>
        <Field label="用户名"><input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></Field>
        <Field label="邮箱"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="密码"><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
        <Field label="角色"><select value={form.roles[0]} onChange={(e) => setForm({ ...form, roles: [e.target.value] })}>{(roles.length ? roles.map((r) => r.slug) : ['administrator', 'editor', 'author', 'contributor', 'subscriber']).map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Button block onClick={create}>创建</Button>
      </Modal>
    </div>
  );
}

export function TaxonomyScreen() {
  const api = useApi();
  const { notify } = useStore();
  const [taxes, setTaxes] = useState<any[]>([]);
  const [slug, setSlug] = useState('categories');
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ name: '', description: '', parent: 0 });

  useEffect(() => {
    api?.core('/wp/v2/taxonomies').then((d: any) => {
      const list = Object.keys(d).filter((k) => d[k].visibility?.show_ui).map((k) => ({ slug: k, name: d[k].name }));
      setTaxes(list.length ? list : [{ slug: 'categories', name: '分类' }, { slug: 'tags', name: '标签' }]);
    }).catch(() => {});
  }, [api]);

  async function load() {
    if (!api) return;
    try { setItems(await api.core(`/wp/v2/${slug}?per_page=100`)); } catch (e: any) { notify(e.message); }
  }
  useEffect(() => { load(); }, [api, slug]); // eslint-disable-line

  async function create() {
    if (!api || !form.name) return;
    try { await api.core(`/wp/v2/${slug}`, { method: 'POST', body: form }); setForm({ name: '', description: '', parent: 0 }); notify('已创建'); load(); }
    catch (e: any) { notify(e.message); }
  }

  async function remove(item: any) {
    if (!api || !window.confirm(`删除「${item.name}」？`)) return;
    try { await api.core(`/wp/v2/${slug}/${item.id}`, { method: 'DELETE', body: { force: true } }); notify('已删除'); load(); }
    catch (e: any) { notify(e.message); }
  }

  return (
    <div className="stack">
      <Card title="分类与标签">
        <div className="toolbar">
          <select value={slug} onChange={(e) => setSlug(e.target.value)}>{(taxes.length ? taxes : [{ slug, name: slug }]).map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select>
        </div>
        <div className="inline-form">
          <input placeholder="名称" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button onClick={create}>新增</Button>
        </div>
        <div className="list">
          {items.map((t) => (
            <div className="list-row" key={t.id}>
              <div className="row-main"><strong>{t.name}</strong><span className="muted small">#{t.id} · 计数 {t.count}</span></div>
              <div className="row-actions"><Button small variant="danger" onClick={() => remove(t)}>删除</Button></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
