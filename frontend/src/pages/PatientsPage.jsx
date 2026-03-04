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

// ✅ lunes como inicio de semana
function startOfWeekMonday(dateObj) {
  const d = toDateOnly(dateObj)
  const day = d.getDay() // 0=domingo ... 6=sábado
  const diffToMonday = (day + 6) % 7 // lunes=0, martes=1, ... domingo=6
  d.setDate(d.getDate() - diffToMonday)
  return d
}

function isCompleteISODate(v) {
  return v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v)
}

const REASONS = [
  { value: 'patient_change', label: 'Paciente modifica fecha de cita' },
  { value: 'doctor_change', label: 'Doctor modifica fecha de cita' },
  { value: 'patient_cancel', label: 'Paciente cancela' },
]

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [ordering, setOrdering] = useState('first_name')
  const [editing, setEditing] = useState({})
  const [modalPatient, setModalPatient] = useState(null)
  const [modalNotes, setModalNotes] = useState('')
  const [searchText, setSearchText] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')

  // ✅ por defecto SOLO activos
  const [statusView, setStatusView] = useState('active') // active | inactive

  // ---- búsqueda avanzada ----
  const [advMode, setAdvMode] = useState('none')
  const [rangeFrom, setRangeFrom] = useState('')
  const [rangeTo, setRangeTo] = useState('')

  // ---- Modal motivo de cambio (único modal del flujo) ----
  const [reasonOpen, setReasonOpen] = useState(false)
  const [reason, setReason] = useState('patient_change')
  const [pending, setPending] = useState(null)
  // pending = { patientId, oldDate, newDate, oldStatus }

  const fetchPatients = async () => {
    const params = { ordering, status: statusView }
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
    setStatusView((prev) => (prev === 'inactive' ? 'active' : 'inactive'))
  }

  const patchPatient = async (id, payload) => {
    const { data } = await api.patch(`/patients/${id}/`, payload)
    return data
  }

  const createHistory = async (patientId, dateStr, status, reasonValue) => {
    if (!dateStr) return
    try {
      await api.post(`/patients/${patientId}/appointments/`, {
        date: dateStr,
        status,
        reason: reasonValue,
      })
    } catch (e) {
      console.error(e)
    }
  }

  const runSearch = () => setSubmittedSearch(searchText)

  // -------- filtros ----------
  const filteredPatients = useMemo(() => {
    let list = patients.filter((p) =>
      statusView === 'inactive' ? p.status === 'inactive' : p.status === 'active'
    )

    const term = submittedSearch.trim().toLowerCase()
    if (term) {
      list = list.filter((p) => {
        const first = String(p.first_name || '').toLowerCase()
        const last = String(p.last_name || '').toLowerCase()
        const nid = String(p.national_id || '').toLowerCase()
        return first.includes(term) || last.includes(term) || nid.includes(term)
      })
    }

    const today = toDateOnly(new Date())
    const nextDateOf = (p) => parseISODate(p.next_appointment_date)

    // ✅ Próxima semana = lunes..domingo de la semana siguiente
    if (advMode === 'next_week') {
      const startThisWeek = startOfWeekMonday(today)
      const startNextWeek = toDateOnly(new Date(startThisWeek))
      startNextWeek.setDate(startNextWeek.getDate() + 7)

      const endNextWeek = toDateOnly(new Date(startNextWeek))
      endNextWeek.setDate(endNextWeek.getDate() + 6)

      list = list.filter((p) => {
        const dt = nextDateOf(p)
        if (!dt) return false
        return dt >= startNextWeek && dt <= endNextWeek
      })
    }

    // ✅ Próximo mes = todo el mes calendario siguiente
    if (advMode === 'next_month') {
      const y = today.getFullYear()
      const m = today.getMonth() // 0-index
      const startNextMonth = new Date(y, m + 1, 1)
      startNextMonth.setHours(0, 0, 0, 0)

      const endNextMonth = new Date(y, m + 2, 0) // último día del próximo mes
      endNextMonth.setHours(0, 0, 0, 0)

      list = list.filter((p) => {
        const dt = nextDateOf(p)
        if (!dt) return false
        return dt >= startNextMonth && dt <= endNextMonth
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
  }, [patients, submittedSearch, advMode, rangeFrom, rangeTo, statusView])

  const isOverdue = (patient) => {
    const today = toDateOnly(new Date())
    const dt = parseISODate(patient.next_appointment_date)
    return dt ? dt < today : false
  }

  const showOverdueHighlight = advMode === 'this_month' || advMode === 'overdue'

  const previewText = (txt) => {
    const t = String(txt || '').replace(/\s+/g, ' ').trim()
    if (!t) return '—'
    return t
  }

  const startNextChangeFlow = (patient, newDate) => {
    if (reasonOpen) return
    if (!isCompleteISODate(newDate)) return

    const oldDate = patient.next_appointment_date ?? ''
    if (newDate === oldDate) return

    setReason(newDate === '' ? 'patient_cancel' : 'patient_change')

    setPending({
      patientId: patient.id,
      oldDate,
      newDate,
      oldStatus: patient.status,
    })

    setReasonOpen(true)
  }

  const cancelReasonFlow = () => {
    if (pending) {
      setEditing((prev) => ({
        ...prev,
        [`${pending.patientId}-next_appointment_date`]: pending.oldDate || '',
      }))
    }
    setPending(null)
    setReasonOpen(false)
  }

  const applyReasonFlow = async () => {
    const ctx = pending
    if (!ctx) return

    try {
      const hasOld = Boolean(ctx.oldDate)

      if (reason === 'patient_cancel') {
        if (hasOld) await createHistory(ctx.patientId, ctx.oldDate, 'canceled', reason)
        await patchPatient(ctx.patientId, { next_appointment_date: null })
        setEditing((prev) => ({ ...prev, [`${ctx.patientId}-next_appointment_date`]: '' }))
      } else {
        if (hasOld) await createHistory(ctx.patientId, ctx.oldDate, 'not_arrived', reason)

        const payload = { next_appointment_date: ctx.newDate ? ctx.newDate : null }
        if (ctx.oldStatus === 'inactive' && ctx.newDate) payload.status = 'active'
        await patchPatient(ctx.patientId, payload)
      }

      setReasonOpen(false)
      setPending(null)
      fetchPatients()
    } catch (e) {
      console.error(e)
      setReasonOpen(false)
      setPending(null)
    }
  }

  const ReasonModal = ({ open }) => {
    if (!open) return null
    return (
      <div className="modal-backdrop">
        <div className="modal">
          <h3 style={{ marginTop: 0 }}>Motivo de cambio de fecha</h3>

          <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%' }}>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <div className="modal-actions" style={{ marginTop: '.75rem' }}>
            <button type="button" onClick={cancelReasonFlow}>Cancelar</button>
            <button type="button" onClick={applyReasonFlow}>Guardar</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section>
     {/* <h3>Pacientes {statusView === 'inactive' ? '(Inactivos)' : ''}</h3> */}

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
        <button type="button" onClick={runSearch}>Buscar</button>
        <button type="button" onClick={toggleStatusView}>
          {statusView === 'inactive' ? 'Ver activos' : 'Ver inactivos'}
        </button>
      </div>

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

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleOrdering('first_name')}>Nombre {sortedIndicator === 'first_name' ? '↕' : ''}</th>
              <th onClick={() => toggleOrdering('last_name')}>Apellido {sortedIndicator === 'last_name' ? '↕' : ''}</th>
              <th className="table-center">Edad</th>
              <th onClick={() => toggleOrdering('national_id')}>RUT/ID {sortedIndicator === 'national_id' ? '↕' : ''}</th>
              <th onClick={() => toggleOrdering('status')} className="table-center">Estado {sortedIndicator === 'status' ? '↕' : ''}</th>
              <th className="table-center">Último profiláctico</th>
              <th className="table-center">Siguiente cita</th>
              <th className="table-center notes-col">Notas</th>
              <th className="table-center actions-col">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {filteredPatients.map((patient) => {
              const nextDateValue =
                editing[`${patient.id}-next_appointment_date`] ?? (patient.next_appointment_date ?? '')

              const notesPreview = previewText(patient.notes)

              return (
                <tr key={patient.id} className={showOverdueHighlight && isOverdue(patient) ? 'row-overdue' : ''}>
                  <td>{patient.first_name}</td>
                  <td>{patient.last_name}</td>
                  <td className="table-center">{patient.age ?? ''}</td>
                  <td>{patient.national_id}</td>

                  <td className="table-center">
                    <select
                      value={editing[`${patient.id}-status`] ?? (patient.status ?? 'active')}
                      onChange={(e) => {
                        const value = e.target.value
                        setEditing((prev) => ({ ...prev, [`${patient.id}-status`]: value }))
                        patchPatient(patient.id, { status: value }).then(fetchPatients)
                      }}
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </td>

                  <td className="table-center">
                    <input
                      type="date"
                      value={editing[`${patient.id}-last_prophylactic_date`] ?? (patient.last_prophylactic_date ?? '')}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [`${patient.id}-last_prophylactic_date`]: e.target.value,
                        }))
                      }
                      onBlur={(e) => patchPatient(patient.id, { last_prophylactic_date: e.target.value || null }).then(fetchPatients)}
                    />
                  </td>

                  <td className="table-center">
                    <input
                      type="date"
                      value={nextDateValue}
                      onChange={(e) => {
                        const v = e.target.value
                        setEditing((prev) => ({ ...prev, [`${patient.id}-next_appointment_date`]: v }))
                        startNextChangeFlow(patient, v)
                      }}
                    />
                    {(!nextDateValue || nextDateValue === '') && (
                      <div style={{ fontSize: 12, opacity: 0.8 }}>Fecha pendiente</div>
                    )}
                  </td>

                  <td className="notes-col">
                    <div className="note-cell">
                      <span className="note-preview">{notesPreview}</span>
                      <button
                        type="button"
                        className="btn-small"
                        onClick={() => {
                          setModalPatient(patient)
                          setModalNotes(patient.notes || '')
                        }}
                      >
                        Ver
                      </button>
                    </div>
                  </td>

                  <td className="table-center actions-col">
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
      </div>

      <ReasonModal open={reasonOpen} />

      <NotesModal
        open={Boolean(modalPatient)}
        notes={modalNotes}
        onClose={() => setModalPatient(null)}
        onSave={async (value, persist) => {
          setModalNotes(value)
          if (persist && modalPatient) {
            await patchPatient(modalPatient.id, { notes: value })
            setModalPatient(null)
            fetchPatients()
          }
        }}
      />
    </section>
  )
}
