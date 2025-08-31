from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import shelter_controller as sc

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

app.include_router(sc.router)

@app.get("/")
def read_root():
    return {"message": "Api działa"}

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)

