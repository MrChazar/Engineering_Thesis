import { useEffect, useState } from "react";
import "../../src/App.css"
import Header from "../components/Header";

function Home() {

    return(
        <div className="min-h-screen bg-white flex flex-col">
            <Header />

            <main className="flex flex-1 gap-4 p-6">
                <section className="flex-1 bg-primary rounded-2xl p-6 flex flex-col">
                    Jedyna taka aplikacja do pomocy w alokacji schronów skorzystaj z ShelterApp aby
                    wspomóc się w zadaniu alokacji schronów.
                    Co ta aplikacja oferuje ?
                    - mapę do wizualizacji schronów
                    - model optymalizacyjny do optymalnego doboru punktów
                    - możliwość dodawania nowych puntków
                </section>
                <section className="flex-1 bg-primary rounded-2xl p-6 flex flex-col">
                    <img src="shelter"></img>
                </section>
            </main>
            <footer className="bg-black text-primary text-center font-bold py-2 mt-auto shadow-inner border-t border-gray-700">
                <p>Wykonał: Jakub Wieśniak</p>
            </footer>
        </div>
    );
}

export default Home;