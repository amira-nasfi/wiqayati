from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class FhirBridgeConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.fhir_bridge'
    verbose_name = _('Passerelle FHIR')
