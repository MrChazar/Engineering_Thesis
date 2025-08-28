import { useState } from "react";
import "../src/App.css"
import Map from "./components/map";
import { apiService, type ShelterAllocationRequest } from "./Api";

function App() {
  
  const [form, setForm] = useState({
    model: "",
    budget: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<any[]>([]);

  async function FormSubmit(e: React.FormEvent) 
  {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!form.model || !form.budget) {
        throw new Error("Proszę wypełnić wszystkie pola");
      }

      const request: ShelterAllocationRequest = {
        budget: parseFloat(form.budget)
      };

      const response = await apiService.getShelterAllocations(request);
      setAllocations(response.allocations);
      
      console.log("Otrzymane alokacje:", response);
      
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
        </section>

        <section className="flex-[2] bg-primary rounded-2xl p-6">
          <h2 className="text-center text-black font-bold mb-6">Wizualizacja</h2>
          
        </section>
      </main>
      <footer className="bg-black text-primary text-center font-bold min-h">
        <h1>Wykonał: Jakub Wieśniak</h1>
      </footer>
    </div>
  );
}

export default App;
