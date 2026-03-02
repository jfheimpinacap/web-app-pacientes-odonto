import csv
from io import BytesIO

from django.http import HttpResponse
from django.utils import timezone
from openpyxl import Workbook
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from .models import Appointment, Patient
from .serializers import AppointmentSerializer, PatientDetailSerializer, PatientSerializer
from .services import create_audit_logs


class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.filter(is_deleted=False).prefetch_related('appointments', 'audit_logs')
    serializer_class = PatientSerializer
    filterset_fields = ['status']
    ordering_fields = ['first_name', 'last_name', 'national_id', 'status']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PatientDetailSerializer
        return super().get_serializer_class()

    def perform_create(self, serializer):
        patient = serializer.save()
        create_audit_logs(patient, old_values={}, action='create', actor='system')

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        old_values = {field: getattr(instance, field) for field in request.data.keys()}
        response = super().partial_update(request, *args, **kwargs)
        instance.refresh_from_db()
        create_audit_logs(instance, old_values=old_values, action='update', actor='system')
        return response

    @action(detail=True, methods=['get', 'post'])
    def appointments(self, request, pk=None):
        patient = self.get_object()
        if request.method == 'GET':
            serializer = AppointmentSerializer(patient.appointments.all(), many=True)
            return Response(serializer.data)

        serializer = AppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save(patient=patient)

        if appointment.date > timezone.now().date() and not patient.next_appointment_date:
            patient.next_appointment_date = appointment.date
            patient.save(update_fields=['next_appointment_date', 'updated_at'])

        return Response(AppointmentSerializer(appointment).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def export_report(request):
    status_filter = request.GET.get('status')
    format_type = request.GET.get('format', 'csv')
    patients = Patient.objects.filter(is_deleted=False)
    if status_filter:
        patients = patients.filter(status=status_filter)

    fields = ['id', 'first_name', 'last_name', 'age', 'national_id', 'status', 'phone', 'email']

    if format_type == 'xlsx':
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = 'Pacientes'
        sheet.append(fields)
        for patient in patients:
            sheet.append([getattr(patient, field) for field in fields])

        buffer = BytesIO()
        workbook.save(buffer)
        buffer.seek(0)
        response = HttpResponse(
            buffer.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="patients.xlsx"'
        return response

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="patients.csv"'
    writer = csv.writer(response)
    writer.writerow(fields)
    for patient in patients:
        writer.writerow([getattr(patient, field) for field in fields])
    return response
