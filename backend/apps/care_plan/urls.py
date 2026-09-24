"""
URLs pour la consultation et gestion des plans de soins par les nutritionnistes.
"""
from django.urls import path
from .views import (
    ConsultationPlanView,
    ModificationPlanView,
    ValidationPlanView,
    RejetPlanView,
)

urlpatterns = [
    path('<uuid:pk>/', ConsultationPlanView.as_view(), name='plans-consultation'),
    path('<uuid:pk>/modifier/', ModificationPlanView.as_view(), name='plans-modification'),
    path('<uuid:pk>/valider/', ValidationPlanView.as_view(), name='plans-validation'),
    path('<uuid:pk>/rejeter/', RejetPlanView.as_view(), name='plans-rejet'),
]
