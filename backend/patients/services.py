from .models import AuditLog


AUDITED_FIELDS = {
    'first_name',
    'last_name',
    'age',
    'national_id',
    'address',
    'phone',
    'email',
    'status',
    'last_prophylactic_date',
    'next_appointment_date',
    'notes',
}


def create_audit_logs(patient, old_values, action='update', actor='system'):
    entries = []
    for field in AUDITED_FIELDS:
        old_val = old_values.get(field)
        new_val = getattr(patient, field)
        if action == 'create' or old_val != new_val:
            entries.append(
                AuditLog(
                    patient=patient,
                    field_name=field,
                    old_value='' if old_val is None else str(old_val),
                    new_value='' if new_val is None else str(new_val),
                    action=action,
                    actor=actor,
                )
            )
    if entries:
        AuditLog.objects.bulk_create(entries)
