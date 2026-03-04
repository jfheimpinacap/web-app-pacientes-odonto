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
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          age: data.age ?? '',
          national_id: data.national_id ?? '',
          address: data.address ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
        })
      } catch (err) {
        console.error(err)
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

  const toPayload = () => {
    const ageNum = form.age === '' ? null : Number(form.age)

    return {
      first_name: String(form.first_name || '').trim(),
      last_name: String(form.last_name || '').trim(),
      age: Number.isFinite(ageNum) ? ageNum : null,
      national_id: String(form.national_id || '').trim(),
      address: String(form.address || '').trim(),
      phone: String(form.phone || '').trim(),
      // ✅ importante: si viene vacío, mandar null
      email: String(form.email || '').trim() || null,
    }
  }

  const formatBackendError = (err, fallback) => {
    const data = err?.response?.data
    if (!data) return fallback

    // DRF suele mandar {field: ["msg"]} o {detail: "..."}
    if (typeof data === 'string') return data
    if (data.detail) return String(data.detail)

    const parts = Object.entries(data).map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: ${v.join(', ')}`
      if (typeof v === 'object' && v !== null) return `${k}: ${JSON.stringify(v)}`
      return `${k}: ${String(v)}`
    })
    return parts.join(' | ')
  }

  const persist = async () => {
    setSaving(true)
    setMessage('')
    const payload = toPayload()

    try {
      if (isEditing) {
        await api.patch(`/patients/${id}/`, payload)
      } else {
        await api.post('/patients/', payload)
      }
      return true
    } catch (err) {
      console.error(err)
      setMessage(formatBackendError(err, isEditing ? 'Error al actualizar paciente' : 'Error al crear paciente'))
      return false
    } finally {
      setSaving(false)
    }
  }

  const onGuardar = async (e) => {
    e.preventDefault()
    const ok = await persist()
    if (ok) navigate('/') // o /pacientes según tus rutas
  }

  const onAgregarOtro = async () => {
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
            type={field === 'age' ? 'number' : field === 'email' ? 'email' : 'text'}
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
          <button type="button" onClick={onAgregarOtro} disabled={saving}>
            Agregar otro
          </button>
        )}
      </div>

      {message && <p>{message}</p>}
    </form>
  )
}
