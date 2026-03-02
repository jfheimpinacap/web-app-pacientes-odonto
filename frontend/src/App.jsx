import { NavLink, Route, Routes } from 'react-router-dom'
import PatientsPage from './pages/PatientsPage'
import CreatePatientPage from './pages/CreatePatientPage'
import InactivePatientsPage from './pages/InactivePatientsPage'
import ReportsPage from './pages/ReportsPage'
import PatientDetailPage from './pages/PatientDetailPage'

const links = [
  { to: '/', label: 'Pacientes' },
  { to: '/create', label: 'Crear paciente' },
  { to: '/inactive', label: 'Pacientes inactivos' },
  { to: '/reports', label: 'Informes' },
]

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Odonto</h1>
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === '/'} className="nav-link">
            {link.label}
          </NavLink>
        ))}
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<PatientsPage />} />
          <Route path="/create" element={<CreatePatientPage />} />
          <Route path="/inactive" element={<InactivePatientsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />
        </Routes>
      </main>
    </div>
  )
}
