import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

export type AuthUser = {
    email: string;
    name: string;
    avatar?: string | null;
};

interface AuthContextType {
    isAuthenticated: boolean;
    user: AuthUser | null;
    login: (email: string, name: string, avatar?: string | null) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
      fetch("/api/me/", {
        credentials: "include",
      })
        .then(res => {
          if (!res.ok) throw new Error();
          return res.json();
        })
        .then((data: Record<string, unknown>) => {
          setIsAuthenticated(true);
          const email = String(data.email || "");
          const nameFromApi = String(data.name || "").trim();
          const fromParts = [data.first_name, data.last_name]
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .join(" ")
            .trim();
          const name =
            nameFromApi ||
            fromParts ||
            String(data.username || "").trim() ||
            (email ? email.split("@")[0] : "");
          setUser({
            email,
            name,
            avatar: typeof data.avatar === "string" ? data.avatar : null,
          });
        })
        .catch(() => {
          setIsAuthenticated(false);
          setUser(null);
        });
    }, []);

    const login = (email: string, name: string, avatar?: string | null) => {
        const userData: AuthUser = { email, name, avatar: avatar ?? null };
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
