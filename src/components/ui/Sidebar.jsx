import clsx from 'clsx';
import { ChevronsLeft, ChevronsRight, Coins, Wallet, X } from 'lucide-react';
import { buildRechargePresets } from '../../utils/wallet';

export default function Sidebar({
  sections = [],
  activeSection,
  onChange,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  walletSummary = null,
  walletCharging = false,
  onQuickTopUp,
}) {
  const balance = Number(walletSummary?.balance || 0).toFixed(2);
  const modeLabel = walletSummary?.preferred_key_source === 'platform' ? 'Default key' : 'Personal key';
  const topUpPresets = buildRechargePresets(walletSummary?.suggested_top_up, 2);

  return (
    <aside className={clsx('sidebar', mobileOpen && 'mobile-open')}>
      <div className="sidebar-top">
        <div className="brand-block">
          <div className="brand-icon">E</div>
          <div className={clsx(collapsed && 'is-hidden')}>
            <p className="brand-kicker">Workspace</p>
            <p className="brand-name">Edvatiq</p>
          </div>
        </div>
        <button type="button" className="collapse-hitbox" onClick={onToggleCollapse} aria-label="Toggle sidebar">
          <span className="icon-button collapse-btn-icon">
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </span>
        </button>
        <button type="button" className="sidebar-mobile-close" onClick={onCloseMobile} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <div className={clsx('sidebar-section-label', collapsed && 'is-hidden')}>
        Navigation
      </div>

      <nav className="side-nav">
        {sections.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              onChange(item.key);
              onCloseMobile?.();
            }}
            className={clsx('side-nav-item', activeSection === item.key && 'active')}
            title={item.label}
          >
            <span className="side-nav-icon">{item.icon}</span>
            <span className={clsx('side-nav-label', collapsed && 'is-hidden')}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-wallet-card">
        <div className="sidebar-wallet-head">
          <div className="sidebar-wallet-icon">
            <Wallet size={16} />
          </div>
          <div className={clsx(collapsed && 'is-hidden')}>
            <strong>Wallet</strong>
            <small>{modeLabel}</small>
          </div>
        </div>
        <div className={clsx('sidebar-wallet-balance', collapsed && 'is-hidden')}>
          <Coins size={14} />
          <span>{balance} credits</span>
        </div>
        <div className={clsx('sidebar-wallet-note', collapsed && 'is-hidden')}>
          Quick recharge for default AI key usage
        </div>
        <div className={clsx('sidebar-wallet-actions', collapsed && 'is-hidden')}>
          {topUpPresets.map((credits) => (
            <button
              key={credits}
              type="button"
              className="sidebar-wallet-action"
              onClick={() => onQuickTopUp?.(credits)}
              disabled={walletCharging}
            >
              +{credits}
            </button>
          ))}
        </div>
        {collapsed ? (
          <button
            type="button"
            className="sidebar-wallet-action sidebar-wallet-action-collapsed"
            onClick={() => onQuickTopUp?.(topUpPresets[0] || 100)}
            disabled={walletCharging}
            title={`Add ${topUpPresets[0] || 100} credits`}
          >
            +
          </button>
        ) : null}
      </div>
    </aside>
  );
}
