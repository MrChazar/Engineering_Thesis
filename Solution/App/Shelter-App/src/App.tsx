import { useState } from "react";
import "../src/App.css"
import Map from "./components/map";
import {type PointType, type AllocationPoint, type ShelterAllocationResponse, type ShelterAllocationRequest } from "./types/ShelterTypes"
import { apiService } from "./Api";


function App() {
  
  const [form, setForm] = useState({
    model: "",
    budget: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<ShelterAllocationResponse | any>();

  async function FormSubmit(e: React.FormEvent) 
  {
    e.preventDefault();

    if (loading) {
      setError("Model nie skończył przetwarzać poprzedniego zapytania");
      return;
    }

    setLoading(true);
    setAllocations("");
    setError(null);

    try {
      if (!form.budget) {
        throw new Error("Proszę wypełnić wszystkie pola");
      }

      if(loading) {
        throw new Error("Model nie skończył przetwarzać poprzedniego zapytania")
      }

      const request: ShelterAllocationRequest = {
        budget: parseFloat(form.budget)
      };

      const response = await apiService.getShelterAllocations(request);
      debugger
      setAllocations({
        points: response.points,
        objective: response.objective,
      used_budget: response.used_budget
      });
      
      console.log("Otrzymane alokacje:", allocations);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd");
      console.error("Błąd podczas pobierania danych:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-black text-primary font-bold px-6 py-4">
        Shelter App
      </header>

      <main className="flex flex-1 gap-4 p-6">
        <section className="flex-1 bg-primary rounded-2xl p-6 flex flex-col">
          <h2 className="text-center font-bold text-black mb-6">Parametry Procesu</h2>
          <form className="flex flex-col gap-4 flex-1" onSubmit={e => FormSubmit(e)}>

            <input
              type="number"
              placeholder="Budżet (mln)"
              className="rounded-full px-4 py-2 text-center text-gray-600 bg-white"
              value={form.budget}
              onChange={(e) => setForm({ ...form, budget: e.target.value })}
            />

            <button
              type="submit"
              className="mt-auto rounded-full bg-black text-primary py-2 font-bold"
            >
              Generuj
            </button>
          </form>
          {error ?
            <p className="text-red-600">{error}</p>
            : <></>
          }
        </section>

        <section className="flex-[2] bg-primary rounded-2xl p-6">
          <h2 className="text-center text-black font-bold mb-6">Wizualizacja</h2>

          {allocations?.objective && allocations.used_budget && allocations.points ?
          <>
            <div className="w-full h-[400px] rounded-xl overflow-hidden relative">
              <Map data={allocations}></Map>
            </div>
            <h1 className="text-black  font-bold m-2">Wartość funkcji celu: {allocations.objective}</h1>
            <h1 className="text-black  font-bold m-2">Użyty budżet: {allocations.used_budget}</h1>
          </> :
          <></>
          }

          {loading ? 
          <h2 className="text-red-600">Ładowanie...</h2>
          : <></>
          }

          
          
        </section>
      </main>
      <footer className="bg-black text-primary text-center font-bold min-h">
        <h1>Wykonał: Jakub Wieśniak</h1>
      </footer>
    </div>
  );
}

export default App;
