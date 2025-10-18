import { useState, useEffect, useRef } from "react";
import { apiService } from "../../src/Api";
import "../../src/App.css";

function Header() {
  const [isLogged, setIsLogged] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const verifyUser = async () => {
      const token = sessionStorage.getItem("token");

      if (token) {
        try {
          const response = await apiService.verify(token);
          if (response.valid) {
            setIsLogged(true);
          } else {
            setIsLogged(false);
          }
        } catch (err) {
          console.error("Błąd weryfikacji:", err);
          setIsLogged(false);
        }
      } else {
        setIsLogged(false);
      }
    };

    verifyUser();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    setIsLogged(false);
    setMenuOpen(false);
    window.location.href = "/";
  };

  return (
    <header className="bg-black text-primary justify-between font-bold px-6 py-4 flex items-center relative">
      <div className="flex flex-row items-center gap-6">
        <a href="/" className="flex items-center gap-3">
          <img
            src="/icons/app_logo.png"
            alt="Shelter App Logo"
            className="w-7 h-7"
          />
          <h1 className="text-xl font-bold tracking-wide">Shelter App</h1>
        </a>

        {isLogged && (
          <>
            <a href="/App" className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-wide">Model</h1>
            </a>
            <a href="/Instruction" className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-wide">Instrukcja</h1>
            </a>
          </>
        )}
      </div>
     
      <div className="relative" ref={menuRef}>
        <img
          src="/icons/user.png"
          alt="User Icon"
          className="w-7 h-7 cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
        />

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-white text-black rounded-lg shadow-lg flex flex-col z-10">
            {!isLogged ? (
              <>
                <a href="/Login" className="px-4  rounded-lg  py-2 hover:bg-gray-200">Zaloguj się</a>
                <a href="/Register" className="px-4  rounded-lg  py-2 hover:bg-gray-200">Zarejestruj się</a>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-left hover:bg-gray-200 w-full"
              >
                Wyloguj się
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;