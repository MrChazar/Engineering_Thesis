import { useEffect, useState } from "react";
import "../src/App.css"
import Map from "./components/Map";
import {type PointType, type AllocationPoint, type ShelterAllocationResponse, type ShelterAllocationRequest } from "./types/ShelterTypes"
import { apiService } from "./Api";
import Header from "./components/Header";
import NotAvailible from "./components/NotAvailible";


function App() {
  
  // states for handling data
  const [form, setForm] = useState({
    model: "",
    budget: "",
    allowedDistance: "",
    averagePersonPerBuilding: ""
  });

  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>("Ładowanie");
  const [error, setError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<ShelterAllocationResponse | any>();

  useEffect(() => {
    if(!loading)
    {
      document.title = "Shelter App - Model"
    }
    else
    {
      document.title = "Shelter App - Model Ładowanie..."
    }
  })

  // for loading animation
  useEffect(() => {
    if(!loading){
      return
    }

    const texts = ["Ładowanie", "Ładowanie.", "Ładowanie..", "Ładowanie..."];
    let index = 0;

    const interval = setInterval(() => {
      index = (index + 1) % texts.length;
      setLoadingText(texts[index]);
    }, 2000);
  })

  async function FormSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (loading) {
      const errorMsg = "Model nie skończył przetwarzać poprzedniego zapytania";
      setError(errorMsg);
      console.error("Błędy:", [errorMsg]);
      return;
    }

    setLoading(true);
    setAllocations("");
    setError(null);
    
    const errors: string[] = [];
    let success = false;

    try {
      if (!form.budget || form.model == "") errors.push("Proszę wypełnić wszystkie pola");
      if (form.averagePersonPerBuilding && Number(form.averagePersonPerBuilding) <= 0) errors.push("Średnia liczba osób nie może być mniejsza/równa zero");
      if (form.allowedDistance && Number(form.allowedDistance) <= 0) errors.push("Maksymalna odległość nie może być mniejsza/równa zero");
      if (form.budget && Number(form.budget) < 0) errors.push("Budżet nie może być mniejszy od zera");

      if (errors.length > 0) {
        throw new Error(errors.join(" | "));
      }

      // Request
      const request: ShelterAllocationRequest = {
        budget: parseFloat(form.budget),
        model: form.model,
        allowedDistance: parseFloat(form.allowedDistance),
        averagePersonPerBuilding: parseInt(form.averagePersonPerBuilding)
      };

      const response = await apiService.getShelterAllocations(request);
      setAllocations({
        points: response.points,
        objective: response.objective,
        used_budget: response.used_budget,
        time: response.time
      });
      
      success = true;
      
    } catch (err) {
      console.error("BŁĘDY:", errors.length > 0 ? errors : ["Błąd API"]);
      setError(err instanceof Error ? err.message : "Wystąpił nieznany błąd");
    } finally {
      if (errors.length > 0) {
        console.log(errors);
      }
      setLoading(false);
    }
  }

  return (
    <NotAvailible>
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        <Header />
        <main className="flex flex-1 p-4 gap-4 overflow-hidden">
          <section className="w-1/3 bg-primary rounded-2xl p-6 flex flex-col justify-between shadow-md">
            <div>
              <h1 className="text-center text-2xl font-extrabold text-black mb-6 tracking-wide">
              Parametry Procesu
              </h1>
              <form className="flex flex-col gap-4" onSubmit={FormSubmit}>
                <input
                  type="number"
                  placeholder="Budżet (mln)"
                  className="rounded-full px-4 py-2 text-center text-gray-700 bg-white"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  min={0}
                  max={1000}
                  step={0.1}
                />

                <input
                  type="number"
                  placeholder="Maksymalna odległość (km)"
                  className="rounded-full px-4 py-2 text-center text-gray-700 bg-white"
                  value={form.allowedDistance}
                  onChange={(e) => setForm({ ...form, allowedDistance: e.target.value })}
                  min={0.1}
                  max={1000}
                  step={0.1}
                />

                <input
                  type="number"
                  placeholder="Średnia liczba osób (os)"
                  className="rounded-full px-4 py-2 text-center text-gray-700 bg-white"
                  value={form.averagePersonPerBuilding}
                  onChange={(e) => setForm({ ...form, averagePersonPerBuilding: e.target.value })}
                  min={1}
                  max={1000}
                  step={1}
                />

                <select
                  className="rounded-full px-4 py-2 text-center text-gray-700 bg-white"
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                >
                  <option value="">Wybierz model</option>
                  <option value="GNN">GNN</option>
                  <option value="GUROBI">GUROBI</option>
                </select>

                <button
                  type="submit"
                  className="mt-4 rounded-full bg-black text-primary py-2 font-bold transition hover:bg-gray-800"
                >
                  Generuj
                </button>
              </form>
              {error && <p className="text-red-600 mt-3 text-center">{error}</p>}
            </div>
            {loading && <p className="text-center text-gray-700 mt-4">{loadingText}</p>}
          </section>

          <section className="flex-1 bg-primary rounded-2xl p-4 flex flex-col shadow-md overflow-hidden">
            <h1 className="text-center text-2xl font-extrabold text-black mb-3 tracking-wide">
              Wizualizacja
            </h1>

            <div className="flex-1 rounded-xl overflow-hidden">
              {allocations?.points ? (
                <Map data={allocations} />
              ) : (
                <></>
              )}
            </div>

            {allocations?.objective && (
              <div className="bg-white rounded-2xl shadow-md m-2 p-4">
                <h2 className="text-gray-800 font-semibold text-lg mb-2">Wyniki optymalizacji</h2>
                <p className="text-gray-700 text-base">
                  <span className="font-bold text-black">Wartość funkcji celu:</span> {allocations.objective.toFixed(2)}
                </p>
                <p className="text-gray-700 text-base">
                  <span className="font-bold text-black">Użyty budżet:</span> {(allocations.used_budget*1000000).toLocaleString()} zł
                </p>
                <p className="text-gray-700 text-base">
                  <span className="font-bold text-black">Proces zajął:</span> {(allocations.time).toLocaleString()} minut
                </p>
              </div>
            )}
          </section>
        </main>
        <footer className="bg-black text-primary text-center font-bold py-2">
          <p>Wykonał: Jakub Wieśniak</p>
        </footer>
      </div>
    </NotAvailible>
  );
}

export default App;
