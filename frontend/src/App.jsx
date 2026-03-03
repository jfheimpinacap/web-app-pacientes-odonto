import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import PatientsPage from './pages/PatientsPage'
import CreatePatientPage from './pages/CreatePatientPage'
import ReportsHistoryPage from './pages/ReportsHistoryPage'
import ReportsTransferPage from './pages/ReportsTransferPage'
import PatientDetailPage from './pages/PatientDetailPage'

const links = [
  { to: '/', label: 'Pacientes' },
  { to: '/create', label: 'Crear paciente' },
]

export default function App() {
  const location = useLocation()
  const [reportsOpen, setReportsOpen] = useState(false)

  const reportsActive = location.pathname.startsWith('/reports')

  useEffect(() => {
    if (reportsActive) setReportsOpen(true)
  }, [reportsActive])

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Odonto</h1>

        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'} className="nav-link">
            {link.label}
          </NavLink>
        ))}

        {/* ✅ Informes con submenu */}
        <div className="nav-group">
          <button
            type="button"
            className={`nav-group-btn ${reportsActive ? 'active' : ''}`}
            onClick={() => setReportsOpen((v) => !v)}
          >
            Informes {reportsOpen ? '▾' : '▸'}
          </button>

          {reportsOpen && (
            <div className="nav-submenu">
              <NavLink to="/reports/history" className="nav-sublink">
                Historial paciente
              </NavLink>
              <NavLink to="/reports/transfer" className="nav-sublink">
                Traspaso de datos
              </NavLink>
            </div>
          )}
        </div>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<PatientsPage />} />
          <Route path="/create" element={<CreatePatientPage />} />
          <Route path="/create/:id" element={<CreatePatientPage />} />

          {/* ✅ nuevas rutas */}
          <Route path="/reports/history" element={<ReportsHistoryPage />} />
          <Route path="/reports/transfer" element={<ReportsTransferPage />} />

          <Route path="/patients/:id" element={<PatientDetailPage />} />
        </Routes>
      </main>
    </div>
  )
}
