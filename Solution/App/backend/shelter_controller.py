from fastapi import APIRouter
import gnn_model as gnn

router = APIRouter(prefix="/shelter", tags=["shelters"])

@router.get("/allocations/{budget}")
def shelter_allocations(budget: float):
    print(f"Parametry: {budget}")
    result = gnn.get_shelter_allocation(budget)
    return result



