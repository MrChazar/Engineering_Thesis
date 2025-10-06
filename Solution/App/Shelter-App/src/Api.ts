import {
  type PointType,
  type AllocationPoint,
  type ShelterAllocationResponse,
  type ShelterAllocationRequest,
  type AddShelterRequest,
  type AddShelterResponse,
  type AddResidentialBuildingRequest,
  type AddResidentialBuildingResponse,
  type EditResidentialBuildingRequest,
  type EditShelterRequest
} from "./types/ShelterTypes";

export const apiService = {
  async getShelterAllocations(params: ShelterAllocationRequest): Promise<ShelterAllocationResponse> {
    const response = await fetch(`http://localhost:8000/allocations/${params.budget}/${params.allowedDistance}/${params.model}`);
    window.console.log(response);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  async addShelter(params: AddShelterRequest): Promise<AddShelterResponse> {

    const response = await fetch(
      `http://localhost:8000/shelters/${params.x}/${params.y}/${params.capacity}/${params.cost}`, { method: "POST"}
    );

    if (!response.ok) {
      throw new Error("Błąd dodawania schronu");
    }
    return response.json();
  },

  async addResidentalBuilding(params: AddResidentialBuildingRequest): Promise<AddResidentialBuildingResponse> {
    
    const response = await fetch(
      `http://localhost:8000/residential_buildings/${params.x}/${params.y}`, { method: "POST"}
    );

    if (!response.ok) {
      throw new Error("Błąd dodawania budynku mieszkalnego");
    }

    return response.json();
  },

  async editShelter(params: EditShelterRequest): Promise<{ status: string }> {
    const response = await fetch(
      `http://localhost:8000/shelters/${params.id}/${params.x}/${params.y}/${params.capacity}/${params.cost}`,
      { method: "PUT" }
    );
    if (!response.ok) throw new Error("Błąd edycji schronu");
    return response.json();
  },

  async deleteShelter(id: number): Promise<{ status: string }> {
    const response = await fetch(
      `http://localhost:8000/shelters/${id}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error("Błąd usuwania schronu");
    return response.json();
  },

  async editResidentialBuilding(params: EditResidentialBuildingRequest): Promise<{ status: string }> {
    const response = await fetch(
      `http://localhost:8000/residential_buildings/${params.id}/${params.x}/${params.y}`,
      { method: "PUT" }
    );
    if (!response.ok) throw new Error("Błąd edycji budynku mieszkalnego");
    return response.json();
  },

  async deleteResidentialBuilding(id: number): Promise<{ status: string }> {
    const response = await fetch(
      `http://localhost:8000/residential_buildings/${id}`,
      { method: "DELETE" }
    );
    if (!response.ok) throw new Error("Błąd usuwania budynku mieszkalnego");
    return response.json();
  }

};