import api from '../api'

function downloadBlob(filename, blob) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

export default function ReportsTransferPage() {
  const exportFile = async (format) => {
    const res = await api.get(`/reports/export`, {
      params: { format },
      responseType: 'blob',
    })
    downloadBlob(`pacientes.${format}`, res.data)
  }

  return (
    <section>
      <h2>Informes · Traspaso de datos</h2>
      <p>Exportación de datos a Excel/CSV. (Filtros avanzados se agregan después.)</p>

      <div className="form-actions">
        <button type="button" onClick={() => exportFile('xlsx')}>Exportar XLSX</button>
        <button type="button" onClick={() => exportFile('csv')}>Exportar CSV</button>
      </div>
    </section>
  )
}