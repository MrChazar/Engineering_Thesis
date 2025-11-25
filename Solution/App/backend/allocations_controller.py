from fastapi import APIRouter
import models.gurobi_model as gurobi
from pydantic import BaseModel
import middleware as mid
from fastapi import HTTPException, status

class Allocation_Request(BaseModel):
    budget: float
    model: str
    allowedDistance: float
    averagePersonPerBuilding: int
    weight_1: float
    weight_2: float
    weight_3: float
    token: str

router = APIRouter(prefix="/allocations", tags=["allocations"])

@router.post("/optimize")
def get_shelter_allocations(body: Allocation_Request):
    print(f"Parametry: {body.budget} {body.allowedDistance} {body.averagePersonPerBuilding} "
          f"{body.weight_1} {body.weight_2} {body.weight_3} {body.model} {body.token}")

    try:
        verify = mid.verify_token(body.token)
    except:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if(not verify):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    result = None
    if body.model == "GUROBI":
        result = gurobi.get_shelter_allocation(body.budget, body.allowedDistance, body.averagePersonPerBuilding,
                                               body.weight_1, body.weight_2, body.weight_3)
    return result
