import * as React from "react"
import { NavLink, Route, Routes } from "react-router-dom"
import { KeyboardEditingDemo } from "../screens/KeyboardEditingDemo.js"
import { KeyboardModesDemo } from "../screens/KeyboardModesDemo.js"
import { Welcome } from "../screens/Welcome.js"

type NavItem = {
  to: string
  title: string
  description: string
}

const navItems: NavItem[] = [
  {
    to: "/",
    title: "Welcome",
    description: "Quick links and runtime principles."
  },
  {
    to: "/keyboard-modes",
    title: "Keyboard modes",
    description: "Swap focus policies and keymaps live."
  },
  {
    to: "/keyboard-editing",
    title: "Keyboard + Editing",
    description: "Keyboard nav with async in-cell commits."
  }
]

export function App(): JSX.Element {
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-brand">
          <div className="app-logo" aria-hidden="true">
            BG
          </div>
          <div className="app-brand-text">
            <div className="app-brand-title">Busted Grid</div>
            <div className="app-brand-subtitle">React demos</div>
          </div>
        </div>
        <div className="app-topbar-actions">
          <span className="app-link" aria-label="Version">
            v0.1.x demos
          </span>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <div className="app-sidebar-title">Demos</div>
          <nav className="app-nav" aria-label="Demo navigation">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `app-nav-item${isActive ? " is-active" : ""}`
                }
                end={item.to === "/"}
              >
                <div className="app-nav-title">{item.title}</div>
                <div className="app-nav-description">{item.description}</div>
              </NavLink>
            ))}
          </nav>
          <div className="app-sidebar-footer">
            <div className="app-sidebar-footnote">
              Tip: click inside the grid, then use arrow keys.
            </div>
          </div>
        </aside>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/keyboard-modes" element={<KeyboardModesDemo />} />
            <Route
              path="/keyboard-editing"
              element={<KeyboardEditingDemo />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function NotFound(): JSX.Element {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Not Found</h1>
        <p className="page-subtitle">That route doesn’t exist.</p>
      </div>
    </div>
  )
}
