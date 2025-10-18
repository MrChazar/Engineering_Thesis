import React from "react";
import { useEffect } from "react";


function NotFound() 
{
    useEffect(() =>{
      document.title = "Shelter App - Not found";
    })
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-primary text-3xl font-bold">
        Nie znaleziono strony
      </div>
    );
};

export default NotFound;
