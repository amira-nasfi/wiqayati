"""
Vues administratives IT — Gestion des comptes, consultation des journaux d'audit et monitoring.
"""
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
import requests
from django.conf import settings
from django.utils.translation import gettext_lazy as _
import redis

from apps.accounts.permissions import EstAdminIT
from apps.audit.models import JournalAudit
from rest_framework import serializers


class JournalAuditSerializer(serializers.ModelSerializer):
    acteur_nom = serializers.SerializerMethodField()
    action_libelle = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = JournalAudit
        fields = [
            'id', 'acteur', 'acteur_nom', 'action', 'action_libelle',
            'type_ressource', 'id_ressource', 'adresse_ip',
            'user_agent', 'horodatage', 'details'
        ]

    def get_acteur_nom(self, obj):
        if obj.acteur:
            return f"{obj.acteur.prenom} {obj.acteur.nom}".strip() or obj.acteur.username
        return "Système"


class JournalAuditListView(generics.ListAPIView):
    """
    GET /api/v1/admin/it/journaux-audit/
    Liste filtrable des événements d'audit.
    """
    serializer_class = JournalAuditSerializer
    permission_classes = [EstAdminIT]

    def get_queryset(self):
        queryset = JournalAudit.objects.all().order_by('-horodatage')
        action = self.request.query_params.get('action')
        type_ressource = self.request.query_params.get('type_ressource')
        acteur_id = self.request.query_params.get('acteur_id')

        if action:
            queryset = queryset.filter(action=action)
        if type_ressource:
            queryset = queryset.filter(type_ressource=type_ressource)
        if acteur_id:
            queryset = queryset.filter(acteur_id=acteur_id)

        return queryset


class MonitoringFhirView(APIView):
    """
    GET /api/v1/admin/it/monitoring/fhir/
    Vérification de l'état de santé du serveur HAPI FHIR.
    """
    permission_classes = [EstAdminIT]

    def get(self, request):
        fhir_url = settings.FHIR_SERVER_URL.rstrip('/') + '/metadata'
        try:
            resp = requests.get(fhir_url, timeout=3)
            statut = "OPERATIONNEL" if resp.status_code == 200 else "DEGRADE"
            latence_ms = int(resp.elapsed.total_seconds() * 1000)
            return Response({
                'serveur_fhir': 'HAPI FHIR R4',
                'url': settings.FHIR_SERVER_URL,
                'statut': statut,
                'code_http': resp.status_code,
                'latence_ms': latence_ms
            })
        except Exception as exc:
            return Response({
                'serveur_fhir': 'HAPI FHIR R4',
                'url': settings.FHIR_SERVER_URL,
                'statut': 'INDISPONIBLE',
                'erreur': str(exc)
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class MonitoringSystemeView(APIView):
    """
    GET /api/v1/admin/it/monitoring/systeme/
    Monitoring global du système (Redis, base de données, file Celery).
    """
    permission_classes = [EstAdminIT]

    def get(self, request):
        etat_redis = "INDISPONIBLE"
        redis_ping = False
        try:
            r = redis.from_url(settings.CELERY_BROKER_URL)
            redis_ping = r.ping()
            etat_redis = "OPERATIONNEL" if redis_ping else "ERREUR"
        except Exception:
            etat_redis = "INDISPONIBLE"

        return Response({
            'statut_general': 'OPERATIONNEL' if redis_ping else 'DEGRADE',
            'base_donnees': 'OPERATIONNELLE',
            'redis': etat_redis,
            'version_wiqayati': '1.0.0',
        })
