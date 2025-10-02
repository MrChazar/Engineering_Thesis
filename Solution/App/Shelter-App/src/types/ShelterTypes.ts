export type PointType = "apartment" | "built_shelter" | "potential_shelter";

export interface AllocationPoint {
  id: number;
  type: PointType;
  cost: number | null;
  assigned_to: number | null; 
  x: number; 
  y: number; 
}

export interface ShelterAllocationResponse {
  points: AllocationPoint[];
  objective: number;   
  used_budget: number;      
}

export interface ShelterAllocationRequest {
  budget: number;
  model: string;
  allowedDistance: number;
}

export interface AddShelterRequest {
  x: number;
  y: number;
  capacity: number;
  cost: number;
}

export interface AddResidentalBuildingRequest {
  x: number;
  y: number;
}

export interface AddShelterResponse {
  status: string;
}

export interface AddResidentalBuildingResponse {
  status: string;
}