"""
Paramètres de production — Wiqayati
"""
from .base import *  # noqa: F401, F403
import os

DEBUG = False

# En production, les valeurs sensibles viennent des variables d'environnement
SECRET_KEY = os.environ.get('SECRET_KEY', SECRET_KEY)

# Hôtes autorisés (ex: .onrender.com ou wildcard)
raw_hosts = os.environ.get('ALLOWED_HOSTS', '*')
ALLOWED_HOSTS = [h.strip() for h in raw_hosts.split(',') if h.strip()]

# Configuration de la base de données via DATABASE_URL (Supabase PostgreSQL)
DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    import re
    DATABASE_URL = re.sub(r':\[([^\]]+)\]@', r':\1@', DATABASE_URL)
    DATABASES['default'] = dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=600,
        ssl_require=True
    )

# Gestion du proxy inverse Render / Cloud pour le SSL
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False').lower() in ('true', '1')
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() in ('true', '1')
CSRF_COOKIE_SECURE = os.environ.get('CSRF_COOKIE_SECURE', 'False').lower() in ('true', '1')

# Fichiers statiques avec WhiteNoise
if 'whitenoise.middleware.WhiteNoiseMiddleware' not in MIDDLEWARE:
    MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# CORS — accepte TOUTES les origines (APK mobile, frontend Render, localhost)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# CSRF Trusted Origins — accepte tous les sous-domaines Render + localhost
RENDER_EXTERNAL_HOSTNAME = os.environ.get('RENDER_EXTERNAL_HOSTNAME')
CSRF_TRUSTED_ORIGINS = [
    'https://*.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000',
]
if RENDER_EXTERNAL_HOSTNAME:
    CSRF_TRUSTED_ORIGINS.append(f'https://{RENDER_EXTERNAL_HOSTNAME}')

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', '')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
