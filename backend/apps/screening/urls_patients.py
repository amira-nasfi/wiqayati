"""
URLs pour la recherche et la création de fiches patients par INS.
"""
from django.urls import path
from .views import RecherchePatientView, CreationPatientView

urlpatterns = [
    path('recherche/', RecherchePatientView.as_view(), name='patients-recherche'),
    path('', CreationPatientView.as_view(), name='patients-creation'),
]
