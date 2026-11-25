import React from 'react';

export function Button({ children, onClick, variant = 'primary', disabled, loading, type = 'button', block, small }: any) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}${block ? ' btn-block' : ''}${small ? ' btn-small' : ''}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
}

export function Card({ title, extra, children, className = '' }: any) {
  return (
    <section className={`card ${className}`}>
      {(title || extra) && (
        <header className="card-head">
          <h3>{title}</h3>
          {extra}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

export function Loader({ label = '加载中…' }: { label?: string }) {
  return <div className="loader"><span className="spinner" />{label}</div>;
}

export function Empty({ text = '暂无数据', action }: any) {
  return <div className="empty"><div className="empty-icon">◇</div><p>{text}</p>{action}</div>;
}

export function Modal({ open, title, onClose, children }: any) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}>✕</button></header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: any) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Badge({ children, tone = 'default' }: any) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Pager({ page, pages, onPage }: any) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <Button small variant="ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>上一页</Button>
      <span>{page} / {pages}</span>
      <Button small variant="ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>下一页</Button>
    </div>
  );
}

export function Notice({ children, tone = 'info' }: any) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}
