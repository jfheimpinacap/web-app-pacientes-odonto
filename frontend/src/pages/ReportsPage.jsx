export default function ReportsPage() {
  return (
    <section>
      <h2>Informes</h2>
      <a href="http://localhost:8000/api/reports/export?format=csv" target="_blank">Exportar CSV</a>
      <br />
      <a href="http://localhost:8000/api/reports/export?format=xlsx" target="_blank">Exportar XLSX</a>
    </section>
  )
}
