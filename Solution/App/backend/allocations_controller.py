from fastapi import APIRouter
from Solution.App.backend.models import gnn_model as gnn, gurobi_model as gurobi, shelter_service as ss

router = APIRouter(prefix="/allocations", tags=["allocations"])

@router.get("/{budget}/{allowedDistance}/{averagePersonPerBuilding}/{model}")
def get_shelter_allocations(budget: float, allowedDistance: float, averagePersonPerBuilding: int, model: str):
    print(f"Parametry: {budget} {allowedDistance} {averagePersonPerBuilding} {model}")
    result = None
    if model == "GNN":
        result = gnn.get_shelter_allocation(budget, allowedDistance, averagePersonPerBuilding)
    elif model == "GUROBI":
        result = gurobi.get_shelter_allocation(budget, allowedDistance, averagePersonPerBuilding)
    return result
