import { useState } from 'react'
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
  const [form, setForm] = useState(initial)
  const [message, setMessage] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/patients/', form)
      setMessage('Paciente creado')
      setForm(initial)
    } catch {
      setMessage('Error al crear paciente')
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Crear paciente</h2>
      {Object.keys(initial).map((field) => (
        <label key={field}>
          {field}
          <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} required={field !== 'email'} />
        </label>
      ))}
      <button type="submit">Guardar</button>
      <p>{message}</p>
    </form>
  )
}
