from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class RiskEngineConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.risk_engine'
    verbose_name = _('Moteur de Risque')
