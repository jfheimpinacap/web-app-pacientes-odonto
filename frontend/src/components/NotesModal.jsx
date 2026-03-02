export default function NotesModal({ open, notes, onClose, onSave }) {
  if (!open) return null

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Notas del paciente</h3>
        <textarea value={notes} onChange={(e) => onSave(e.target.value, false)} rows={6} />
        <div className="modal-actions">
          <button onClick={() => onSave(notes, true)}>Guardar</button>
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
