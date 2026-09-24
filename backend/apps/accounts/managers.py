"""
Gestionnaire personnalisé pour le modèle CompteUtilisateur.
"""
from django.contrib.auth.models import BaseUserManager
from django.utils.translation import gettext_lazy as _


class GestionnaireCompteUtilisateur(BaseUserManager):
    """
    Manager personnalisé pour CompteUtilisateur utilisant l'identifiant (username)
    comme identifiant principal de connexion.
    """

    def create_user(self, username, email, password=None, **extra_fields):
        """Crée et sauvegarde un utilisateur classique."""
        if not username:
            raise ValueError(_("L'identifiant est obligatoire."))
        if not email:
            raise ValueError(_("L'adresse e-mail est obligatoire."))

        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        """Crée et sauvegarde un superutilisateur / administrateur IT."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN_IT')

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_("Le superutilisateur doit avoir is_staff=True."))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_("Le superutilisateur doit avoir is_superuser=True."))

        return self.create_user(username, email, password, **extra_fields)
