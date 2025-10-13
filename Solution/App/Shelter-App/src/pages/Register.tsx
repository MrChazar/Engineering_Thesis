import { useState } from "react";
import { apiService } from "../../src/Api";
import "../../src/App.css";
import Header from "../components/Header";

function Register() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !surname.trim() || !email.trim() || !password.trim()) {
      setError("Uzupełnij wszystkie pola.");
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.register({ name, surname, email, password });
      if (response.success) {
        alert("Rejestracja zakończona pomyślnie.");
        window.location.href = "/Login";
      } else {
        setError("Nie udało się zarejestrować. Spróbuj ponownie.");
      }
    } catch (err) {
      setError("Błąd rejestracji. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
        <Header />

        <main className="flex flex-1 gap-4 p-6">
            <section className="flex-1 bg-primary rounded-2xl p-6 flex flex-col items-center justify-center">
                <form className="flex flex-col gap-4 w-full max-w-sm" onSubmit={handleSubmit}>
                    <input
                    type="text"
                    placeholder="Imię"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-full py-2 text-center text-gray-600 bg-white"
                    />

                    <input
                    type="text"
                    placeholder="Nazwisko"
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    className="rounded-full py-2 text-center text-gray-600 bg-white"
                    />

                    <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-full py-2 text-center text-gray-600 bg-white"
                    />

                    <input
                    type="password"
                    placeholder="Hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="rounded-full py-2 text-center text-gray-600 bg-white"
                    />

                    {error && <p className="text-red-600 text-center">{error}</p>}

                    <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 rounded-full bg-black text-primary py-2 font-bold disabled:opacity-60"
                    >
                    {loading ? "Rejestrowanie..." : "Rejestruj"}
                    </button>

                    <a href="Login" className="text-center underline text-black">
                    Masz już konto? Zaloguj się!
                    </a>
                </form>
            </section>
        </main>

      <footer className="bg-black text-primary text-center font-bold py-2 mt-auto shadow-inner border-t border-gray-700">
        <p>Wykonał: Jakub Wieśniak</p>
      </footer>
    </div>
  );
}

export default Register;
