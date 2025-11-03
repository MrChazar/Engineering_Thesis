from fastapi import APIRouter
from fastapi import HTTPException, status
from pydantic import BaseModel
from Solution.App.backend.models import qubo_model_dwave as qubo, gurobi_model as gurobi, user_service as us
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi.security import OAuth2PasswordBearer
import middleware as mid

# Dto's
class VerifyRequest(BaseModel):
    token: str

class LoginRequest(BaseModel):
    login: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    surname: str
    email: str
    password: str



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
    result = mid.verify_token(body.token)
    if result:
        return {"valid": True}
    else:
        return {"valid": False}
