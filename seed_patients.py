#!/usr/bin/env python3
"""
seed_patients.py
Crea pacientes de prueba en Django (backend/) para testear filtros y UI.

NOVEDADES:
- Crea 2 a 5 citas históricas por paciente.
- Opción de borrado:
  0) No borrar
  1) Borrar solo datos de prueba (national_id empieza con 'TEST-')
  2) BORRAR TODO (Patients + Appointments + AuditLogs)

Notas:
- "Fecha pendiente" se guarda como next_appointment_date = NULL.
- last_prophylactic_date: para activos, no más de 6 meses antes de la siguiente cita.
"""

import os
import re
import sys
import random
import string
from pathlib import Path
from datetime import date, timedelta


ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
MANAGE_PY = BACKEND_DIR / "manage.py"

# Fecha base para pruebas (según tu requerimiento)
TODAY = date(2026, 3, 3)  # marzo 2026

# Rangos solicitados
CURRENT_MONTH_YEAR = 2026
CURRENT_MONTH = 3  # marzo
NEXT_MONTH_YEAR = 2026
NEXT_MONTH = 4  # abril

EXPIRED_START = TODAY - timedelta(days=365)   # últimos 12 meses
EXPIRED_END = date(2026, 2, 28)              # fin de febrero 2026

INACTIVE_START = date(2020, 1, 1)
INACTIVE_END = date(2023, 12, 31)


FIRST_NAMES = [
    "Franz", "Matías", "Benjamín", "Ignacio", "Tomás", "Vicente", "Joaquín", "Diego", "Nicolás",
    "Sofía", "Valentina", "Martina", "Catalina", "Isidora", "Antonia", "Fernanda", "Camila",
    "Daniela", "Paula", "José", "Pedro", "Juan", "Luis", "Felipe", "Andrés", "Sebastián"
]
LAST_NAMES = [
    "González", "Muñoz", "Rojas", "Díaz", "Pérez", "Soto", "Contreras", "Silva", "Martínez",
    "Sepúlveda", "Morales", "Rodríguez", "López", "Fuentes", "Hernández", "Torres", "Araya"
]
STREETS = [
    "Av. Providencia", "Av. Vicuña Mackenna", "Av. Las Condes", "Av. Grecia", "Av. Matta",
    "Calle San Martín", "Calle Ahumada", "Calle Bandera", "Calle Huérfanos", "Calle Moneda"
]


def read_settings_module_from_manage_py() -> str:
    if not MANAGE_PY.exists():
        raise SystemExit(f"❌ No existe {MANAGE_PY}. Ejecuta este script en la raíz del repo (donde está start.py).")

    text = MANAGE_PY.read_text(encoding="utf-8", errors="ignore")
    m = re.search(r"setdefault\(\s*['\"]DJANGO_SETTINGS_MODULE['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*\)", text)
    if not m:
        raise SystemExit("❌ No pude detectar DJANGO_SETTINGS_MODULE desde backend/manage.py")
    return m.group(1)


def setup_django():
    settings_module = read_settings_module_from_manage_py()

    sys.path.insert(0, str(BACKEND_DIR))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", settings_module)

    import django  # noqa
    django.setup()

    try:
        from patients.models import Patient, Appointment, AuditLog  # noqa
    except Exception as e:
        raise SystemExit(
            "❌ No pude importar patients.models.Patient/Appointment/AuditLog.\n"
            "   Asegúrate de que tu app se llame 'patients'.\n"
            f"   Error: {e}"
        )

    return Patient, Appointment, AuditLog


def ask_int(prompt: str, min_v: int, max_v: int) -> int:
    while True:
        raw = input(prompt).strip()
        try:
            v = int(raw)
            if v < min_v or v > max_v:
                print(f"⚠️ Debe ser un número entre {min_v} y {max_v}.")
                continue
            return v
        except ValueError:
            print("⚠️ Ingresa un número válido.")


def ask_choice(prompt: str, choices: list[int]) -> int:
    choices_set = set(choices)
    while True:
        raw = input(prompt).strip()
        try:
            v = int(raw)
            if v not in choices_set:
                print(f"⚠️ Opción inválida. Usa: {choices}")
                continue
            return v
        except ValueError:
            print("⚠️ Ingresa un número válido.")


def confirm_phrase(prompt: str, phrase: str) -> bool:
    raw = input(f"{prompt}\nEscribe exactamente '{phrase}' para confirmar: ").strip()
    return raw == phrase


def rand_date(start: date, end: date) -> date:
    if end < start:
        start, end = end, start
    days = (end - start).days
    return start + timedelta(days=random.randint(0, days))


def month_range(year: int, month: int) -> tuple[date, date]:
    first = date(year, month, 1)
    if month == 12:
        last = date(year, 12, 31)
    else:
        last = date(year, month + 1, 1) - timedelta(days=1)
    return first, last


