from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from patients.models import AuditLog, Patient


class PatientAPITests(APITestCase):
    def setUp(self):
        self.base_payload = {
            'first_name': 'Ana',
            'last_name': 'Pérez',
            'age': 31,
            'national_id': '12345678-9',
            'address': 'Calle 1',
            'phone': '+56911111111',
            'email': 'ana@example.com',
        }

    def test_national_id_must_be_unique(self):
        url = reverse('patient-list')
        response_one = self.client.post(url, self.base_payload, format='json')
        self.assertEqual(response_one.status_code, status.HTTP_201_CREATED)

        payload_two = {**self.base_payload, 'email': 'other@example.com'}
        response_two = self.client.post(url, payload_two, format='json')
        self.assertEqual(response_two.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('national_id', response_two.data)

    def test_update_creates_audit_log_entry(self):
        patient = Patient.objects.create(**self.base_payload)
        url = reverse('patient-detail', args=[patient.id])

        response = self.client.patch(url, {'phone': '+56999999999'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        log_exists = AuditLog.objects.filter(
            patient=patient,
            field_name='phone',
            old_value='+56911111111',
            new_value='+56999999999',
            action='update',
        ).exists()
        self.assertTrue(log_exists)
