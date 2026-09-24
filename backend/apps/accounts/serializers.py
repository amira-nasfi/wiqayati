"""
Sérialiseurs pour l'authentification et la gestion des comptes utilisateurs.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from .models import CompteUtilisateur, Notification, Role


class ProfilUtilisateurSerializer(serializers.ModelSerializer):
    """Sérialiseur pour le profil de l'utilisateur connecté."""
    role_libelle = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = CompteUtilisateur
        fields = [
            'id', 'username', 'email', 'prenom', 'nom',
            'role', 'role_libelle', 'is_active', 'expire_le',
            'gouvernorat', 'mot_de_passe_temporaire', 'derniere_connexion_le'
        ]
        read_only_fields = ['id', 'username', 'role', 'role_libelle', 'expire_le', 'derniere_connexion_le']


class ConnexionSerializer(TokenObtainPairSerializer):
    """
    Sérialiseur d'obtention de jetons JWT personnalisé.
    Vérifie l'état d'activation et la date d'expiration du compte,
    et inclut les détails de l'utilisateur dans la réponse.
    """

    def validate(self, attrs):
        data = super().validate(attrs)

        if not self.user.is_active:
            raise serializers.ValidationError(
                {'detail': _("Ce compte est désactivé. Veuillez contacter l'administrateur.")}
            )

        if self.user.est_expire:
            self.user.is_active = False
            self.user.save(update_fields=['is_active'])
            raise serializers.ValidationError(
                {'detail': _("Votre compte temporaire a expiré. Veuillez contacter l'administrateur.")}
            )

        # Mettre à jour la date de dernière connexion
        self.user.derniere_connexion_le = timezone.now()
        self.user.save(update_fields=['derniere_connexion_le'])

        data['utilisateur'] = {
            'id': str(self.user.id),
            'identifiant': self.user.username,
            'nom_complet': f"{self.user.prenom} {self.user.nom}".strip() or self.user.username,
            'prenom': self.user.prenom,
            'nom': self.user.nom,
            'email': self.user.email,
            'role': self.user.role,
            'role_libelle': self.user.get_role_display(),
            'gouvernorat': self.user.gouvernorat,
            'expire_le': self.user.expire_le.isoformat() if self.user.expire_le else None,
            'mot_de_passe_temporaire': self.user.mot_de_passe_temporaire,
        }

        return data


class CompteUtilisateurAdminSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la consultation et gestion des comptes par l'Admin IT."""
    role_libelle = serializers.CharField(source='get_role_display', read_only=True)

    class Meta:
        model = CompteUtilisateur
        fields = [
            'id', 'username', 'email', 'prenom', 'nom',
            'role', 'role_libelle', 'is_active', 'expire_le',
            'gouvernorat', 'fhir_practitioner_id', 'mot_de_passe_temporaire',
            'cree_le', 'derniere_connexion_le'
        ]
        read_only_fields = ['id', 'cree_le', 'derniere_connexion_le']


class CreationCompteSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création d'un compte par l'Admin IT."""
    mot_de_passe = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = CompteUtilisateur
        fields = [
            'id', 'username', 'email', 'prenom', 'nom',
            'role', 'is_active', 'expire_le', 'gouvernorat',
            'mot_de_passe'
        ]

    def validate(self, attrs):
        role = attrs.get('role')
        expire_le = attrs.get('expire_le')

        # Pour les agents de campagne, la date d'expiration est fortement conseillée
        if role == Role.AGENT_CAMPAGNE and not expire_le:
            # On autorise mais on prévient ou valide selon règles
            pass

        return attrs

    def create(self, validated_data):
        mot_de_passe = validated_data.pop('mot_de_passe', None)
        user = CompteUtilisateur(**validated_data)
        if mot_de_passe:
            user.set_password(mot_de_passe)
            user.mot_de_passe_temporaire = True
        else:
            # Générer mot de passe par défaut
            mot_de_passe_defaut = "Wiqayati2026!"
            user.set_password(mot_de_passe_defaut)
            user.mot_de_passe_temporaire = True
        user.save()
        return user


class NotificationSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les notifications citoyen."""
    type_libelle = serializers.CharField(source='get_type_notification_display', read_only=True)

    class Meta:
        model = Notification
        fields = ['id', 'type_notification', 'type_libelle', 'message', 'lu', 'cree_le', 'lu_le']
        read_only_fields = ['id', 'type_notification', 'type_libelle', 'message', 'cree_le', 'lu_le']
