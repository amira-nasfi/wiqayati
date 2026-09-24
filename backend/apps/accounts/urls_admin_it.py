"""
URLs pour le portail d'administration IT.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GestionComptesAdminViewSet
from .views_admin_it import JournalAuditListView, MonitoringFhirView, MonitoringSystemeView

router = DefaultRouter()
router.register(r'utilisateurs', GestionComptesAdminViewSet, basename='admin-it-utilisateurs')

urlpatterns = [
    path('journaux-audit/', JournalAuditListView.as_view(), name='admin-it-journaux-audit'),
    path('monitoring/fhir/', MonitoringFhirView.as_view(), name='admin-it-monitoring-fhir'),
    path('monitoring/systeme/', MonitoringSystemeView.as_view(), name='admin-it-monitoring-systeme'),
    path('', include(router.urls)),
]
