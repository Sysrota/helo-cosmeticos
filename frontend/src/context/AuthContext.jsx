import { createContext, useContext, useMemo, useState } from "react";

const STORAGE_KEY = "auth_token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || "");

  const value = useMemo(
    () => ({
      token,
      isAuthed: Boolean(token),
      login: (t) => {
        setToken(t);
        localStorage.setItem(STORAGE_KEY, t);
      },
      logout: () => {
        setToken("");
        localStorage.removeItem(STORAGE_KEY);
      },
    }),
    [token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
