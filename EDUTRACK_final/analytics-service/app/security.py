# ============================================================================
# EduTrack AI v2 - analytics-service/app/security.py
# Validação de chave de segurança interna compartilhada entre Node e Python
# ============================================================================

from fastapi import Header, HTTPException, status
from app.config import settings

def verify_internal_key(x_internal_key: str = Header(None, alias="X-Internal-Key")):
    if not x_internal_key or x_internal_key != settings.internal_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso não autorizado: chave interna inválida ou ausente."
        )
    return True
