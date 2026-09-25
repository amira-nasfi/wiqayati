"""
URLs pour la file de priorité et l'espace de travail des nutritionnistes.
"""
from django.urls import path
from .views import (
    FilePrioriteNutritionnisteView,
    PrendreEnChargeTacheView,
    HistoriquePatientNutritionnisteView,
)

urlpatterns = [
    path('file/', FilePrioriteNutritionnisteView.as_view(), name='nutritionniste-file'),
    path(
        'file/<uuid:pk>/prendre-en-charge/',
        PrendreEnChargeTacheView.as_view(),
        name='nutritionniste-prendre-en-charge'
    ),
    path(
        'patients/<str:ins>/historique/',
        HistoriquePatientNutritionnisteView.as_view(),
        name='nutritionniste-patient-historique'
    ),
]
