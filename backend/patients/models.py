from django.db import models
from django.utils import timezone


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Patient(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = 'active', 'Activo'
        INACTIVE = 'inactive', 'Inactivo'

    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120)
    age = models.PositiveIntegerField()
    national_id = models.CharField(max_length=32, unique=True)
    address = models.CharField(max_length=255)
    phone = models.CharField(max_length=30)
    email = models.EmailField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    last_prophylactic_date = models.DateField(blank=True, null=True)
    next_appointment_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, default='')
    is_deleted = models.BooleanField(default=False)

    class Meta:
        ordering = ['first_name', 'last_name']

    def __str__(self):
        return f'{self.first_name} {self.last_name}'

    @property
    def last_activity_date(self):
        latest_appointment = self.appointments.order_by('-date').first()
        if latest_appointment:
            return max(self.updated_at.date(), latest_appointment.date)
        return self.updated_at.date()

    @property
    def should_move_to_inactive(self):
        return (timezone.now().date() - self.last_activity_date).days > 365 * 3


class Appointment(TimeStampedModel):
    class Status(models.TextChoices):
        ARRIVED = 'arrived', 'Llegó'
        NOT_ARRIVED = 'not_arrived', 'No llegó'
        CANCELED = 'canceled', 'Canceló'

    class Reason(models.TextChoices):
        PATIENT_CHANGE = 'patient_change', 'Paciente modifica fecha de cita'
        DOCTOR_CHANGE = 'doctor_change', 'Doctor modifica fecha de cita'
        PATIENT_CANCEL = 'patient_cancel', 'Paciente cancela'

    patient = models.ForeignKey(Patient, related_name='appointments', on_delete=models.PROTECT)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices)

    # ✅ Nuevo: motivo de cambio (opcional)
    reason = models.CharField(max_length=30, choices=Reason.choices, blank=True, null=True)

    class Meta:
        ordering = ['-date', '-created_at']


class AuditLog(models.Model):
    patient = models.ForeignKey(Patient, related_name='audit_logs', on_delete=models.PROTECT)
    field_name = models.CharField(max_length=64)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    action = models.CharField(max_length=12)
    actor = models.CharField(max_length=120, default='system')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']