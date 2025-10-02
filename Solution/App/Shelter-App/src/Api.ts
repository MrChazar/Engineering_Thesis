import {type PointType, type AllocationPoint,
   type ShelterAllocationResponse, type ShelterAllocationRequest,
  type AddShelterRequest, type AddShelterResponse,
  type AddResidentalBuildingRequest,type AddResidentalBuildingResponse  } from "./types/ShelterTypes"

export const apiService = {
  async getShelterAllocations(params: ShelterAllocationRequest): Promise<ShelterAllocationResponse> {

    const response = await fetch(`http://localhost:8000/shelter/allocations/${params.budget}/${params.allowedDistance}/${params.model}`);
    window.console.log(response);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  async addShelter(params: AddShelterRequest): Promise<AddShelterResponse> {

    const response = await fetch(
      `http://localhost:8000/shelter/new_shelter/${params.x}/${params.y}/${params.capacity}/${params.cost}`, { method: "POST"}
    );

    if (!response.ok) {
      throw new Error("Błąd dodawania schronu");
    }
    return response.json();
  },

  async addResidentalBuilding(params: AddResidentalBuildingRequest): Promise<AddResidentalBuildingResponse> {
    
    const response = await fetch(
      `http://localhost:8000/shelter/residental_building/${params.x}/${params.y}/`, { method: "POST"}
    );

    if (!response.ok) {
      throw new Error("Błąd dodawania budynku mieszkalnego");
    }

    return response.json();
  }
};