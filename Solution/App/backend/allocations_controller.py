from fastapi import APIRouter
from Solution.App.backend.models import qubo_model_dwave as qubo, gurobi_model as gurobi, shelter_service as ss
from pydantic import BaseModel
import middleware as mid
from fastapi import HTTPException, status

class Allocation_Request(BaseModel):
    budget: float
    model: str
    allowedDistance: float
    averagePersonPerBuilding: int
    token: str

router = APIRouter(prefix="/allocations", tags=["allocations"])

@router.post("/optimize")
def get_shelter_allocations(body: Allocation_Request):
    print(f"Parametry: {body.budget} {body.allowedDistance} {body.averagePersonPerBuilding} {body.model} {body.token}")

    try:
        verify = mid.verify_token(body.token)
    except:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if(not verify):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    result = None
    if body.model == "QUBO":
        result = qubo.get_shelter_allocation(body.budget, body.allowedDistance, body.averagePersonPerBuilding)
    elif body.model == "GUROBI":
        result = gurobi.get_shelter_allocation(body.budget, body.allowedDistance, body.averagePersonPerBuilding)
    return result
