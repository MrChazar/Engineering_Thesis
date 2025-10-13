import { useState } from "react";
import { apiService } from "../../src/Api";
import "../../src/App.css";
import Header from "../components/Header";

function Login() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!login.trim() || !password.trim()) {
      setError("Uzupełnij wszystkie pola.");
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.login({ login, password });
      if (response.success) {
        alert("Zalogowano pomyślnie.");
        sessionStorage.setItem("isLogged", "true");
        window.location.href = "/app";
      } else {
        setError("Nieprawidłowy login lub hasło.");
      }
    } catch (err) {
      setError("Błąd logowania. Spróbuj ponownie.");
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
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    placeholder="Login"
                    className="rounded-full py-2 text-center text-gray-600 bg-white"
                    />

                    <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Hasło"
                    className="rounded-full py-2 text-center text-gray-600 bg-white"
                    />

                    {error && <p className="text-red-600 text-center">{error}</p>}

                    <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 rounded-full bg-black text-primary py-2 font-bold disabled:opacity-60"
                    >
                    {loading ? "Logowanie..." : "Zaloguj"}
                    </button>

                    <a href="Register" className="text-center underline text-black">
                    Nie masz konta? Zarejestruj się!
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

export default Login;
