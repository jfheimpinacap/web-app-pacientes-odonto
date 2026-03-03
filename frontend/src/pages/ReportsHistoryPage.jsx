import { useEffect, useMemo, useState } from 'react'
import api from '../api'

function attendanceLabel(status) {
  if (!status) return ''
  if (status === 'arrived') return 'Sí'
  if (status === 'not_arrived' || status === 'canceled') return 'No'
  return ''
}

export default function ReportsHistoryPage() {
  const [patients, setPatients] = useState([])
  const [ordering, setOrdering] = useState('first_name')
  const [searchText, setSearchText] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')

  const fetchPatients = async () => {
    const { data } = await api.get('/patients', { params: { ordering } })
    setPatients(data)
  }

  useEffect(() => {
    fetchPatients()
  }, [ordering])

  const visiblePatients = useMemo(() => {
    const term = submittedSearch.trim().toLowerCase()
    if (!term) return patients
    return patients.filter((p) => {
      const a = String(p.first_name || '').toLowerCase()
      const b = String(p.last_name || '').toLowerCase()
      const c = String(p.national_id || '').toLowerCase()
      return a.includes(term) || b.includes(term) || c.includes(term)
    })
  }, [patients, submittedSearch])

  const sortedIndicator = useMemo(() => ordering.replace('-', ''), [ordering])

  return (
    <section>
      <h2>Informes · Historial paciente</h2>

      <div className="search-bar">
        <input
          placeholder="Buscar por nombre, apellido o RUT/ID"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <button type="button" onClick={() => setSubmittedSearch(searchText)}>
          Buscar
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th onClick={() => setOrdering(ordering === 'first_name' ? '-first_name' : 'first_name')}>
              Nombre {sortedIndicator === 'first_name' ? '↕' : ''}
            </th>
            <th onClick={() => setOrdering(ordering === 'last_name' ? '-last_name' : 'last_name')}>
              Apellido {sortedIndicator === 'last_name' ? '↕' : ''}
            </th>
            <th>Edad</th>
            <th onClick={() => setOrdering(ordering === 'national_id' ? '-national_id' : 'national_id')}>
              RUT/ID {sortedIndicator === 'national_id' ? '↕' : ''}
            </th>
            <th>Estado</th>
            <th>Último profiláctico</th>
            <th>Siguiente cita</th>

            {/* ✅ nueva columna */}
            <th>Asistencia</th>

            <th>Nota</th>
          </tr>
        </thead>

        <tbody>
          {visiblePatients.map((p) => (
            <tr key={p.id}>
              <td>{p.first_name}</td>
              <td>{p.last_name}</td>
              <td>{p.age ?? ''}</td>
              <td>{p.national_id}</td>
              <td>{p.status === 'inactive' ? 'Inactivo' : 'Activo'}</td>
              <td>{p.last_prophylactic_date ?? ''}</td>
              <td>{p.next_appointment_date ?? ''}</td>

              {/* viene del backend (ver punto 5) */}
              <td>{attendanceLabel(p.last_appointment_status)}</td>

              <td>{p.notes ? 'Sí' : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}