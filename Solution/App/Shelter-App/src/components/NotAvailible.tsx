import React from "react";
import { useEffect, useState } from "react";
import { apiService } from "../Api";

interface ProtectedNotAvailibleProps {
  children: React.ReactNode;
}

const NotAvailible: React.FC<ProtectedNotAvailibleProps> = ({ children }) => {

  const [isLogged, setIsLogged] = useState<boolean>(true);
  
  useEffect(() => {
    const verifyUser = async () => {
      let token = sessionStorage.getItem("token");
      const refreshToken = sessionStorage.getItem("refresh_token");

      if (!token && refreshToken) {
        try {
          const newToken = await apiService.refresh(refreshToken);
          sessionStorage.setItem("token", newToken.access_token);
          token = newToken.access_token;
        } catch (err) {
          console.error("Błąd odświeżania:", err);
        }
      }

      if (token) {
        try {
          const response = await apiService.verify(token);
          setIsLogged(response.valid);
        } catch {
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
