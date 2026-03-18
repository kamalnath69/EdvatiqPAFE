import clsx from 'clsx';
import { Activity, ChevronsLeft, ChevronsRight, ShieldCheck } from 'lucide-react';

export default function Sidebar({ sections = [], activeSection, onChange, collapsed = false, onToggleCollapse }) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-icon">
          <Activity size={20} />
        </div>
        <div className={clsx(collapsed && 'is-hidden')}>
          <p className="brand-kicker">Performance</p>
          <p className="brand-name">Edvatiq</p>
        </div>
        <button type="button" className="collapse-hitbox" onClick={onToggleCollapse} aria-label="Toggle sidebar">
          <span className="icon-button collapse-btn-icon">
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </span>
        </button>
      </div>

      <nav className="side-nav">
        {sections.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={clsx('side-nav-item', activeSection === item.key && 'active')}
            title={item.label}
          >
            <span className="side-nav-icon">{item.icon}</span>
            <span className={clsx('side-nav-label', collapsed && 'is-hidden')}>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className={clsx('side-footer', collapsed && 'is-hidden')}>
        <div className="status-chip">
          <ShieldCheck size={14} />
          <span>RBAC Active</span>
        </div>
        <small>Enterprise Workspace</small>
      </div>
    </aside>
  );
}
