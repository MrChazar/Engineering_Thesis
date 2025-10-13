import React from "react";

interface ProtectedNotFoundProps {
  children: React.ReactNode;
}

const NotFound: React.FC<ProtectedNotFoundProps> = ({ children }) => {
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

export default NotFound;
