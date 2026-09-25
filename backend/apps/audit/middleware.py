"""
Middleware d'audit pour enregistrer automatiquement les requêtes modificatrices
et attacher l'IP / User-Agent au contexte.
"""
import logging
from django.utils.deprecation import MiddlewareMixin
from .models import JournalAudit

logger = logging.getLogger(__name__)


def recuperer_ip_client(request):
    """Extrait l'adresse IP réelle de la requête HTTP."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


class AuditMiddleware(MiddlewareMixin):
    """
    Middleware qui enregistre automatiquement les requêtes d'écriture API
    (POST, PUT, PATCH, DELETE) dans JournalAudit si l'utilisateur est authentifié.
    """

    def process_request(self, request):
        request.ip_client = recuperer_ip_client(request)
        request.user_agent = request.META.get('HTTP_USER_AGENT', '')

    def process_response(self, request, response):
        # On audite uniquement les routes API et les méthodes d'écriture
        if request.path.startswith('/api/v1/') and request.method in ('POST', 'PUT', 'PATCH', 'DELETE'):
            user = getattr(request, 'user', None)
            if user and user.is_authenticated:
                # Éviter d'auditer les flux bruts de rafraîchissement token
                if 'auth/rafraichir' in request.path:
                    return response

                try:
                    if 'plans' in request.path:
                        action = JournalAudit.Action.MODIFICATION_PLAN
                    elif 'screening' in request.path:
                        action = JournalAudit.Action.SOUMISSION_SCREENING
                    elif 'auth' in request.path:
                        action = JournalAudit.Action.CONNEXION
                    else:
                        action = 'ACTION_API'

                    type_ressource = (
                        request.path.split('/')[3]
                        if len(request.path.split('/')) > 3
                        else 'api'
                    )

                    id_ressource = ''
                    if hasattr(response, 'data') and isinstance(response.data, dict):
                        id_ressource = str(response.data.get('id', ''))

                    JournalAudit.objects.create(
                        acteur=user,
                        action=action,
                        type_ressource=type_ressource,
                        id_ressource=id_ressource,
                        adresse_ip=getattr(request, 'ip_client', None),
                        user_agent=getattr(request, 'user_agent', '')[:500],
                        details={
                            'methode': request.method,
                            'path': request.path,
                            'statut_code': response.status_code
                        }
                    )
                except Exception as exc:
                    logger.warning("Échec de l'enregistrement de l'audit automatique: %s", exc)

        return response
