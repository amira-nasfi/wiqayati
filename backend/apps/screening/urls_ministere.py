"""
URLs pour les indicateurs statistiques du Ministère de la Santé.
"""
from django.urls import path
from .views_ministere import (
    StatsApercuMinistereView,
    StatsParGouvernoratView,
    StatsTendancesView,
    StatsFacteursRisqueView,
)

urlpatterns = [
    path('stats/apercu/', StatsApercuMinistereView.as_view(), name='ministere-stats-apercu'),
    path('stats/par-gouvernorat/', StatsParGouvernoratView.as_view(), name='ministere-stats-gouvernorat'),
    path('stats/tendances/', StatsTendancesView.as_view(), name='ministere-stats-tendances'),
    path('stats/facteurs-risque/', StatsFacteursRisqueView.as_view(), name='ministere-stats-facteurs'),
]
