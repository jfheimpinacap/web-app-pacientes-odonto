import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

import PatientsPage from './pages/PatientsPage'
import CreatePatientPage from './pages/CreatePatientPage'
import ReportsHistoryPage from './pages/ReportsHistoryPage'
import ReportsTransferPage from './pages/ReportsTransferPage'
import PatientDetailPage from './pages/PatientDetailPage'

// ✅ Iconos desde frontend/src/icons/
import icoOdonto from './icons/diente_corona_color.svg'
import icoPacientes from './icons/calendar-svgrepo-com.svg'
import icoCrear from './icons/diente_agregar_px.svg'
import icoInformes from './icons/documents-svgrepo-com.svg'   
import icoHistorial from './icons/tooth-magnify-svgrepo-com.svg'
import icoTransfer from './icons/mobile-svgrepo-com.svg'

const links = [
  { to: '/', label: 'Pacientes', icon: icoPacientes },
  { to: '/create', label: 'Crear paciente', icon: icoCrear },
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
        {/* Título con icono casi pegado y un poco más grande que el texto */}
        <h1 className="sidebar-title">
          <span className="sidebar-title-text">Odonto</span>
          <img className="sidebar-title-icon" src={icoOdonto} alt="Odonto" />
        </h1>

        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'} className="nav-link">
            <img className="nav-icon-img" src={link.icon} alt="" aria-hidden="true" />
            <span>{link.label}</span>
          </NavLink>
        ))}

        {/* ✅ Informes con submenu */}
        <div className="nav-group">
          <button
            type="button"
            className={`nav-group-btn ${reportsActive ? 'active' : ''}`}
            onClick={() => setReportsOpen((v) => !v)}
          >
            <img className="nav-icon-img" src={icoInformes} alt="" aria-hidden="true" />
            <span>Informes {reportsOpen ? '▾' : '▸'}</span>
          </button>

          {reportsOpen && (
            <div className="nav-submenu">
              <NavLink to="/reports/history" className="nav-sublink">
                <img className="nav-icon-img" src={icoHistorial} alt="" aria-hidden="true" />
                <span>Historial paciente</span>
              </NavLink>

              <NavLink to="/reports/transfer" className="nav-sublink">
                <img className="nav-icon-img" src={icoTransfer} alt="" aria-hidden="true" />
                <span>Traspaso de datos</span>
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

          <Route path="/reports/history" element={<ReportsHistoryPage />} />
          <Route path="/reports/transfer" element={<ReportsTransferPage />} />

          <Route path="/patients/:id" element={<PatientDetailPage />} />
        </Routes>
      </main>
    </div>
  )
}
