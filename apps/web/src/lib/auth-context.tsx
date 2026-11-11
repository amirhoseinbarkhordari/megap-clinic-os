"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { ApiError, throwResponseError } from "./api-error";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(
  /\/$/,
  "",
);
const SESSION_CHANNEL = "megap-session";

export type UserProfile = {
  displayName: string;
  email: string | null;
  phone: string | null;
  clinic: { name: string; timezone: string; currency: string };
  role: { name: string; key: string };
  permissions: string[];
};

type AuthStatus = "restoring" | "authenticated" | "anonymous";
type AuthContextValue = {
  status: AuthStatus;
  profile: UserProfile | null;
  restoreNotice: string | null;
  signIn: (identifier: string, password: string) => Promise<void>;
  signUp: (input: {
    clinicName: string;
    displayName: string;
    email?: string;
    phone?: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
};

type TokenResponse = { accessToken: string };
const AuthContext = createContext<AuthContextValue | null>(null);

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) return throwResponseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("restoring");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [restoreNotice, setRestoreNotice] = useState<string | null>(null);
  const accessToken = useRef<string | null>(null);
  const refreshTask = useRef<Promise<string | null> | null>(null);

  const updateToken = useCallback((token: string | null) => {
    accessToken.current = token;
  }, []);

  const refreshAccessToken = useCallback((): Promise<string | null> => {
    if (refreshTask.current) return refreshTask.current;
    const pending = (async () => {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (response.status === 401) {
        updateToken(null);
        return null;
      }
      const result = await responseJson<TokenResponse>(response);
      updateToken(result.accessToken);
      return result.accessToken;
    })();
    refreshTask.current = pending;
    void pending.then(
      () => {
        if (refreshTask.current === pending) refreshTask.current = null;
      },
      () => {
        if (refreshTask.current === pending) refreshTask.current = null;
      },
    );
    return pending;
  }, [updateToken]);

  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
      const send = (token: string | null) => {
        const headers = new Headers(init.headers);
        headers.set("Accept", "application/json");
        if (init.body && !headers.has("Content-Type"))
          headers.set("Content-Type", "application/json");
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
          ...init,
          headers,
          credentials: "include",
        });
      };

      let response = await send(accessToken.current);
      if (response.status === 401 && accessToken.current) {
        const token = await refreshAccessToken();
        if (!token) {
          setProfile(null);
          setStatus("anonymous");
          throw new ApiError(401, "نشست شما پایان یافته است. دوباره وارد شوید.");
        }
        response = await send(token);
      }
      if (response.status === 401) {
        setProfile(null);
        setStatus("anonymous");
      }
      return responseJson<T>(response);
    },
    [refreshAccessToken],
  );

  const acceptTokens = useCallback(
    async (response: Response) => {
      const result = await responseJson<TokenResponse>(response);
      updateToken(result.accessToken);
      const currentProfile = await request<UserProfile>("/auth/me");
      setProfile(currentProfile);
      setStatus("authenticated");
      setRestoreNotice(null);
    },
    [request, updateToken],
  );

  const signIn = useCallback(
    async (identifier: string, password: string) => {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      await acceptTokens(response);
    },
    [acceptTokens],
  );

  const signUp = useCallback(
    async (input: {
      clinicName: string;
      displayName: string;
      email?: string;
      phone?: string;
      password: string;
    }) => {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(input),
      });
      await acceptTokens(response);
    },
    [acceptTokens],
  );

  const signOut = useCallback(async () => {
    const response = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) await throwResponseError(response);
    updateToken(null);
    setProfile(null);
    setStatus("anonymous");
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(SESSION_CHANNEL);
      channel.postMessage({ type: "signed-out" });
      channel.close();
    }
  }, [updateToken]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await refreshAccessToken();
        if (!token) {
          if (active) setStatus("anonymous");
          return;
        }
        const currentProfile = await request<UserProfile>("/auth/me");
        if (active) {
          setProfile(currentProfile);
          setStatus("authenticated");
        }
      } catch {
        if (active) {
          updateToken(null);
          setStatus("anonymous");
          setRestoreNotice("بررسی نشست ممکن نشد. پیش‌نمایش همچنان در دسترس است.");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [refreshAccessToken, request, updateToken]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(SESSION_CHANNEL);
    channel.onmessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === "signed-out") {
        updateToken(null);
        setProfile(null);
        setStatus("anonymous");
      }
    };
    return () => channel.close();
  }, [updateToken]);

  return (
    <AuthContext.Provider
      value={{ status, profile, restoreNotice, signIn, signUp, signOut, request }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
