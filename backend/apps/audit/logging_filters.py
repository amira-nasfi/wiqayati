"""
Filtre de journalisation pour masquer les données sensibles dans les logs.
Conforme aux exigences de protection des données de santé.
"""
import logging
import re

SENSITIVE_PATTERNS = [
    (
        re.compile(
            r'("?(?:password|mot_de_passe|secret|token|refresh|access)"?\s*[:=]\s*"?)[^",\s]+("?)',
            re.IGNORECASE,
        ),
        r'\1***MASQUÉ***\2',
    ),
    (re.compile(r'(Bearer\s+)[A-Za-z0-9\-\._~\+\/]+=*', re.IGNORECASE), r'\1***MASQUÉ***'),
]


class MasquerDonneesSensiblesFilter(logging.Filter):
    """
    Masque les mots de passe, jetons JWT et données hautement sensibles dans les logs.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            msg = record.msg
            for pattern, repl in SENSITIVE_PATTERNS:
                msg = pattern.sub(repl, msg)
            record.msg = msg
        return True
