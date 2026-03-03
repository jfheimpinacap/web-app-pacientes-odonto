from rest_framework import serializers

from .models import Appointment, AuditLog, Patient


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = ['id', 'field_name', 'old_value', 'new_value', 'action', 'actor', 'timestamp']


class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ['id', 'date', 'status', 'created_at']


class PatientSerializer(serializers.ModelSerializer):
    should_move_to_inactive = serializers.BooleanField(read_only=True)
    last_appointment_status = serializers.SerializerMethodField()

    class Meta:
        model = Patient
        fields = [
            'id',
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
            'should_move_to_inactive',
            'last_appointment_status',
            'created_at',
            'updated_at',
        ]

    def get_last_appointment_status(self, obj):
        appt = obj.appointments.order_by('-date').first()
        return appt.status if appt else None


class PatientDetailSerializer(PatientSerializer):
    appointments = AppointmentSerializer(many=True, read_only=True)
    audit_logs = AuditLogSerializer(many=True, read_only=True)

    class Meta(PatientSerializer.Meta):
        fields = PatientSerializer.Meta.fields + ['appointments', 'audit_logs']