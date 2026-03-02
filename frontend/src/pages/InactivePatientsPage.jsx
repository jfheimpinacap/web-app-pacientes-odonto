import { useEffect, useState } from 'react'
import api from '../api'

export default function InactivePatientsPage() {
  const [patients, setPatients] = useState([])

  useEffect(() => {
    api.get('/patients', { params: { status: 'inactive' } }).then((res) => setPatients(res.data))
  }, [])

  return (
    <section>
      <h2>Pacientes inactivos</h2>
      <ul>
        {patients.map((patient) => (
          <li key={patient.id}>{patient.first_name} {patient.last_name} - {patient.national_id}</li>
        ))}
      </ul>
    </section>
  )
}
