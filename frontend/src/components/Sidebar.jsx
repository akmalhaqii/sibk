import { Link } from 'react-router-dom';
import brandMark from '../assets/brand-mark.svg';

export const RESULT_SECTIONS = [
  { id: 'ringkasan', label: 'Ringkasan', icon: 'summary' },
  { id: 'rasio', label: 'Rasio & Tier', icon: 'ratios' },
  { id: 'valuasi', label: 'Valuasi', icon: 'wallet' },
  { id: 'data-ekstraksi', label: 'Data Ekstraksi', icon: 'table' },
];

const ICON_PATHS = {
  add: 'M12 5v14M5 12h14',
  collapse: 'M3 5h18v14H3zM9 5v14m7-9-2 2 2 2',
  expand: 'M3 5h18v14H3zM9 5v14m5-9 2 2-2 2',
  summary: 'M6 3h9l3 3v15H6zM14 3v4h4M9 11h6m-6 4h6',
  ratios: 'M4 4v16h16M8 16v-3m4 3V9m4 7v-5m4 5V7',
  wallet: 'M4 7h16v13H4zM4 7l14-3v3m2 5h-5a2 2 0 0 0 0 4h5',
  table: 'M4 5h16v14H4zM4 10h16M4 14.5h16M10 5v14',
};

function SidebarIcon({ name }) {
  return (
    <svg className="sidebar-icon" width="21" height="21" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

function SidebarLink({ label, icon, to, current, collapsed }) {
  return (
    <Link className="sidebar-link" to={to} aria-current={current || undefined}
      aria-label={label} title={collapsed ? label : undefined}>
      <SidebarIcon name={icon} />
      <span className="sidebar-label">{label}</span>
    </Link>
  );
}

export default function Sidebar({ collapsed, onToggle, resultRoute, showResultSections, activeSection }) {
  const toggleLabel = collapsed ? 'Perluas sidebar' : 'Perkecil sidebar';

  return (
    <aside className="app-sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-brand" aria-label="TelusurFin, halaman unggah"
          title={collapsed ? 'TelusurFin' : undefined}>
          <span className="sidebar-brand-mark"><img src={brandMark} width="27" height="27" alt="" /></span>
          <span className="sidebar-brand-name">TelusurFin</span>
        </Link>
        <button className="sidebar-toggle" type="button" onClick={onToggle}
          aria-expanded={!collapsed} aria-controls="telusurfin-nav" aria-label={toggleLabel}
          title={toggleLabel}>
          <SidebarIcon name={collapsed ? 'expand' : 'collapse'} />
        </button>
      </div>

      <nav id="telusurfin-nav" className="sidebar-navigation" aria-label="Navigasi TelusurFin">
        <SidebarLink label="Analisis baru" icon="add" to="/" current={!resultRoute ? 'page' : null} collapsed={collapsed} />
        {showResultSections && (
          <ul className="sidebar-result-links">
            {RESULT_SECTIONS.map(({ id, label, icon }) => (
              <li key={id}>
                <SidebarLink
                  label={label}
                  icon={icon}
                  to={{ pathname: '/result', hash: '#' + id }}
                  current={activeSection === id ? 'page' : null}
                  collapsed={collapsed}
                />
              </li>
            ))}
          </ul>
        )}
      </nav>
    </aside>
  );
}
