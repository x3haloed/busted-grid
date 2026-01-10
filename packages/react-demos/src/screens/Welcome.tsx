import * as React from "react"
import { Link } from "react-router-dom"

export function Welcome(): JSX.Element {
  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">React Demos</h1>
        <p className="page-subtitle">
          A small routed app for stress-testing the runtime from React.
        </p>
      </div>

      <section className="card">
        <h2 className="card-title">Start here</h2>
        <p className="card-text">
          The first demo is keyboard navigation + in-cell editing with async
          commits and visible status/errors.
        </p>
        <div className="card-actions">
          <Link className="button" to="/keyboard-modes">
            Open keyboard modes demo
          </Link>
          <Link className="button button-primary" to="/keyboard-editing">
            Open keyboard + editing demo
          </Link>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Project philosophy</h2>
        <ul className="list">
          <li>Behavior lives in the runtime: commands, constraints, policies.</li>
          <li>Adapters (React/DOM/etc) project a derived view model.</li>
          <li>Input devices translate intent into commands.</li>
        </ul>
      </section>
    </div>
  )
}
