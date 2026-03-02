import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'

export default function PatientDetailPage() {
  const { id } = useParams()
  const [patient, setPatient] = useState(null)
  const [appointment, setAppointment] = useState({ date: '', status: 'arrived' })

  const fetchDetails = async () => {
    const { data } = await api.get(`/patients/${id}/`)
    setPatient(data)
  }

  useEffect(() => {
    fetchDetails()
  }, [id])

  if (!patient) return <p>Cargando...</p>

  return (
    <section>
      <h2>Ficha de {patient.first_name} {patient.last_name}</h2>
      <p>RUT/ID: {patient.national_id}</p>
      <p>Dirección: {patient.address}</p>
      <p>Celular: {patient.phone}</p>

      <h3>Historial de citas</h3>
      <ul>
        {patient.appointments.map((item) => (
          <li key={item.id}>{item.date} - {item.status}</li>
        ))}
      </ul>

      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await api.post(`/patients/${id}/appointments/`, appointment)
          setAppointment({ date: '', status: 'arrived' })
          fetchDetails()
        }}
      >
        <input type="date" value={appointment.date} onChange={(e) => setAppointment({ ...appointment, date: e.target.value })} required />
        <select value={appointment.status} onChange={(e) => setAppointment({ ...appointment, status: e.target.value })}>
          <option value="arrived">Llegó</option>
          <option value="not_arrived">No llegó</option>
          <option value="canceled">Canceló</option>
        </select>
        <button type="submit">Agregar cita</button>
      </form>

      <h3>Auditoría</h3>
      <ul>
        {patient.audit_logs.map((log) => (
          <li key={log.id}>{log.timestamp} - {log.field_name}: {log.old_value} → {log.new_value}</li>
        ))}
      </ul>
    </section>
  )
}
