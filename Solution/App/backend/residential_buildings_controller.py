from fastapi import APIRouter
from models import  gurobi_model as gurobi, shelter_service as ss
from pydantic import BaseModel
import middleware as mid
from fastapi import HTTPException, status

class Verification_Request(BaseModel):
    token: str

router = APIRouter(prefix="/residential_buildings", tags=["residential buildings"])


@router.post("/{x}/{y}")
def add_residential_building(x: float, y: float, body: Verification_Request):

    try:
        verify = mid.verify_token(body.token)
    except:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if (not verify):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    result = ss.add_residential_building(x,y)
    return result

@router.put("/{id}/{x}/{y}")
def edit_residential_building(id: int, x: float, y: float, body: Verification_Request):

    try:
        verify = mid.verify_token(body.token)
    except:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if (not verify):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    result = ss.edit_residential_building(id, x, y)
    return result

@router.delete("/{id}")
def delete_residential_building(id: int, body: Verification_Request):

    try:
        verify = mid.verify_token(body.token)
    except:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if (not verify):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    result = ss.delete_residential_building(id)
    return result


