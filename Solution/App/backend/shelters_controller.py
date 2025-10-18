from fastapi import APIRouter
from Solution.App.backend.models import gnn_model as gnn, gurobi_model as gurobi, shelter_service as ss

router = APIRouter(prefix="/shelters", tags=["shelters"])


@router.post("/{x}/{y}/{capacity}/{cost}")
def add_shelter(x: float, y: float, capacity: int, cost: float):
    result = ss.add_shelter(x,y,capacity,cost)
    return result

@router.put("/{id}/{x}/{y}/{capacity}/{cost}")
def edit_shelter(id: int, x: float, y: float, capacity: int, cost: float):
    result = ss.edit_shelter(id, x, y, capacity, cost)
    return result

@router.delete("/{id}")
def delete_shelter(id: int):
    result = ss.delete_shelter(id)
    return result


