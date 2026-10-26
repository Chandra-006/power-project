import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Mount the React dashboard into the root element declared in index.html.
createRoot(document.getElementById('root')).render(
  // StrictMode helps surface common lifecycle issues during development.
  <StrictMode>
    <App />
  </StrictMode>,
)
