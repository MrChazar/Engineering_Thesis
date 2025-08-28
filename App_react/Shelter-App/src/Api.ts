export interface ShelterAllocationRequest {
  model: string;
  budget: number;
}

export interface ShelterAllocationResponse {
  allocations: any[];
  total_cost: number;
}

export const apiService = {
  async getShelterAllocations(params: ShelterAllocationRequest): Promise<ShelterAllocationResponse> {
    const queryParams = new URLSearchParams({
      model: params.model,
      budget: params.budget.toString()
    });

    const response = await fetch(`http://localhost:8000/shelter-allocations?${queryParams}`);
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