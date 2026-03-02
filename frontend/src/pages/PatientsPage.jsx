import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import NotesModal from '../components/NotesModal'

const columns = [
  { key: 'first_name', label: 'Nombre', sortable: true },
  { key: 'last_name', label: 'Apellido', sortable: true },
  { key: 'age', label: 'Edad' },
  { key: 'national_id', label: 'RUT/ID', sortable: true },
  { key: 'status', label: 'Estado', sortable: true },
  { key: 'last_prophylactic_date', label: 'Último profiláctico' },
  { key: 'next_appointment_date', label: 'Siguiente cita' },
]

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [ordering, setOrdering] = useState('first_name')
  const [editing, setEditing] = useState({})
  const [feedback, setFeedback] = useState({})
  const [modalPatient, setModalPatient] = useState(null)
  const [modalNotes, setModalNotes] = useState('')

  const fetchPatients = async () => {
    const { data } = await api.get('/patients', { params: { ordering } })
    setPatients(data)
  }

  useEffect(() => {
    fetchPatients()
  }, [ordering])

  const sortedIndicator = useMemo(() => ordering.replace('-', ''), [ordering])

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
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} onClick={() => column.sortable && setOrdering(ordering === column.key ? `-${column.key}` : column.key)}>
                {column.label} {column.sortable && sortedIndicator === column.key ? '↕' : ''}
              </th>
            ))}
            <th>Notas</th>
            <th>Acciones</th>
            <th>Estado guardado</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id}>
              {columns.map((column) => (
                <td key={column.key}>
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
              <td>
                <Link to={`/patients/${patient.id}`}>Más detalles</Link>
              </td>
              <td>{feedback[patient.id] || '-'}</td>
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
