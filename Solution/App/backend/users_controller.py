from fastapi import APIRouter
from fastapi import HTTPException, status
from pydantic import BaseModel
from models import gurobi_model as gurobi, user_service as us
import middleware as mid

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

class RefreshRequest(BaseModel):
    refresh_token: str


router = APIRouter(prefix="/users", tags=["users"])


@router.post("/login")
def login(body: LoginRequest):
    tokens = us.login(body.login, body.password)
    if not tokens:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return tokens


@router.post("/register")
def register(body: RegisterRequest):
    info = us.register(body.name, body.surname, body.email, body.password)
    return {"success": info}


@router.post("/verify")
def verify_token(body: VerifyRequest):
    result = mid.verify_token(body.token)
    return {"valid": bool(result)}


@router.post("/refresh")
def refresh_token(body: RefreshRequest):
    payload = mid.verify_token(body.refresh_token, refresh=True)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    username = payload.get("sub")
    new_access = us.create_access_token({"sub": username})
    return {"access_token": new_access}