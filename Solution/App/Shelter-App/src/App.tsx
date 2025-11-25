import { useEffect, useState, useRef } from "react";
import "../src/App.css"
import Map from "./components/Map";
import {type PointType, type AllocationPoint, type ShelterAllocationResponse, type ShelterAllocationRequest } from "./types/ShelterTypes"
import { apiService } from "./Api";
import Header from "./components/Header";
import NotAvailible from "./components/NotAvailible";


function App() {
  
  // states for handling data
  const [form, setForm] = useState({
    model: "GUROBI",
    budget: "",
    allowedDistance: "",
    averagePersonPerBuilding: "",
    weight_1: "0.33",
    weight_2: "0.33",
    weight_3: "0.33"
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>("Ładowanie");
  const [error, setError] = useState<string | null>(null);
  const [allocations, setAllocations] = useState<ShelterAllocationResponse | any>();
  const currentWeightsSum = (parseFloat(form.weight_1)||0) + (parseFloat(form.weight_2)||0) + (parseFloat(form.weight_3)||0);

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

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        setAllocations(json);
        alert("Konfiguracja została wczytana.");
      } catch (err) {
        alert("Błąd wczytywania pliku. Upewnij się, że to poprawny JSON.");
      }
    };
    reader.readAsText(file);
  };

  const handleWeightChange = (key: 'weight_1' | 'weight_2' | 'weight_3', value: string) => {
    let newVal = parseFloat(value);
    if (isNaN(newVal)) newVal = 0;

    const w1 = key === 'weight_1' ? 0 : parseFloat(form.weight_1) || 0;
    const w2 = key === 'weight_2' ? 0 : parseFloat(form.weight_2) || 0;
    const w3 = key === 'weight_3' ? 0 : parseFloat(form.weight_3) || 0;

    const currentSumOfOthers = w1 + w2 + w3;
    const maxAllowed = 1.0 - currentSumOfOthers;

    if (newVal > maxAllowed) {
      newVal = parseFloat(maxAllowed.toFixed(2));
      if (newVal < 0) newVal = 0;
    }

    setForm(prev => ({ ...prev, [key]: newVal.toString() }));
  };

  const handleSaveClick = () => {
    if (!allocations) return;
    const blob = new Blob([JSON.stringify(allocations, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "konfiguracja.json";
    link.click();

    URL.revokeObjectURL(url);
  };

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
      if(!form.weight_1 || !form.weight_2 || !form.weight_3)
      {
        errors.push("Nie wypełniono priorytetów")
      }

      if (errors.length > 0) {
        throw new Error(errors.join(" | "));
      }

      // Request
      const request: ShelterAllocationRequest = {
        budget: parseFloat(form.budget),
        model: form.model,
        allowedDistance: parseFloat(form.allowedDistance),
        averagePersonPerBuilding: parseInt(form.averagePersonPerBuilding),
        weight_1: parseFloat(form.weight_1),
        weight_2: parseFloat(form.weight_2),
        weight_3: parseFloat(form.weight_3),
      };

      const response = await apiService.getShelterAllocations(request);
      setAllocations({
        points: response.points,
        objective: response.objective,
        used_budget: response.used_budget,
        time: response.time,
        stats: response.stats
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
      <div className="min-h-screen flex flex-col bg-secondary overflow-y-auto">
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

                <div className="bg-white p-4 rounded-xl border border-gray-200 mt-2">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                        <span className="text-sm font-bold text-black uppercase">Priorytety</span>
                        <span className={`text-xs font-mono font-bold px-2 py-1 rounded ${currentWeightsSum > 1 ? 'bg-red-100 text-red-600' : 'bg-primary text-white'}`}>
                            SUMA: {currentWeightsSum.toFixed(2)}
                        </span>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-bold text-gray-800">BLISKOŚĆ SCHRONÓW</label>
                                <span className="text-xs font-mono text-gray-500 bg-white px-1 rounded border">{form.weight_1}</span>
                            </div>
                            <input
                            type="range"
                            className="w-full accent-black cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                            value={form.weight_1}
                            onChange={(e) => handleWeightChange('weight_1', e.target.value)}
                            min={0.01}
                            max={1}
                            step={0.01}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-bold text-gray-800">OSZCZĘDNOŚĆ BUDŻETU</label>
                                <span className="text-xs font-mono text-gray-500 bg-white px-1 rounded border">{form.weight_2}</span>
                            </div>
                            <input
                            type="range"
                            className="w-full accent-black cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                            value={form.weight_2}
                            onChange={(e) => handleWeightChange('weight_2', e.target.value)}
                            min={0.01}
                            max={1}
                            step={0.01}
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-bold text-gray-800">POWSZECHNOŚĆ DOSTĘPU</label>
                                <span className="text-xs font-mono text-gray-500 bg-white px-1 rounded border">{form.weight_3}</span>
                            </div>
                            <input
                            type="range"
                            className="w-full accent-black cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none"
                            value={form.weight_3}
                            onChange={(e) => handleWeightChange('weight_3', e.target.value)}
                            min={0.01}
                            max={1}
                            step={0.01}
                            />
                        </div>
                    </div>
                </div>
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

          <section className="flex-2 bg-primary rounded-2xl p-4 flex flex-col shadow-md overflow-hidden">
            <h1 className="text-center text-2xl font-extrabold text-black tracking-wide">
              Wizualizacja
            </h1>

            <div className="flex-2 min-h-[350px] max-h-[800px] rounded-xl overflow-hidden">
              {allocations?.points ? (
                <Map data={allocations} />
              ) : (
                <>
                  {loading==false ? (
                    <>
                      <button
                        onClick={handleLoadClick}
                        className="px-6 py-3 bg-black text-primary rounded-full font-bold hover:bg-gray-800 transition"
                      >
                        Wczytaj konfigurację
                      </button>
                      <input
                        type="file"
                        accept=".json"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileSelected} />
                    </>
                    ): (<></>)
                  }
                </>
              )}
            </div>

            {allocations?.objective && (
              <>
              <div className="mt-4 animate-fade-in-up">
                <div className="bg-white rounded-2xl grid grid-cols-2 gap-8 shadow-sm border border-gray-200 p-6">
                  <div>
                    <h2 className="text-gray-800 font-extrabold text-sm uppercase mb-4 border-b pb-2 tracking-wider">Parametry Wynikowe</h2>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-600 text-sm">Funkcja celu:</span> 
                            <span className="font-mono font-bold text-black text-lg">{allocations.objective.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-600 text-sm">Użyty budżet:</span> 
                            <span className="font-mono font-bold text-black text-lg">{(allocations.used_budget).toLocaleString()} mln zł</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-600 text-sm">Czas obliczeń:</span> 
                            <span className="font-mono font-bold text-black text-lg">{(allocations.time).toLocaleString()} min</span>
                        </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-between">
                    <div>
                        <h2 className="text-gray-800 font-extrabold text-sm uppercase mb-4 border-b pb-2 tracking-wider">Statystyki Kluczowe</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-sm">Pokrycie populacji:</span>
                                <div className="text-right">
                                    <span className="font-bold text-green-600 text-lg">{allocations.stats.percent_covered} %</span>
                                    <span className="text-xs text-gray-400 block">({allocations.stats.covered_population.toLocaleString()} os.)</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-sm">Średnia odległość do schronu:</span>
                                <span className="font-bold text-black">{allocations.stats.average_distance} km</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-sm">Wybudowane schrony:</span>
                                <span className="font-bold text-black">{allocations.stats.built_shelters}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-sm">Średni koszt budowy:</span>
                                <span className="font-bold text-black">{allocations.stats.average_cost_built*1000000} zł</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-sm">Procent zapełnienia schronów:</span>
                                <span className="font-bold text-green-600 text-lg">{allocations.stats.capacity_fill_percent} %</span>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleSaveClick} className="mt-4 bg-black text-primary py-3 px-6 rounded-full text-sm font-bold hover:bg-gray-800 transition shadow-lg flex items-center justify-center gap-2 w-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        ZAPISZ KONFIGURACJE
                    </button>
                  </div>
                </div> 
              </div> 
              </>
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
