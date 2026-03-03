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
  const [saving, setSaving] = useState(false)

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

  const labels = {
    first_name: 'Nombre',
    last_name: 'Apellido',
    age: 'Edad',
    national_id: 'ID',
    address: 'Dirección',
    phone: 'Teléfono',
    email: 'Email',
  }

  const persist = async () => {
    setSaving(true)
    setMessage('')
    try {
      if (isEditing) {
        await api.patch(`/patients/${id}/`, form)
      } else {
        await api.post('/patients/', form)
      }
      return true
    } catch {
      setMessage(isEditing ? 'Error al actualizar paciente' : 'Error al crear paciente')
      return false
    } finally {
      setSaving(false)
    }
  }

  const onGuardar = async (e) => {
    e.preventDefault()
    const ok = await persist()
    if (ok) navigate('/') // o /pacientes según tu router
  }

  const onAgregarOtro = async () => {
    // Solo aplica al crear (no editar)
    const ok = await persist()
    if (ok) {
      setForm(initial)
      setMessage('Paciente creado. Puedes agregar otro.')
    }
  }

  return (
    <form onSubmit={onGuardar} className="patient-form">
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

      <div className="form-actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>

        {!isEditing && (
          <button type="button" className="btn-secondary" onClick={onAgregarOtro} disabled={saving}>
            Agregar otro
          </button>
        )}
      </div>

      <p>{message}</p>
    </form>
  )
}
