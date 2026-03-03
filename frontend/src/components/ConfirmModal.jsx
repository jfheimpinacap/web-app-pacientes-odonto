export default function ConfirmModal({ open, title, message, yesText='Sí', noText='No', onYes, onNo }) {
  if (!open) return null

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button type="button" onClick={onNo}>{noText}</button>
          <button type="button" onClick={onYes}>{yesText}</button>
        </div>
      </div>
    </div>
  )
}