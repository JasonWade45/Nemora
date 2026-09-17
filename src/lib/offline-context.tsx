"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type OfflineContextType = {
  isOnline: boolean;
  isOffline: boolean;
};

const OfflineContext = createContext<OfflineContextType>({ isOnline: true, isOffline: false });

export function useOffline() {
  return useContext(OfflineContext);
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
      window.dispatchEvent(new Event("back-online"));
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline, isOffline: !isOnline }}>
      {children}
    </OfflineContext.Provider>
  );
}
