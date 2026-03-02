# MVP - Control de Pacientes (Odontología)

Monorepo con backend Django + DRF y frontend Vite/React para gestión de pacientes, historial de citas, exportación e historial de auditoría por campo.

## Estructura

- `backend/`: API REST, modelos, auditoría, reportes CSV/XLSX, tests.
- `frontend/`: Aplicación React con menú lateral, tabla editable, modal de notas y ficha detalle.

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Endpoints

- `GET /api/patients?status=&ordering=`
- `POST /api/patients/`
- `PATCH /api/patients/{id}/`
- `GET /api/patients/{id}/`
- `GET /api/patients/{id}/appointments/`
- `POST /api/patients/{id}/appointments/`
- `GET /api/reports/export?format=csv|xlsx&status=`

### Tests mínimos

```bash
cd backend
python manage.py test patients.tests
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Config por defecto espera backend en `http://localhost:8000`.
