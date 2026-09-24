"""
Middleware pour la vérification immédiate de l'expiration des comptes de campagne.
"""
from django.utils import timezone
from django.http import JsonResponse
from django.utils.translation import gettext_lazy as _


class VerificationExpirationCompteMiddleware:
    """
    Vérifie à chaque requête HTTP si le compte utilisateur a atteint sa date d'expiration.
    Si le compte est expiré, la requête est rejetée avec un code 403.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = getattr(request, 'user', None)

        if user and user.is_authenticated:
            # Vérification de l'attribut expire_le
            if getattr(user, 'expire_le', None) and timezone.now() > user.expire_le:
                # Désactiver immédiatement le compte en base si ce n'est pas déjà fait
                if user.is_active:
                    user.is_active = False
                    user.save(update_fields=['is_active'])

                return JsonResponse(
                    {
                        'detail': _("Votre compte temporaire a expiré. Veuillez contacter votre administrateur."),
                        'code': 'compte_expire'
                    },
                    status=403
                )

        return self.get_response(request)
