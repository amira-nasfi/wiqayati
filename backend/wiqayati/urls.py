"""
URLs racine — Wiqayati
Plateforme tunisienne de dépistage précoce du diabète de type 2.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

api_v1 = [
    # Authentification & profil unifié
    path('auth/', include('apps.accounts.urls_auth')),

    # Portail agent (dossiers patients & soumission de dépistage)
    path('patients/', include('apps.screening.urls_patients')),
    path('screening/', include('apps.screening.urls_screening')),

    # Portail nutritionniste (file de priorité & édition/validation des plans)
    path('nutritionniste/', include('apps.nutritionist_queue.urls')),
    path('nutritionniste/plans/', include('apps.care_plan.urls')),

    # Portail citoyen (app Expo mobile)
    path('citoyen/', include('apps.screening.urls_citoyen')),

    # Dashboards d'administration
    path('admin/ministere/', include('apps.screening.urls_ministere')),
    path('admin/it/', include('apps.accounts.urls_admin_it')),
]

urlpatterns = [
    path('django-admin/', admin.site.urls),
    path('api/v1/', include(api_v1)),

    # Documentation API interactive OpenAPI / Swagger
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
