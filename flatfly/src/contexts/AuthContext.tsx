import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";

export type AuthUser = {
    email: string;
    name: string;
    avatar?: string | null;
    username?: string;
};

interface AuthContextType {
    isAuthenticated: boolean;
    user: AuthUser | null;
    login: (email: string, name: string, avatar?: string | null) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeAvatar(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const t = raw.trim();
    return t.length > 0 ? t : null;
}

function userFromMePayload(data: Record<string, unknown>): AuthUser {
    const email = String(data.email ?? "").trim();
    const nameFromApi = String(data.name ?? "").trim();
    const fromParts = [data.first_name, data.last_name]
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
        .join(" ")
        .trim();
    const username = String(data.username ?? "").trim();
    const name =
        nameFromApi ||
        fromParts ||
        username ||
        (email ? email.split("@")[0] : "");
    return {
        email,
        name,
        username: username || undefined,
        avatar: normalizeAvatar(data.avatar),
    };
}

function normalizeLoginUser(email: string, name: string, avatar?: string | null): AuthUser {
    const e = String(email ?? "").trim();
    const n = String(name ?? "").trim() || (e ? e.split("@")[0] : "");
    return {
        email: e,
        name: n,
        avatar: normalizeAvatar(avatar ?? null),
    };
}

function readStoredUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = localStorage.getItem("user");
        if (!raw) return null;
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object") return null;
        const o = parsed as Record<string, unknown>;
        return normalizeLoginUser(
            String(o.email ?? ""),
            String(o.name ?? ""),
            typeof o.avatar === "string" ? o.avatar : null
        );
    } catch {
        return null;
    }
}

function readInitialAuth(): { authenticated: boolean; user: AuthUser | null } {
    if (typeof window === "undefined") return { authenticated: false, user: null };
    if (localStorage.getItem("isAuthenticated") !== "true") {
        return { authenticated: false, user: null };
    }
    return { authenticated: true, user: readStoredUser() };
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const initial = readInitialAuth();
    const [isAuthenticated, setIsAuthenticated] = useState(initial.authenticated);
    const [user, setUser] = useState<AuthUser | null>(initial.user);

    const persistUser = (u: AuthUser) => {
        if (typeof window === "undefined") return;
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("user", JSON.stringify(u));
    };

    const refreshUser = useCallback(async () => {
        const res = await fetch("/api/me/", {
            credentials: "include",
        });

        if (res.status === 401) {
            setIsAuthenticated(false);
            setUser(null);
            if (typeof window !== "undefined") {
                localStorage.removeItem("isAuthenticated");
                localStorage.removeItem("user");
            }
            return;
        }

        if (!res.ok) {
            return;
        }

        const data = (await res.json()) as Record<string, unknown>;
        const next = userFromMePayload(data);
        setIsAuthenticated(true);
        setUser(next);
        persistUser(next);
    }, []);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                await refreshUser();
            } catch (e) {
                if (cancelled || (e instanceof Error && e.name === "AbortError")) return;
                // Сеть: оставляем оптимистичное состояние из localStorage, если оно есть
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [refreshUser]);

    useEffect(() => {
        const onFocus = () => {
            void refreshUser();
        };
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [refreshUser]);

    const login = (email: string, name: string, avatar?: string | null) => {
        const userData = normalizeLoginUser(email, name, avatar);
        setIsAuthenticated(true);
        setUser(userData);
        persistUser(userData);
        void refreshUser();
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
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout, refreshUser }}>
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
