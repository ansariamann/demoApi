// ============================================================================
// components/Sidebar.jsx — Fixed Navigation Sidebar
// ============================================================================
// WHY a sidebar instead of a top navbar?
//   A sidebar is the standard layout for developer tools (Postman, Datadog,
//   VS Code). It gives persistent navigation without taking vertical space
//   from the main content area, which is critical for displaying JSON
//   responses and data tables.
//
// The sidebar uses NavLink from react-router-dom which automatically
// applies an "active" class to the current route. This drives the
// visual active indicator (cyan highlight + left border).
// ============================================================================

import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  // Navigation items — each maps to a page in the app.
  // WHY emojis for icons? Zero dependencies. In production you'd use
  // an icon library (Lucide, Heroicons), but for this challenge emojis
  // are visually clear and add zero bundle size.
  const navItems = [
    { path: '/', icon: '🔍', label: 'API Explorer' },
    { path: '/tester', icon: '🧪', label: 'API Tester' },
    { path: '/history', icon: '📋', label: 'History' },
    { path: '/query', icon: '🗄️', label: 'Query Interface' }
  ];

  return (
    <aside className="sidebar" id="main-sidebar">
      {/* ---- Logo Section ---- */}
      {/* The gradient text matches the logo icon gradient,
          creating visual cohesion at the top of the sidebar */}
      <div className="sidebar-logo">
        <div className="logo-icon">⚡</div>
        <h1>
          API Explorer
          <span className="logo-subtitle" style={{ display: 'block' }}>
            Monitoring Tool
          </span>
        </h1>
      </div>

      {/* ---- Navigation Links ---- */}
      {/* NavLink's `end` prop on "/" ensures it only matches the exact
          root path, not all routes that start with "/" */}
      <nav className="sidebar-nav">
        {navItems.map(({ path, icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ---- Footer Info ---- */}
      <div style={{
        padding: 'var(--space-md)',
        borderTop: '1px solid var(--border-primary)',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        textAlign: 'center'
      }}>
        ShipIQ Backend Service
      </div>
    </aside>
  );
}
