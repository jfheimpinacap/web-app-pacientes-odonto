export default function NotesModal({ open, title = 'Notas del paciente', notes, onClose, onSave }) {
  if (!open) return null

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3 style={{ marginTop: 0 }}>{title}</h3>

        <textarea
          value={notes}
          onChange={(e) => onSave(e.target.value, false)}
          placeholder="Escribe aquí..."
        />

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cerrar</button>
          <button type="button" onClick={() => onSave(notes, true)}>Guardar</button>
        </div>
      </div>
    </div>
  )
}