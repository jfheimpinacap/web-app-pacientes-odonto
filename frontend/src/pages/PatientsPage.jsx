import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import NotesModal from '../components/NotesModal'

const columns = [
  { key: 'first_name', label: 'Nombre', sortable: true },
  { key: 'last_name', label: 'Apellido', sortable: true },
  { key: 'age', label: 'Edad' },
  { key: 'national_id', label: 'RUT/ID', sortable: true },
  { key: 'last_prophylactic_date', label: 'Último profiláctico' },
  { key: 'next_appointment_date', label: 'Siguiente cita' },
  { key: 'status', label: 'Estado', sortable: true },
]

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [ordering, setOrdering] = useState('first_name')
  const [editing, setEditing] = useState({})
  const [feedback, setFeedback] = useState({})
  const [modalPatient, setModalPatient] = useState(null)
  const [modalNotes, setModalNotes] = useState('')
  const [searchText, setSearchText] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')

  const fetchPatients = async () => {
    const { data } = await api.get('/patients', { params: { ordering } })
    setPatients(data)
  }

  useEffect(() => {
    fetchPatients()
  }, [ordering])

  const sortedIndicator = useMemo(() => ordering.replace('-', ''), [ordering])

  const visiblePatients = useMemo(() => {
    if (!submittedSearch.trim()) return patients
    const term = submittedSearch.trim().toLowerCase()
    return patients.filter((patient) => {
      const firstName = String(patient.first_name || '').toLowerCase()
      const lastName = String(patient.last_name || '').toLowerCase()
      const nationalId = String(patient.national_id || '').toLowerCase()
      return firstName.includes(term) || lastName.includes(term) || nationalId.includes(term)
    })
  }, [patients, submittedSearch])

  const saveField = async (id, field, value) => {
    setFeedback((prev) => ({ ...prev, [id]: 'Guardando...' }))
    try {
      const { data } = await api.patch(`/patients/${id}/`, { [field]: value })
      if (data.should_move_to_inactive && data.status === 'active') {
        const decision = window.confirm('¿Mover a inactivos?')
        if (decision) {
          await api.patch(`/patients/${id}/`, { status: 'inactive' })
        }
      }
      setFeedback((prev) => ({ ...prev, [id]: 'OK' }))
      fetchPatients()
    } catch {
      setFeedback((prev) => ({ ...prev, [id]: 'Error al guardar' }))
    }
  }

  return (
    <section>
      <h2>Pacientes</h2>
      <div className="search-bar">
        <input
          placeholder="Buscar por nombre, apellido o RUT"
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
            {columns.map((column) => (
              <th key={column.key} onClick={() => column.sortable && setOrdering(ordering === column.key ? `-${column.key}` : column.key)}>
                {column.label} {column.sortable && sortedIndicator === column.key ? '↕' : ''}
              </th>
            ))}
            <th>Nota</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {visiblePatients.map((patient) => (
            <tr key={patient.id}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.key === 'status' ? (
                    <select
                      value={editing[`${patient.id}-${column.key}`] ?? (patient[column.key] ?? 'active')}
                      onChange={(e) => {
                        const value = e.target.value
                        setEditing((prev) => ({
                          ...prev,
                          [`${patient.id}-${column.key}`]: value,
                        }))
                        saveField(patient.id, column.key, value)
                      }}
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  ) : (
                    <input
                      value={editing[`${patient.id}-${column.key}`] ?? (patient[column.key] ?? '')}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [`${patient.id}-${column.key}`]: e.target.value,
                        }))
                      }
                      onBlur={(e) => saveField(patient.id, column.key, e.target.value)}
                    />
                  )}
                </td>
              ))}
              <td>
                <button
                  onClick={() => {
                    setModalPatient(patient)
                    setModalNotes(patient.notes || '')
                  }}
                >
                  Abrir
                </button>
              </td>
              <td>{feedback[patient.id] || '-'}</td>
              <td>
                <div className="action-buttons">
                  <Link to={`/create/${patient.id}`}>Editar datos</Link>
                  <Link to={`/patients/${patient.id}`}>Más detalles</Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
