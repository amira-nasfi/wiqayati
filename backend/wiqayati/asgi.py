"""
Point d'entrée ASGI pour Wiqayati (WebSocket futur).
"""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wiqayati.settings.development')
application = get_asgi_application()
