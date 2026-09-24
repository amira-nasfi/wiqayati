"""
Paramètres CI (GitHub Actions) — Wiqayati
Hérite de base.py avec la base de données fournie par les services CI.
"""
import os
from .base import *  # noqa: F401, F403

DEBUG = False

SECRET_KEY = os.environ.get('SECRET_KEY', 'ci-secret-key-not-for-production')

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']

# ── Base de données PostgreSQL injectée par l'env CI ─────────────────────────
import dj_database_url  # noqa: E402
DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get(
            'DATABASE_URL',
            'postgres://wiqayati:wiqayati_pass@localhost:5432/wiqayati_test'
        ),
        conn_max_age=0,
    )
}

# ── Redis ─────────────────────────────────────────────────────────────────────
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_BROKER_URL = REDIS_URL
CELERY_TASK_ALWAYS_EAGER = True   # Les tâches Celery s'exécutent de façon synchrone en CI
CELERY_TASK_EAGER_PROPAGATES = True

# ── Cache ─────────────────────────────────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}

# ── Email ─────────────────────────────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# ── Sécurité (désactivée en CI pour faciliter les tests) ─────────────────────
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',  # Rapide pour les tests
]

# ── Logging minimaliste en CI ─────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}

# ── FHIR (désactivé en CI — pas de HAPI FHIR disponible) ─────────────────────
FHIR_SERVER_URL = 'http://localhost:8085/fhir'  # Ne sera pas joignable en CI
FHIR_SYNC_ENABLED = False  # Désactiver la sync FHIR asynchrone en CI
