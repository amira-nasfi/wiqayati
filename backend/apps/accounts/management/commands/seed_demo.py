"""
Alias command for seed_demo_data
Usage:
    python manage.py seed_demo
"""
from apps.accounts.management.commands.seed_demo_data import Command as SeedDemoDataCommand


class Command(SeedDemoDataCommand):
    help = "Alias pour seed_demo_data"
