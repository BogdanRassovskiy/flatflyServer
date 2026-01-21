import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

interface AuthContextType {
    isAuthenticated: boolean;
    user: { email: string; name: string } | null;
    login: (email: string, name: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<{ email: string; name: string } | null>(null);

    useEffect(() => {
      fetch("/api/me/", {
        credentials: "include",
      })
        .then(res => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then(data => {
          setIsAuthenticated(true);
          setUser(data);
        })
        .catch(() => {
          setIsAuthenticated(false);
          setUser(null);
        });
    }, []);

    const login = (email: string, name: string) => {
        const userData = { email, name };
        setIsAuthenticated(true);
        setUser(userData);
        
        if (typeof window !== "undefined") {
            localStorage.setItem("isAuthenticated", "true");
            localStorage.setItem("user", JSON.stringify(userData));
        }
    };

    const logout = async () => {
        await fetch("/api/logout/", {
            method: "POST",
            credentials: "include",
        });

        setIsAuthenticated(false);
        setUser(null);
        
        if (typeof window !== "undefined") {
            localStorage.removeItem("isAuthenticated");
            localStorage.removeItem("user");
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
