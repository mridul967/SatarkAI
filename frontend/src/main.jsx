import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import DemoPage from './pages/DemoPage.jsx'
import './index.css'
import './demo.css'
import { AuthProvider } from './contexts/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* /demo — standalone judge-facing page, no login required */}
        <Route path="/demo" element={<DemoPage />} />
        {/* Everything else — the main analyst app (requires login) */}
        <Route path="/*" element={
          <AuthProvider>
            <App />
          </AuthProvider>
        } />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
