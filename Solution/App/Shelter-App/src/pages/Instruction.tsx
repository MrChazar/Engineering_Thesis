import React from "react";
import Header from "../components/Header";
import NotAvailible from "../components/NotAvailible";

function Instruction() {
  return (
    <NotAvailible>
    <div className="min-h-screen bg-secondary flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-start gap-10 p-10">
            <section className="max-w-5xl bg-primary rounded-2xl shadow-lg p-8 flex flex-col gap-6">
                <h1 className="text-4xl font-bold text-gray-900">
                    Instrukcja obsługi aplikacji ShelterApp
                </h1>
                <h2 className="text-2xl font-semibold text-gray-900 mt-6">
                    Instrukcja będzie tłumaczyć jak korzystać ze strony model zawierający całą funkcjonalność aplikacji.
                </h2>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li><b>Wizualizacja</b> – pozwala na wizualizację oraz modyfikację punktów na mapie.</li>
                    <li><b>Parametry Procesu</b> – umożliwia uruchomienie algorytmu lokalizacji schronów.</li>
                    <li><b>Statystyki</b> – prezentuje wyniki obliczeń i wykorzystanie zasobów.</li>
                </ul>

                <h2 className="text-2xl font-semibold text-gray-900 mt-6">
                    Parametry Procesu
                </h2>
                <p className="text-gray-700 leading-relaxed">
                    W formularzu parametrów procesu użytkownik definiuje parametry problemu. Po ich
                    ustawieniu i kliknięciu przycisku <b>"Generuj"</b> aplikacja rozwiąże problem i wyświetli w sekcji wizualizacja oraz statystyki 
                    informacje.
                </p>

                <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li><b>Budżet (mln)</b> – maksymalna kwota, jaką można przeznaczyć na budowę nowych schronów.</li>
                    <li><b>Maksymalna odległość (km)</b> – maksymalna odległość z której będzie mógł zostać przypisany obiekt mieszkalny.</li>
                    <li><b>Średnia liczba osób na budynek (os)</b> – używana do szacowania zapotrzebowania.</li>
                </ul>

                <p className="text-gray-700 leading-relaxed mt-2">
                    Po uruchomieniu optymalizacji pojawi się komunikat <b>„Ładowanie…”</b>.
                    Gdy proces się zakończy, tytuł karty w przeglądarce zmieni się usuwając słowo ładowanie, a mapa zaktualizuje wyniki.
                </p>

                <h2 className="text-2xl font-semibold text-gray-900 mt-6">
                    Wizualizacja
                </h2>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li><b>Budynki mieszkalne</b> – źródła zapotrzebowania (domy, bloki).</li>
                    <li><b>Istniejące schrony</b> – punkty już obecne w bazie.</li>
                    <li><b>Potencjalne nowe schrony</b> – lokalizacje, które mogą zostać wybrane przez model.</li>
                </ul>

                <p className="text-gray-700 mt-2">
                    Kliknięcie punktu na mapie pokazuje jego szczegóły (ID, pojemność, koszt, typ).
                    Dane aktualizują się po każdej optymalizacji lub edycji punktu.
                </p>

                <h2 className="text-2xl font-semibold text-gray-900 mt-6">
                    Dodawanie nowych punktów
                </h2>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Kliknij przycisk <b>„Dodaj punkt”</b> na mapie.</li>
                    <li>Wybierz typ: <b>budynek</b> lub <b>schron</b>.</li>
                    <li>Wprowadź współrzędne, pojemność, koszt (jeśli dotyczy).</li>
                    <li>Zatwierdź — punkt zostanie zapisany w bazie danych i pojawi się na mapie.</li>
                </ul>

                <h2 className="text-2xl font-semibold text-gray-900 mt-6">
                    Statystyki
                </h2>
                <p className="text-gray-700 leading-relaxed">
                    Po zakończeniu optymalizacji wyświetlone zostaną kluczowe statystyki:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-2">
                    <li>Całkowity koszt realizacji projektu</li>
                    <li>Liczba zbudowanych schronów</li>
                    <li>Średnia odległość mieszkańców od najbliższego schronu</li>
                    <li>Stopień wykorzystania pojemności</li>
                </ul>
            </section>
        </main>
        <footer className="bg-black text-primary text-center font-bold py-2">
          <p>Wykonał: Jakub Wieśniak</p>
        </footer>
    </div>
    </NotAvailible>
  );
}

export default Instruction;
