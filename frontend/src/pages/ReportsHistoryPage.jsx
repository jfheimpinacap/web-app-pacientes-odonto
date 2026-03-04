import { useEffect, useMemo, useState } from 'react'
import api from '../api'

function asistenciaLabel(status) {
  if (!status) return ''
  if (status === 'arrived') return 'Sí'
  if (status === 'not_arrived') return 'No'
  if (status === 'canceled') return 'Canceló'
  return String(status)
}

function detalleLabel(status, reason) {
  // reason: patient_change | doctor_change | patient_cancel | null
  if (status === 'canceled') return 'Canceló'
  if (reason === 'patient_change') return 'Reprogramó (Paciente)'
  if (reason === 'doctor_change') return 'Reprogramó (Doctor)'
  if (status === 'not_arrived') return 'No asistió'
  if (status === 'arrived') return 'Asistió'
  return '—'
}

export default function ReportsHistoryPage() {
  const [patients, setPatients] = useState([])
  const [ordering, setOrdering] = useState('first_name')
  const [searchText, setSearchText] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const fetchPatients = async () => {
    const { data } = await api.get('/patients', { params: { ordering } })
    setPatients(data)
  }

  useEffect(() => {
    // ✅ al entrar queda "limpio": no cargamos nada hasta buscar
    // si quieres que al ordenar vuelva a cargar SOLO cuando ya buscaste:
    if (hasSearched) fetchPatients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordering])

  const runSearch = async () => {
    setHasSearched(true)
    setSubmittedSearch(searchText)
    // Cargamos desde backend solo cuando el usuario busca
    await fetchPatients()
  }

  const sortedIndicator = useMemo(() => ordering.replace('-', ''), [ordering])

  const visiblePatients = useMemo(() => {
    if (!hasSearched) return [] // ✅ tabla vacía inicial
    const term = submittedSearch.trim().toLowerCase()
    if (!term) return patients

    return patients.filter((p) => {
      const a = String(p.first_name || '').toLowerCase()
      const b = String(p.last_name || '').toLowerCase()
      const c = String(p.national_id || '').toLowerCase()
      return a.includes(term) || b.includes(term) || c.includes(term)
    })
  }, [patients, submittedSearch, hasSearched])

  return (
    <section>
      <h2>Informes · Historial paciente</h2>

      <div className="search-bar">
        <input
          placeholder="Buscar por nombre, apellido o RUT/ID"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              runSearch()
            }
          }}
        />
        <button type="button" onClick={runSearch}>
          Buscar
        </button>
      </div>

      {/* ✅ Tabla con scroll + header sticky */}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th onClick={() => setOrdering(ordering === 'first_name' ? '-first_name' : 'first_name')}>
                Nombre {sortedIndicator === 'first_name' ? '↕' : ''}
              </th>
              <th onClick={() => setOrdering(ordering === 'last_name' ? '-last_name' : 'last_name')}>
                Apellido {sortedIndicator === 'last_name' ? '↕' : ''}
              </th>
              <th className="table-center">Edad</th>
              <th onClick={() => setOrdering(ordering === 'national_id' ? '-national_id' : 'national_id')}>
                RUT/ID {sortedIndicator === 'national_id' ? '↕' : ''}
              </th>
              <th className="table-center">Estado</th>
              <th className="table-center">Último profiláctico</th>
              <th className="table-center">Siguiente cita</th>

              <th className="table-center">Asistencia</th>
              <th className="table-center">Detalle</th>

              <th className="table-center">Notas</th>
            </tr>
          </thead>

          <tbody>
            {visiblePatients.map((p) => {
              const status = p.last_appointment_status
              const reason = p.last_appointment_reason // puede venir undefined si no lo agregas en backend
              const asistencia = asistenciaLabel(status)
              const detalle = detalleLabel(status, reason)

              return (
                <tr key={p.id} className={status === 'canceled' ? 'row-canceled' : ''}>
                  <td>{p.first_name}</td>
                  <td>{p.last_name}</td>
                  <td className="table-center">{p.age ?? ''}</td>
                  <td>{p.national_id}</td>
                  <td className="table-center">{p.status === 'inactive' ? 'Inactivo' : 'Activo'}</td>
                  <td className="table-center">{p.last_prophylactic_date ?? ''}</td>
                  <td className="table-center">{p.next_appointment_date ?? ''}</td>

                  <td className="table-center">{asistencia}</td>
                  <td className="table-center">{detalle}</td>

                  <td className="table-center">{p.notes ? 'Sí' : ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!hasSearched && (
        <p style={{ opacity: 0.8, marginTop: '.75rem' }}>
          Ingresa un término y presiona <strong>Buscar</strong> para ver resultados.
        </p>
      )}
    </section>
  )
}