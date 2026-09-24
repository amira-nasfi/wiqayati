from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class NutritionistQueueConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.nutritionist_queue'
    verbose_name = _('File Nutritionniste')
