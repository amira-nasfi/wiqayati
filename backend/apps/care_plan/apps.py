from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class CarePlanConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.care_plan'
    verbose_name = _('Plans de Soin')
