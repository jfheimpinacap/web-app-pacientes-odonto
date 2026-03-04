import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'

const STATUS_LABELS = {
  arrived: 'Sí',
  not_arrived: 'No',
  canceled: 'Canceló',
}

const REASON_LABELS = {
  patient_change: 'Paciente modifica fecha de cita',
  doctor_change: 'Doctor modifica fecha de cita',
  patient_cancel: 'Paciente cancela',
}

export default function PatientDetailPage() {
  const { id } = useParams()
  const [patient, setPatient] = useState(null)
  const [appointment, setAppointment] = useState({
    date: '',
    status: 'arrived',
    reason: 'patient_change',
  })

  const fetchDetails = async () => {
    const { data } = await api.get(`/patients/${id}/`)
    setPatient(data)
  }

  useEffect(() => {
    fetchDetails()
  }, [id])

  const sortedAppointments = useMemo(() => {
    if (!patient?.appointments) return []
    // viene ordenado por backend, pero por seguridad:
    return [...patient.appointments].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  }, [patient])

  if (!patient) return <p>Cargando...</p>

  return (
    <section>
      <h2>Ficha de {patient.first_name} {patient.last_name}</h2>
      <p><strong>RUT/ID:</strong> {patient.national_id}</p>
      <p><strong>Dirección:</strong> {patient.address}</p>
      <p><strong>Celular:</strong> {patient.phone}</p>
      {patient.email && <p><strong>Email:</strong> {patient.email}</p>}
      <p><strong>Estado:</strong> {patient.status === 'inactive' ? 'Inactivo' : 'Activo'}</p>

      <h3>Historial de citas</h3>

      {sortedAppointments.length === 0 ? (
        <p>No hay citas registradas.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Asistencia</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {sortedAppointments.map((item) => (
              <tr key={item.id}>
                <td>{item.date}</td>
                <td>{STATUS_LABELS[item.status] ?? item.status}</td>
                <td>{REASON_LABELS[item.reason] ?? (item.reason || '—')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3>Agregar cita (manual)</h3>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await api.post(`/patients/${id}/appointments/`, appointment)
          setAppointment({ date: '', status: 'arrived', reason: 'patient_change' })
          fetchDetails()
        }}
        style={{ marginTop: '.75rem' }}
      >
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="date"
            value={appointment.date}
            onChange={(e) => setAppointment({ ...appointment, date: e.target.value })}
            required
          />

          <select
            value={appointment.status}
            onChange={(e) => setAppointment({ ...appointment, status: e.target.value })}
          >
            <option value="arrived">Llegó</option>
            <option value="not_arrived">No llegó</option>
            <option value="canceled">Canceló</option>
          </select>

          <select
            value={appointment.reason}
            onChange={(e) => setAppointment({ ...appointment, reason: e.target.value })}
          >
            <option value="patient_change">Paciente modifica fecha de cita</option>
            <option value="doctor_change">Doctor modifica fecha de cita</option>
            <option value="patient_cancel">Paciente cancela</option>
          </select>

          <button type="submit">Agregar</button>
        </div>
      </form>

      <h3>Auditoría</h3>
      {patient.audit_logs?.length ? (
        <ul>
          {patient.audit_logs.map((log) => (
            <li key={log.id}>
              {log.timestamp} - {log.field_name}: {log.old_value} → {log.new_value}
            </li>
          ))}
        </ul>
      ) : (
        <p>Sin registros de auditoría.</p>
      )}
    </section>
  )
}
