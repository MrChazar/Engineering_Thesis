from fastapi import APIRouter
from pydantic import BaseModel
from Solution.App.backend.models import gnn_model as gnn, gurobi_model as gurobi, data_handler as dh

class LoginRequest(BaseModel):
    login: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    surname: str
    email: str
    password: str

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/login")
def login(body: LoginRequest):
    info = dh.login(body.login, body.password)
    return {"success": info}

@router.post("/register")
def register(body: RegisterRequest):
    info = dh.register(body.name, body.surname, body.email, body.password)
    return {"success": info}