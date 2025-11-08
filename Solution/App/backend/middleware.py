from pydantic import BaseModel
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
from fastapi import HTTPException, status
from Solution.App.backend.models import user_service as us



def verify_token(token: str, refresh: bool = False):
    try:
        payload = jwt.decode(token, us.SECRET_KEY, algorithms=[us.ALGORITHM])
        token_type = payload.get("type")
        if token_type == "refresh" and not refresh:
            return None
        if token_type == "access" and refresh:
            return None
        return payload
    except JWTError:
        return None