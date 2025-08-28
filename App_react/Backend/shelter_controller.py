from typing import Union

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import shelter_service as ss
import uvicorn

app = FastAPI(
    title="Shelter Allocation API",
    description="API do alokacji schronów",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/shelter-allocations")
def shelter_allocations(budget: float):
    print(f"Parametry: {budget}")
    allocations = ss.get_shelter_allocation(budget)
    return allocations


@app.get("/shelters")
def shelters(item_id: int, q: Union[str, None] = None):
    return ss.get_shelter()