def make_unique_national_id(existing: set[str], i: int) -> str:
    suffix = "".join(random.choices(string.ascii_uppercase, k=2))
    nid = f"TEST-{TODAY.strftime('%Y%m')}-{i:04d}-{suffix}"
    while nid in existing:
        suffix = "".join(random.choices(string.ascii_uppercase, k=2))
        nid = f"TEST-{TODAY.strftime('%Y%m')}-{i:04d}-{suffix}"
    existing.add(nid)
    return nid


def build_patient_payload(i: int, category: str, existing_ids: set[str]) -> dict:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    age = random.randint(18, 85)
    nid = make_unique_national_id(existing_ids, i)
    address = f"{random.choice(STREETS)} #{random.randint(10, 9999)}"
    phone = f"+56 9 {random.randint(10000000, 99999999)}"
    email = None if random.random() < 0.35 else f"{first.lower()}.{last.lower()}{random.randint(1,99)}@mail.com"

    payload = {
        "first_name": first,
        "last_name": last,
        "age": age,
        "national_id": nid,
        "address": address,
        "phone": phone,
        "email": email,
        "notes": "",
    }

    if category == "inactive":
        payload["status"] = "inactive"
        payload["next_appointment_date"] = None
        payload["last_prophylactic_date"] = rand_date(INACTIVE_START, INACTIVE_END)
    else:
        payload["status"] = "active"

    return payload


def make_next_date_for_category(category: str) -> date | None:
    if category == "expired":
        return rand_date(EXPIRED_START, EXPIRED_END)

    if category == "current_month":
        start, end = month_range(CURRENT_MONTH_YEAR, CURRENT_MONTH)
        return rand_date(start, end)

    if category == "next_month":
        start, end = month_range(NEXT_MONTH_YEAR, NEXT_MONTH)
        return rand_date(start, end)

    if category == "inactive":
        return None

    # otros: futuro mayo-dic 2026
    start = date(2026, 5, 1)
    end = date(2026, 12, 31)
    return rand_date(start, end)


def make_last_prophylactic_for_active(next_date: date | None) -> date:
    if not next_date:
        return rand_date(TODAY - timedelta(days=180), TODAY)

    start = next_date - timedelta(days=180)
    end = next_date
    return rand_date(start, end)


def pick_status(weights=None) -> str:
    if weights is None:
        weights = {"arrived": 70, "not_arrived": 25, "canceled": 5}
    items = list(weights.items())
    statuses = [k for k, _ in items]
    w = [v for _, v in items]
    return random.choices(statuses, weights=w, k=1)[0]


def create_appointments_histories(Appointment, patient, category: str, next_date: date | None):
    """
    Crea 2 a 5 citas históricas por paciente.

    Regla general:
    - inactive: todas entre 2020-2023
    - expired: incluye una cita en next_date (pasada) + otras anteriores
    - current_month/next_month/other: crea 1-2 citas previas antes de next_date (y alguna reciente)
    """
    n = random.randint(2, 5)

    if category == "inactive":
        for _ in range(n):
            dt = rand_date(INACTIVE_START, INACTIVE_END)
            Appointment.objects.create(patient=patient, date=dt, status=pick_status())
        return

    # Para categorías activas:
    dates = []

    if category == "expired" and next_date:
        # la "cita vencida" principal
        dates.append(next_date)

        # el resto: más antiguas (pero dentro del último año o un poco más)
        for _ in range(n - 1):
            # 30 a 330 días antes de next_date
            back = random.randint(30, 330)
            dt = next_date - timedelta(days=back)
            # acotar por si se fue demasiado atrás
            if dt < (TODAY - timedelta(days=500)):
                dt = rand_date(TODAY - timedelta(days=500), TODAY - timedelta(days=30))
            dates.append(dt)

        # statuses más mezclados para vencidos
        for dt in dates:
            status = pick_status({"arrived": 45, "not_arrived": 45, "canceled": 10})
            Appointment.objects.create(patient=patient, date=dt, status=status)
        return

    # current_month / next_month / other
    if next_date:
        # 1) una cita relativamente reciente (para historial)
        recent_dt = TODAY - timedelta(days=random.randint(20, 200))
        if recent_dt >= next_date:
            recent_dt = next_date - timedelta(days=random.randint(10, 60))
        dates.append(recent_dt)

        # 2) citas anteriores entre 60 y 900 días antes (historial más largo)
        for _ in range(n - 1):
            back = random.randint(60, 900)
            dt = next_date - timedelta(days=back)
            # No dejarlo antes del 2020 (por realismo)
            if dt < date(2020, 1, 1):
                dt = rand_date(date(2020, 1, 1), TODAY - timedelta(days=60))
            dates.append(dt)

        # ordenar ascendente para consistencia (opcional)
        dates = sorted(set(dates))

        for dt in dates[:n]:
            Appointment.objects.create(patient=patient, date=dt, status=pick_status())
        return

    # si no hay next_date (no debería pasar en activos, pero por seguridad)
    for _ in range(n):
        dt = rand_date(TODAY - timedelta(days=365), TODAY - timedelta(days=10))
        Appointment.objects.create(patient=patient, date=dt, status=pick_status())


