import { useNavigate } from "react-router-dom";
import "../../src/App.css";
import Header from "../components/Header";
import { useEffect } from "react";

function Home() {
  const navigate = useNavigate();

  useEffect(() =>{
    document.title = "Shelter App - Home";
  })

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex flex-1 flex-col lg:flex-row items-center  justify-between gap-8 p-10">
        <section className="flex-1 flex flex-col gap-6 bg-primary rounded-xl ">
          <h1 className="text-4xl m-1 font-bold text-gray-900">
            ShelterApp — Inteligentna alokacja schronów
          </h1>

          <p className="text-gray-700 m-1 text-lg leading-relaxed">
            ShelterApp to aplikacja wspomagająca planowanie i optymalizację
            rozmieszczenia schronów na terenie miasta. Wykorzystuje modele
            matematyczne i wizualizację danych, aby pomóc w podejmowaniu
            decyzji opartych na rzeczywistych danych przestrzennych.
          </p>

          <h2 className="text-2xl m-1 font-semibold mt-4 text-gray-900">
            Co oferuje aplikacja?
          </h2>

          <ul className="list-disc m-1 list-inside text-gray-700 space-y-2">
            <li>🗺️ Interaktywną mapę do wizualizacji schronów i budynków</li>
            <li>⚙️ Model optymalizacyjny dobierający lokalizacje schronów</li>
            <li>➕ Możliwość dodawania i edytowania punktów danych</li>
            <li>📊 Podgląd wyników i użytego budżetu</li>
          </ul>
          { sessionStorage.getItem("isLogged") === "false" ?  
          <button
            onClick={() => navigate("/register")}
            className="mt-8 m-2 bg-black text-white px-6 py-3 rounded-xl text-lg font-semibold hover:bg-gray-800 transition"
          >
            Zarejestruj się i zacznij już teraz →
          </button> : <></>
        }
         
        </section>

        <section className="flex-1 flex justify-center items-center">
          <img
              src="/screens/app_view.png"
                alt="Panel aplikacji ShelterApp"
                className="rounded-2xl shadow-lg border border-gray-200 object-cover"
          />

        </section>
      </main>

        <footer className="bg-black text-primary text-center font-bold py-2 mt-auto shadow-inner border-t border-gray-700">
            <p>Wykonał: Jakub Wieśniak</p>
        </footer>
    </div>
  );
}

export default Home;