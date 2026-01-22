import { createContext, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");

  const value = useMemo(() => ({
    token,
    isAuthed: Boolean(token),
    login: (t) => {
      setToken(t);
      localStorage.setItem("token", t);
    },
    logout: () => {
      setToken("");
      localStorage.removeItem("token");
    },
  }), [token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
