from fastapi import APIRouter
from Solution.App.backend.models import gnn_model as gnn, gurobi_model as gurobi

router = APIRouter(prefix="/shelter", tags=["shelters"])

@router.get("/allocations/{budget}/{model}")
def get_shelter_allocations(budget: float, model: str):
    print(f"Parametry: {budget} {model}")
    result = None
    if model == "GNN":
        result = gnn.get_shelter_allocation(budget)
    elif model == "GUROBI":
        result = gurobi.get_shelter_allocation(budget)
    return result





