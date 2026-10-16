import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthRoot } from './features/auth/AuthRoot'
import './App.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthRoot />
  </StrictMode>,
)
