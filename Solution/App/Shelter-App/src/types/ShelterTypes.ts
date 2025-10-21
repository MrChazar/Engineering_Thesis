export type PointType = "apartment" | "built_shelter" | "potential_shelter";

export interface AllocationPoint {
  id: number;
  type: PointType;
  cost: number | null;
  assigned_to: number | null; 
  x: number; 
  y: number;
  capacity: number; 
}

export interface ShelterAllocationResponse {
  points: AllocationPoint[];
  objective: number;   
  used_budget: number;
  time: number;      
}

export interface ShelterAllocationRequest {
  budget: number;
  model: string;
  allowedDistance: number;
  averagePersonPerBuilding: number;
  token: string | null;
}

export interface AddShelterRequest {
  x: number;
  y: number;
  capacity: number;
  cost: number;
}

export interface AddResidentialBuildingRequest {
  x: number;
  y: number;
}

export interface AddShelterResponse {
  status: string;
}

export interface AddResidentialBuildingResponse {
  status: string;
}

export interface EditResidentialBuildingRequest {
  id: number;
  x: number;
  y: number;
}

export interface EditShelterRequest {
  id: number;
  x: number;
  y: number;
  capacity: number;
  cost: number;
}

export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterRequest {
  name: string;
  surname: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
}

export interface verifyResponse {
  valid: boolean;
}
