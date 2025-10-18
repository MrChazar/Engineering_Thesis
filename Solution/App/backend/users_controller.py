from fastapi import APIRouter
from fastapi import HTTPException, status
from pydantic import BaseModel
from Solution.App.backend.models import gnn_model as gnn, gurobi_model as gurobi, user_service as us
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer

class LoginRequest(BaseModel):
    login: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    surname: str
    email: str
    password: str

class VerifyRequest(BaseModel):
    token: str

router = APIRouter(prefix="/users", tags=["users"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="users/login")

@router.post("/login")
def login(body: LoginRequest):
    token = us.login(body.login, body.password)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": token, "token_type": "bearer"}

@router.post("/register")
def register(body: RegisterRequest):
    info = us.register(body.name, body.surname, body.email, body.password)
    return {"success": info}


@router.post("/verify")
def verify_token(body: VerifyRequest):
    try:
        payload = jwt.decode(body.token, us.SECRET_KEY, algorithms=[us.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"valid": True}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")