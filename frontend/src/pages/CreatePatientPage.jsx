import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'

const initial = {
  first_name: '',
  last_name: '',
  age: '',
  national_id: '',
  address: '',
  phone: '',
  email: '',
}

export default function CreatePatientPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(id)
  const [form, setForm] = useState(initial)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadPatient = async () => {
      if (!isEditing) return
      try {
        const { data } = await api.get(`/patients/${id}/`)
        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          age: data.age || '',
          national_id: data.national_id || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
        })
      } catch {
        setMessage('No se pudo cargar el paciente')
      }
    }

    loadPatient()
  }, [id, isEditing])

  const submit = async (e) => {
    e.preventDefault()
    try {
      if (isEditing) {
        await api.patch(`/patients/${id}/`, form)
      } else {
        await api.post('/patients/', form)
      }
      navigate('/')
    } catch {
      setMessage(isEditing ? 'Error al actualizar paciente' : 'Error al crear paciente')
    }
  }

  const labels = {
    first_name: 'Nombre',
    last_name: 'Apellido',
    age: 'Edad',
    national_id: 'ID',
    address: 'Dirección',
    phone: 'Teléfono',
    email: 'Email',
  }

  return (
    <form onSubmit={submit} className="patient-form">
      <h2>{isEditing ? 'Editar paciente' : 'Crear paciente'}</h2>
      {Object.keys(initial).map((field) => (
        <label key={field} className="form-field">
          {labels[field]}
          <input
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            required={field !== 'email'}
          />
        </label>
      ))}
      <button type="submit">Guardar</button>
      <p>{message}</p>
    </form>
  )
}
