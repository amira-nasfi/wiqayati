#!/usr/bin/env python
"""
Utilitaire de gestion Django pour Wiqayati.
"""
import os
import sys


def main():
    """Lance les tâches administratives."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wiqayati.settings.development')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Impossible d'importer Django. Assurez-vous que Django est installé "
            "et disponible dans votre variable d'environnement PYTHONPATH, "
            "et que vous avez activé un environnement virtuel."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
