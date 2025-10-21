from pydantic import BaseModel
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
from fastapi import HTTPException, status
from Solution.App.backend.models import user_service as us



def verify_token(token: str):
    try:
        payload = jwt.decode(token, us.SECRET_KEY, algorithms=[us.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return False
        return True
    except JWTError:
        return False