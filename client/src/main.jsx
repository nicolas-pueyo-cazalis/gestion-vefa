import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/main.scss'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ProgrammeProvider } from './context/ProgrammeContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProgrammeProvider>
          <App />
        </ProgrammeProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
