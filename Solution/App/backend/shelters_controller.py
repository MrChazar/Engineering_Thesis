from fastapi import APIRouter
from Solution.App.backend.models import qubo_model_dwave as qubo, gurobi_model as gurobi, shelter_service as ss
from pydantic import BaseModel
import middleware as mid
from fastapi import HTTPException, status


class Verification_Request(BaseModel):
    token: str

router = APIRouter(prefix="/shelters", tags=["shelters"])


@router.post("/{x}/{y}/{capacity}/{cost}")
def add_shelter(x: float, y: float, capacity: int, cost: float, body: Verification_Request):

    try:
        verify = mid.verify_token(body.token)
    except:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if (not verify):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    result = ss.add_shelter(x,y,capacity,cost)
    return result

@router.put("/{id}/{x}/{y}/{capacity}/{cost}")
def edit_shelter(id: int, x: float, y: float, capacity: int, cost: float, body: Verification_Request):

    try:
        verify = mid.verify_token(body.token)
    except:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if (not verify):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    result = ss.edit_shelter(id, x, y, capacity, cost)
    return result

@router.delete("/{id}")
def delete_shelter(id: int, body: Verification_Request):

    try:
        verify = mid.verify_token(body.token)
    except:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if (not verify):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    result = ss.delete_shelter(id)
    return result


