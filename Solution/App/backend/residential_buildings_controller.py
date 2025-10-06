from fastapi import APIRouter
from Solution.App.backend.models import gnn_model as gnn, gurobi_model as gurobi, data_handler as dh

router = APIRouter(prefix="/residential_buildings", tags=["residential buildings"])


@router.post("/{x}/{y}")
def add_residential_building(x: float, y: float):
    result = dh.add_residential_building(x,y)
    return result

@router.put("/{id}/{x}/{y}")
def edit_residential_building(id: int, x: float, y: float):
    result = dh.edit_residential_building(id, x, y)
    return result

@router.delete("/{id}")
def delete_residential_building(id: int):
    result = dh.delete_residential_building(id)
    return result


