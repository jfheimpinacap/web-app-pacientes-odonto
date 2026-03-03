import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import NotesModal from '../components/NotesModal'

function toDateOnly(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function parseISODate(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const dt = new Date(y, m - 1, d)
  dt.setHours(0, 0, 0, 0)
  return dt
}

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [ordering, setOrdering] = useState('first_name')
  const [editing, setEditing] = useState({})
  const [modalPatient, setModalPatient] = useState(null)
  const [modalNotes, setModalNotes] = useState('')
  const [searchText, setSearchText] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [statusView, setStatusView] = useState('all') // all | inactive

  // ---- búsqueda avanzada ----
  const [advMode, setAdvMode] = useState('none')
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')

  // ---- flujo historial al cambiar “Siguiente cita” ----
  // confirmStep: null | 'attended' | 'newdate'
  const [confirmStep, setConfirmStep] = useState(null)
  // { patientId, oldDate, newDate }
  const [pendingNextChange, setPendingNextChange] = useState(null)

  const fetchPatients = async () => {
    const params = { ordering }
    if (statusView === 'inactive') params.status = 'inactive'
    const { data } = await api.get('/patients', { params })
    setPatients(data)
  }

  useEffect(() => {
    fetchPatients()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordering, statusView])

  const sortedIndicator = useMemo(() => ordering.replace('-', ''), [ordering])

  const toggleOrdering = (key) => {
    setOrdering((prev) => (prev === key ? `-${key}` : key))
  }

  const toggleStatusView = () => {
    setStatusView((prev) => (prev === 'inactive' ? 'all' : 'inactive'))
  }

  const saveField = async (id, field, value) => {
    try {
      const payload = { [field]: value === '' ? null : value }
      const { data } = await api.patch(`/patients/${id}/`, payload)

      if (data.should_move_to_inactive && data.status === 'active') {
        const decision = window.confirm('¿Mover a inactivos?')
        if (decision) await api.patch(`/patients/${id}/`, { status: 'inactive' })
      }

      setEditing((prev) => {
        const copy = { ...prev }
        delete copy[`${id}-${field}`]
        return copy
      })

      fetchPatients()
    } catch {}
  }

  const createHistory = async (patientId, oldDate, attended) => {
    // oldDate debe ser YYYY-MM-DD
    if (!oldDate) return
    try {
      await api.post(`/patients/${patientId}/appointments/`, {
        date: oldDate,
        status: attended ? 'arrived' : 'not_arrived',
      })
    } catch {
      // si falla, no bloqueamos todo, pero idealmente aquí iría un toast
    }
  }

  // -------- filtros ----------
  const filteredPatients = useMemo(() => {
    let list = patients

    // 1) filtro por texto (solo cuando se presiona Buscar)
    const term = submittedSearch.trim().toLowerCase()
    if (term) {
      list = list.filter((p) => {
        const first = String(p.first_name || '').toLowerCase()
        const last = String(p.last_name || '').toLowerCase()
        const nid = String(p.national_id || '').toLowerCase()
        return first.includes(term) || last.includes(term) || nid.includes(term)
      })
    }

    // 2) filtro avanzado por fecha de next_appointment_date
    const today = toDateOnly(new Date())
    const nextDateOf = (p) => parseISODate(p.next_appointment_date)

    if (advMode === 'next_week' || advMode === 'next_month') {
      const days = advMode === 'next_week' ? 7 : 30
      const end = toDateOnly(new Date(today))
      end.setDate(end.getDate() + days)

      list = list.filter((p) => {
        const dt = nextDateOf(p)
        if (!dt) return false
        return dt >= today && dt <= end
      })
    }

    if (advMode === 'this_month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1)
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      first.setHours(0, 0, 0, 0)
      last.setHours(0, 0, 0, 0)

      list = list.filter((p) => {
        const dt = nextDateOf(p)
        if (!dt) return false
        return dt >= first && dt <= last
      })
    }

    if (advMode === 'overdue') {
      list = list.filter((p) => {
        const dt = nextDateOf(p)
        if (!dt) return false
        return dt < today
      })
    }

    if (advMode === 'range') {
      const from = parseISODate(rangeFrom)
      const to = parseISODate(rangeTo)

      if (from && to) {
        list = list.filter((p) => {
          const dt = nextDateOf(p)
          if (!dt) return false
          return dt >= from && dt <= to
        })
      } else if (from && !to) {
        list = list.filter((p) => {
          const dt = nextDateOf(p)
          if (!dt) return false
          return dt >= from
        })
      } else if (!from && to) {
        list = list.filter((p) => {
          const dt = nextDateOf(p)
          if (!dt) return false
          return dt <= to
        })
      }
    }

    return list
  }, [patients, submittedSearch, advMode, rangeFrom, rangeTo])

  const isOverdue = (patient) => {
    const today = toDateOnly(new Date())
    const dt = parseISODate(patient.next_appointment_date)
    return dt ? dt < today : false
  }

  const showOverdueHighlight = advMode === 'this_month' || advMode === 'overdue'

  // ---- Modales de confirmación (simple, sin componente extra) ----
  const ConfirmModal = ({ open, title, message, yesText = 'Sí', noText = 'No', onYes, onNo }) => {
    if (!open) return null
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h3 style={{ marginTop: 0 }}>{title}</h3>
          <p>{message}</p>
          <div className="modal-actions">
            <button type="button" onClick={onNo}>{noText}</button>
            <button type="button" onClick={onYes}>{yesText}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section>
      <h2>Pacientes {statusView === 'inactive' ? '(Inactivos)' : ''}</h2>

      {/* Buscador */}
      <div className="search-bar">
        <input
          placeholder="Buscar por nombre, apellido o RUT/ID"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <button type="button" onClick={() => setSubmittedSearch(searchText)}>
          Buscar
        </button>

        <button type="button" onClick={toggleStatusView}>
          {statusView === 'inactive' ? 'Ver activos' : 'Ver inactivos'}
        </button>
      </div>

      {/* Búsqueda avanzada */}
      <div className="advanced-search">
        <h3>Búsqueda avanzada (por Siguiente cita)</h3>

        <div className="advanced-row">
          <span className="label">Modo:</span>
          <select value={advMode} onChange={(e) => setAdvMode(e.target.value)}>
            <option value="none">Sin filtro</option>
            <option value="next_week">Próxima semana</option>
            <option value="next_month">Próximo mes</option>
            <option value="this_month">Este mes</option>
            <option value="overdue">Vencidos</option>
            <option value="range">Rango (Desde/Hasta)</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setAdvMode('none')
              setRangeFrom('')
              setRangeTo('')
            }}
          >
            Limpiar filtro
          </button>
        </div>

        {advMode === 'range' && (
          <div className="advanced-row">
            <span className="label">Desde:</span>
            <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />

            <span className="label">Hasta:</span>
            <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
          </div>
        )}
      </div>

      {/* Tabla */}
      <table>
        <thead>
          <tr>
            <th onClick={() => toggleOrdering('first_name')}>
              Nombre {sortedIndicator === 'first_name' ? '↕' : ''}
            </th>
            <th onClick={() => toggleOrdering('last_name')}>
              Apellido {sortedIndicator === 'last_name' ? '↕' : ''}
            </th>
            <th>Edad</th>
            <th onClick={() => toggleOrdering('national_id')}>
              RUT/ID {sortedIndicator === 'national_id' ? '↕' : ''}
            </th>

            <th onClick={() => toggleOrdering('status')}>
              Estado {sortedIndicator === 'status' ? '↕' : ''}
            </th>

            <th>Último profiláctico</th>
            <th>Siguiente cita</th>
            <th>Nota</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {filteredPatients.map((patient) => {
            const nextDateValue =
              editing[`${patient.id}-next_appointment_date`] ?? (patient.next_appointment_date ?? '')

            return (
              <tr
                key={patient.id}
                className={showOverdueHighlight && isOverdue(patient) ? 'row-overdue' : ''}
              >
                <td>{patient.first_name}</td>
                <td>{patient.last_name}</td>
                <td>{patient.age ?? ''}</td>
                <td>{patient.national_id}</td>

                <td>
                  <select
                    value={editing[`${patient.id}-status`] ?? (patient.status ?? 'active')}
                    onChange={(e) => {
                      const value = e.target.value
                      setEditing((prev) => ({ ...prev, [`${patient.id}-status`]: value }))
                      saveField(patient.id, 'status', value)
                    }}
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </td>

                {/* Último profiláctico: editable directo */}
                <td>
                  <input
                    type="date"
                    value={
                      editing[`${patient.id}-last_prophylactic_date`]
                      ?? (patient.last_prophylactic_date ?? '')
                    }
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        [`${patient.id}-last_prophylactic_date`]: e.target.value,
                      }))
                    }
                    onBlur={(e) => saveField(patient.id, 'last_prophylactic_date', e.target.value)}
                  />
                </td>

                {/* Siguiente cita: flujo con confirmaciones */}
                <td>
                  <input
                    type="date"
                    value={nextDateValue}
                    onChange={(e) =>
                      setEditing((prev) => ({
                        ...prev,
                        [`${patient.id}-next_appointment_date`]: e.target.value,
                      }))
                    }
                    onBlur={(e) => {
                      const newDate = e.target.value
                      const oldDate = patient.next_appointment_date ?? ''

                      if (newDate === oldDate) return

                      // disparar el flujo
                      setPendingNextChange({ patientId: patient.id, oldDate, newDate })
                      setConfirmStep('attended')
                    }}
                  />

                  {/* Mostrar texto "Fecha pendiente" cuando está vacío */}
                  {(!nextDateValue || nextDateValue === '') && (
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Fecha pendiente</div>
                  )}
                </td>

                <td>
                  <button
                    type="button"
                    onClick={() => {
                      setModalPatient(patient)
                      setModalNotes(patient.notes || '')
                    }}
                  >
                    Abrir
                  </button>
                </td>

                <td>
                  <div className="action-buttons">
                    <Link to={`/create/${patient.id}`}>Editar datos</Link>
                    <Link to={`/patients/${patient.id}`}>Más detalles</Link>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Confirmación 1: llegó a cita */}
      <ConfirmModal
        open={confirmStep === 'attended'}
        title="Confirmación"
        message="¿Paciente llegó a cita?"
        yesText="Sí"
        noText="No"
        onYes={async () => {
          const ctx = pendingNextChange
          if (!ctx) return
          // registrar historial (asistencia sí)
          await createHistory(ctx.patientId, ctx.oldDate, true)
          // guardar nueva fecha
          await saveField(ctx.patientId, 'next_appointment_date', ctx.newDate)
          setConfirmStep(null)
          setPendingNextChange(null)
        }}
        onNo={async () => {
          const ctx = pendingNextChange
          if (!ctx) return
          // registrar historial (asistencia no)
          await createHistory(ctx.patientId, ctx.oldDate, false)
          // pasar a segunda pregunta
          setConfirmStep('newdate')
        }}
      />

      {/* Confirmación 2: ingresar nueva fecha */}
      <ConfirmModal
        open={confirmStep === 'newdate'}
        title="Confirmación"
        message="¿Ingresar nueva fecha?"
        yesText="Sí"
        noText="No"
        onYes={async () => {
          const ctx = pendingNextChange
          if (!ctx) return
          // guardar la fecha nueva elegida
          await saveField(ctx.patientId, 'next_appointment_date', ctx.newDate)
          setConfirmStep(null)
          setPendingNextChange(null)
        }}
        onNo={async () => {
          const ctx = pendingNextChange
          if (!ctx) return
          // fecha pendiente = null
          await saveField(ctx.patientId, 'next_appointment_date', null)
          // también limpiar el input local
          setEditing((prev) => ({
            ...prev,
            [`${ctx.patientId}-next_appointment_date`]: '',
          }))
          setConfirmStep(null)
          setPendingNextChange(null)
        }}
      />

      <NotesModal
        open={Boolean(modalPatient)}
        notes={modalNotes}
        onClose={() => setModalPatient(null)}
        onSave={async (value, persist) => {
          setModalNotes(value)
          if (persist && modalPatient) {
            await saveField(modalPatient.id, 'notes', value)
            setModalPatient(null)
          }
        }}
      />
    </section>
  )
}
