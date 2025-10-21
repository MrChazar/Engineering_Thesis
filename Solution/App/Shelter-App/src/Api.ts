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
  type EditShelterRequest,
  type LoginRequest,
  type LoginResponse,
  type RegisterRequest,
  type RegisterResponse,
  type verifyResponse
} from "./types/ShelterTypes";

const token = sessionStorage.getItem("token");

export const apiService = {
  async getShelterAllocations(params: ShelterAllocationRequest): Promise<ShelterAllocationResponse> {
    const response = await fetch("http://localhost:8000/allocations/optimize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...params,
        token: token || "",
      }),
    });
    window.console.log(response);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  },

  async addShelter(params: AddShelterRequest): Promise<AddShelterResponse> {

    const response = await fetch(
      `http://localhost:8000/shelters/${params.x}/${params.y}/${params.capacity}/${params.cost}`, { 
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token || "",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Błąd dodawania schronu");
    }
    return response.json();
  },

  async addResidentialBuilding(params: AddResidentialBuildingRequest): Promise<AddResidentialBuildingResponse> {
    
    const response = await fetch(
      `http://localhost:8000/residential_buildings/${params.x}/${params.y}`, { 
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token || "",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Błąd dodawania budynku mieszkalnego");
    }

    return response.json();
  },

  async editShelter(params: EditShelterRequest): Promise<{ status: string }> {
    const response = await fetch(
      `http://localhost:8000/shelters/${params.id}/${params.x}/${params.y}/${params.capacity}/${params.cost}`,
      { 
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token || "",
        }), 
      }
    );
    if (!response.ok) throw new Error("Błąd edycji schronu");
    return response.json();
  },

  async deleteShelter(id: number): Promise<{ status: string }> {
    const response = await fetch(
      `http://localhost:8000/shelters/${id}`,
      { 
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token || "",
        }),
      }
    );
    if (!response.ok) throw new Error("Błąd usuwania schronu");
    return response.json();
  },

  async editResidentialBuilding(params: EditResidentialBuildingRequest): Promise<{ status: string }> {
    const response = await fetch(
      `http://localhost:8000/residential_buildings/${params.id}/${params.x}/${params.y}`,
      { 
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token || "",
        }),
      }
    );
    if (!response.ok) throw new Error("Błąd edycji budynku mieszkalnego");
    return response.json();
  },

  async deleteResidentialBuilding(id: number): Promise<{ status: string }> {
    const response = await fetch(
      `http://localhost:8000/residential_buildings/${id}`,
      { 
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token || "",
        }),
      }
    );
    if (!response.ok) throw new Error("Błąd usuwania budynku mieszkalnego");
    return response.json();
  },

  async login(params: LoginRequest): Promise<LoginResponse> {
    const response = await fetch("http://localhost:8000/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Błąd logowania");
    }

    return response.json();
  },

  async register(params: RegisterRequest): Promise<RegisterResponse> {
    const response = await fetch("http://localhost:8000/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error("Błąd rejestracji");
    }

    return response.json();
  },

  async verify(token: string): Promise<verifyResponse> {
    const response = await fetch("http://localhost:8000/users/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }), 
    });

    if (!response.ok) {
      throw new Error("Błąd weryfikacji");
    }

    return response.json();
  }

};