import React from "react";

interface ProtectedNotAvailibleProps {
  children: React.ReactNode;
}

const NotAvailible: React.FC<ProtectedNotAvailibleProps> = ({ children }) => {
  debugger
  const isLogged = sessionStorage.getItem("isLogged") === "true";

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
