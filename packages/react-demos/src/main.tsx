import * as React from "react"
import { createRoot } from "react-dom/client"
import { HashRouter } from "react-router-dom"
import { App } from "./routes/App.js"
import "@busted-grid/react/styles/default.css"
import "./styles/app.css"


const element = document.getElementById("root")
if (!element) {
  throw new Error("Missing #root element.")
}

createRoot(element).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
