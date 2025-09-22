import {type PointType, type AllocationPoint, type ShelterAllocationResponse, type ShelterAllocationRequest } from "./types/ShelterTypes"

export const apiService = {
  async getShelterAllocations(params: ShelterAllocationRequest): Promise<ShelterAllocationResponse> {

    const response = await fetch(`http://localhost:8000/shelter/allocations/${params.budget}/${params.model}`);
    window.console.log(response);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  async getShelters(): Promise<any> {
    const response = await fetch('http://localhost:8000/shelters');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }
};