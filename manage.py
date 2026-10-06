#!/usr/bin/env python
"""
Wrapper manage.py à la racine du dépôt pour Render / Cloud deployment.
Redirige automatiquement vers le dossier backend/.
"""
import os
import sys

def main():
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    os.chdir(backend_dir)
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wiqayati.settings.production')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Impossible d'importer Django. Vérifiez les dépendances installées."
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == '__main__':
    main()
