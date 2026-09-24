"""
URLs pour la consultation du questionnaire et la soumission de dépistages.
"""
from django.urls import path
from .views import QuestionnaireDefinitionView, SoumissionScreeningView

urlpatterns = [
    path('questionnaire/', QuestionnaireDefinitionView.as_view(), name='screening-questionnaire'),
    path('soumissions/', SoumissionScreeningView.as_view(), name='screening-soumissions'),
]
