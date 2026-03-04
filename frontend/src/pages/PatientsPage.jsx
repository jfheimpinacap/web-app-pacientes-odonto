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

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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

  // ---- Flujo cambio “Siguiente cita” ----
  // step: null | 'reason' | 'attended' | 'newdate'
  const [step, setStep] = useState(null)
  const [pending, setPending] = useState(null)
  // pending = { patientId, oldDate, newDate, oldStatus }
  const [reason, setReason] = useState('patient_change')

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

  const saveField = async (id, field, value) => {
    try {
      const payload = { [field]: value === '' ? null : value }
      const data = await patchPatient(id, payload)

      if (data.should_move_to_inactive && data.status === 'active') {
        const decision = window.confirm('¿Mover a inactivos?')
        if (decision) await patchPatient(id, { status: 'inactive' })
      }

      setEditing((prev) => {
        const copy = { ...prev }
        delete copy[`${id}-${field}`]
        return copy
      })

      fetchPatients()
    } catch {}
  }

  // ✅ historial con motivo (requiere backend con Appointment.reason)
  const createHistory = async (patientId, dateStr, status, reasonValue) => {
    if (!dateStr) return
    try {
      await api.post(`/patients/${patientId}/appointments/`, {
        date: dateStr,
        status,         // arrived | not_arrived | canceled
        reason: reasonValue, // patient_change | doctor_change | patient_cancel
      })
    } catch (e) {
      // si tu backend aún no tiene "reason", esto dará 400.
      // En ese caso, comenta la línea reason o implementa el cambio backend del punto 2.
      console.error(e)
    }
  }

  const runSearch = () => setSubmittedSearch(searchText)

  // -------- filtros ----------
  const filteredPatients = useMemo(() => {
    let list = patients

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

  const previewText = (txt) => {
    const t = String(txt || '').replace(/\s+/g, ' ').trim()
    if (!t) return '—'
    return t
  }

  // ✅ Disparar flujo INMEDIATO al elegir/borrar fecha
  const startNextChangeFlow = (patient, newDate) => {
    if (step) return // ya hay un flujo abierto
    if (!isCompleteISODate(newDate)) return

    const oldDate = patient.next_appointment_date ?? ''
    if (newDate === oldDate) return

    setReason('patient_change')
    setPending({
      patientId: patient.id,
      oldDate,
      newDate,
      oldStatus: patient.status, // 'active' | 'inactive'
    })
    setStep('reason')
  }

  // ✅ aplicar cambio según el flujo
  const applyChange = async ({ attended }) => {
    const ctx = pending
    if (!ctx) return

    const logDate = ctx.oldDate || todayISO() // si no hay oldDate, dejamos hoy como referencia

    // 1) si motivo es cancelación: fecha queda vacía
    if (reason === 'patient_cancel') {
      await createHistory(ctx.patientId, logDate, 'canceled', reason)
      await patchPatient(ctx.patientId, { next_appointment_date: null })
      // NO reactivar si cancela
      setEditing((prev) => ({ ...prev, [`${ctx.patientId}-next_appointment_date`]: '' }))
      setStep(null)
      setPending(null)
      fetchPatients()
      return
    }

    // 2) Reprogramación / cambio: registrar historial con arrived/not_arrived
    await createHistory(ctx.patientId, logDate, attended ? 'arrived' : 'not_arrived', reason)

    // 3) Si asistió: último profiláctico = hoy
    const payload = {}
    if (attended) payload.last_prophylactic_date = todayISO()

    // 4) Si el usuario dejó la fecha vacía, queda pendiente
    payload.next_appointment_date = ctx.newDate ? ctx.newDate : null

    // 5) Si estaba inactivo y se asigna una fecha nueva (no cancel), reactivar
    if (ctx.oldStatus === 'inactive' && ctx.newDate) {
      payload.status = 'active'
    }

    await patchPatient(ctx.patientId, payload)

    setStep(null)
    setPending(null)
    fetchPatients()
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
            <button
              type="button"
              onClick={() => {
                // cancelar = volver al valor anterior en UI
                if (pending) {
                  setEditing((prev) => ({ ...prev, [`${pending.patientId}-next_appointment_date`]: pending.oldDate || '' }))
                }
                setStep(null)
                setPending(null)
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => {
                // si cancela, aplicamos directo (sin preguntar asistencia)
                if (reason === 'patient_cancel') {
                  applyChange({ attended: false })
                } else {
                  setStep('attended')
                }
              }}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    )
  }

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
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th onClick={() => toggleOrdering('first_name')}>
                Nombre {sortedIndicator === 'first_name' ? '↕' : ''}
              </th>
              <th onClick={() => toggleOrdering('last_name')}>
                Apellido {sortedIndicator === 'last_name' ? '↕' : ''}
              </th>

              <th className="table-center">Edad</th>

              <th onClick={() => toggleOrdering('national_id')}>
                RUT/ID {sortedIndicator === 'national_id' ? '↕' : ''}
              </th>

              <th onClick={() => toggleOrdering('status')} className="table-center">
                Estado {sortedIndicator === 'status' ? '↕' : ''}
              </th>

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
                <tr
                  key={patient.id}
                  className={showOverdueHighlight && isOverdue(patient) ? 'row-overdue' : ''}
                >
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
                        saveField(patient.id, 'status', value)
                      }}
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </td>

                  <td className="table-center">
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

                  {/* ✅ Cambiado: flujo se dispara en onChange */}
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

      {/* Paso 1: Motivo */}
      <ReasonModal open={step === 'reason'} />

      {/* Paso 2: Asistencia */}
      <ConfirmModal
        open={step === 'attended'}
        title="Confirmación"
        message="¿Paciente llegó a cita?"
        yesText="Sí"
        noText="No"
        onYes={async () => {
          await applyChange({ attended: true })
        }}
        onNo={async () => {
          setStep('newdate')
        }}
      />

      {/* Paso 3: ¿Ingresar nueva fecha? (solo si NO llegó) */}
      <ConfirmModal
        open={step === 'newdate'}
        title="Confirmación"
        message="¿Ingresar nueva fecha?"
        yesText="Sí"
        noText="No"
        onYes={async () => {
          await applyChange({ attended: false })
        }}
        onNo={async () => {
          // dejar pendiente
          if (pending) {
            await patchPatient(pending.patientId, { next_appointment_date: null })
            setEditing((prev) => ({ ...prev, [`${pending.patientId}-next_appointment_date`]: '' }))
          }
          setStep(null)
          setPending(null)
          fetchPatients()
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
