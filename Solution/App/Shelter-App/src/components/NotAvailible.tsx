import React from "react";
import { useEffect, useState } from "react";
import { apiService } from "../Api";

interface ProtectedNotAvailibleProps {
  children: React.ReactNode;
}

const NotAvailible: React.FC<ProtectedNotAvailibleProps> = ({ children }) => {

  const [isLogged, setIsLogged] = useState<boolean>(false);
  useEffect(() => {
      const verifyUser = async () => {
        debugger
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

  if (!isLogged) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-primary text-3xl font-bold">
        Nie znaleziono strony
      </div>
    );
  }

  return <>{children}</>;
};

export default NotAvailible;