def main():
    random.seed()

    Patient, Appointment, AuditLog = setup_django()

    print("🦷 Seed de pacientes (Django) — Datos de prueba")
    print(f"📅 Fecha base de pruebas: {TODAY.isoformat()} (Marzo 2026)")
    print()

    # --- opción borrado ---
    print("Opciones de borrado:")
    print("  0) No borrar nada")
    print("  1) Borrar solo pacientes de prueba (national_id empieza con 'TEST-')")
    print("  2) BORRAR TODO (Patients + Appointments + AuditLogs) ⚠️")
    wipe_mode = ask_choice("Elige opción (0/1/2): ", [0, 1, 2])

    if wipe_mode == 1:
        deleted = Patient.objects.filter(national_id__startswith="TEST-").delete()
        print(f"🧹 Eliminados (solo TEST-*): {deleted[0]} registros (incluye cascadas).")

    elif wipe_mode == 2:
        ok = confirm_phrase(
            "⚠️ VAS A BORRAR TODO EL DATASET del sistema (pacientes, citas, auditoría).",
            "BORRAR TODO"
        )
        if not ok:
            print("✅ Cancelado. No se borró nada.")
        else:
            # borrar en orden "seguro"
            a = Appointment.objects.all().delete()[0]
            l = AuditLog.objects.all().delete()[0]
            p = Patient.objects.all().delete()[0]
            print(f"🧹 BORRADO TOTAL: Appointments={a}, AuditLogs={l}, Patients={p}")

    print()

    total = ask_int("¿Cuántos pacientes quieres crear? (1 a 50): ", 1, 50)

    while True:
        expired = ask_int("¿Cuántos con cita vencida (últimos 12 meses)? (0 a 50): ", 0, 50)
        current_month = ask_int("¿Cuántos con cita en el mes en curso (Marzo 2026)? (0 a 50): ", 0, 50)
        next_month = ask_int("¿Cuántos con cita en el próximo mes (Abril 2026)? (0 a 50): ", 0, 50)
        inactive = ask_int("¿Cuántos pacientes INACTIVOS? (0 a 50): ", 0, 50)

        s = expired + current_month + next_month + inactive
        if s > total:
            print(f"⚠️ La suma ({s}) supera el total ({total}). Intenta de nuevo.\n")
            continue
        break

    leftovers = total - (expired + current_month + next_month + inactive)

    # Crear asignación de categorías
    indices = list(range(1, total + 1))
    random.shuffle(indices)

    categories = {}
    cursor = 0

    def assign(count, name):
        nonlocal cursor
        for _ in range(count):
            categories[indices[cursor]] = name
            cursor += 1

    assign(expired, "expired")
    assign(current_month, "current_month")
    assign(next_month, "next_month")
    assign(inactive, "inactive")
    assign(leftovers, "other")

    existing_ids = set(Patient.objects.values_list("national_id", flat=True))

    created = 0
    for i in range(1, total + 1):
        category = categories[i]
        payload = build_patient_payload(i, category, existing_ids)

        next_date = make_next_date_for_category(category)
        payload["next_appointment_date"] = next_date

        if category == "inactive":
            # last_prophylactic ya está 2020-2023
            pass
        else:
            payload["last_prophylactic_date"] = make_last_prophylactic_for_active(next_date)

        # Crear patient
        p = Patient.objects.create(**payload)

        # Crear 2-5 citas históricas
        create_appointments_histories(Appointment, p, category, next_date)

        created += 1
        remaining = total - created
        print(f"✅ Creado {created}/{total} — quedan {remaining}")

    print("\n🎉 Listo.")
    print("Resumen:")
    print(f"  - Total: {total}")
    print(f"  - Vencidos (últimos 12 meses): {expired}")
    print(f"  - Marzo 2026: {current_month}")
    print(f"  - Abril 2026: {next_month}")
    print(f"  - Inactivos: {inactive}")
    print(f"  - Otros (futuro mayo-dic 2026): {leftovers}")
    print("\nTip:")
    print("  • Para probar 'Fecha pendiente': cambia Siguiente cita y responde NO / NO.")
    print("  • Para ver resaltado rosado: usa filtro 'Este mes' y habrá vencidos si la fecha cae antes de hoy.")


if __name__ == "__main__":
    main()