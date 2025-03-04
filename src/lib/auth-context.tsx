"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  Suspense,
} from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

type User = {
  id: string;
  email: string;
  name?: string;
  image?: string;
  provider?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isGuest: boolean;
  signIn: (provider: string, email?: string) => Promise<void>;
  signOut: () => Promise<void>;
  initiateGoogleAuth: () => Promise<void>;
  handleGoogleCallback: (response: any) => Promise<void>;
  saveUserData: (data: any) => Promise<boolean>;
  loadUserData: () => Promise<any | null>;
  continueAsGuest: () => void;
};

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_REDIRECT_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/auth/google/callback`
    : "";

// Facebook OAuth configuration
const FACEBOOK_CLIENT_ID = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || "";
const FACEBOOK_REDIRECT_URI =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/auth/facebook/callback`
    : "";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create a separate component that uses navigation hooks
function AuthProviderContent({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Load Google SDK
  useEffect(() => {
    // Only load in browser environment
    if (typeof window === "undefined") return;

    // Skip if already loaded
    if (window.google) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Check if user is authenticated on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // In a real app, you would check for a session/token here
        const storedUser = localStorage.getItem("everwood_user");
        const isGuestMode =
          localStorage.getItem("everwood_guest_mode") === "true";

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else if (isGuestMode) {
          // Restore guest mode if it was active
          setIsGuest(true);
        }
      } catch (error) {
        console.error("Authentication error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Modified to not force redirect - make sign-in optional
  useEffect(() => {
    // Only redirect to sign-in page if not a guest and not authenticated
    // and only on protected routes that require sign-in
    if (
      !isLoading &&
      !user &&
      !isGuest &&
      pathname !== "/" &&
      pathname !== "/sign-in" &&
      !pathname.includes("/_") &&
      !pathname.includes("/auth/") &&
      // Check for any routes that should be accessible to all users
      !pathname.includes("/about") &&
      !pathname.includes("/contact")
    ) {
      // Check if there's a share parameter in the URL
      const regularShareData = searchParams.get("share");
      const shortShareData = searchParams.get("s");

      // If there's a share parameter, save it to redirect back after sign-in
      if (regularShareData || shortShareData) {
        const shareParam = regularShareData
          ? `share=${regularShareData}`
          : `s=${shortShareData}`;

        // Store the current URL to redirect back after sign-in
        localStorage.setItem(
          "everwood_redirect_after_signin",
          `${pathname}?${shareParam}`
        );
      }

      router.push("/sign-in");
    }
  }, [user, isLoading, isGuest, pathname, router, searchParams]);

  // Initialize Google One Tap
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.google ||
      user ||
      !GOOGLE_CLIENT_ID
    )
      return;

    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Display the One Tap UI if on sign-in page
      if (pathname === "/sign-in") {
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log("Google One Tap not displayed or skipped");
          }
        });
      }
    } catch (error) {
      console.error("Error initializing Google One Tap:", error);
    }
  }, [pathname, user]);

  // Function to continue as guest
  const continueAsGuest = () => {
    setIsGuest(true);
    setUser(null);
    localStorage.setItem("everwood_guest_mode", "true");

    // Check if there's a redirect URL saved
    const redirectUrl = localStorage.getItem("everwood_redirect_after_signin");

    if (redirectUrl) {
      localStorage.removeItem("everwood_redirect_after_signin");
      router.push(redirectUrl);
    } else {
      // Default redirect to order page
      router.push("/order");
    }
  };

  const initiateGoogleAuth = async () => {
    setIsLoading(true);

    try {
      // For traditional OAuth flow (not One Tap)
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
        GOOGLE_REDIRECT_URI
      )}&response_type=code&scope=email%20profile&prompt=select_account`;

      window.location.href = authUrl;
    } catch (error) {
      console.error("Google auth initiation error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  const handleGoogleCallback = async (response: any) => {
    setIsLoading(true);

    try {
      if (!response || !response.credential) {
        throw new Error("Invalid Google response");
      }

      // Decode the JWT token to get user info
      const payload = decodeJwtResponse(response.credential);

      if (!payload || !payload.email) {
        throw new Error("Invalid token payload");
      }

      const googleUser: User = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        image: payload.picture,
        provider: "google",
      };

      setUser(googleUser);
      setIsGuest(false); // Exit guest mode when signing in
      localStorage.removeItem("everwood_guest_mode"); // Remove guest mode flag
      localStorage.setItem("everwood_user", JSON.stringify(googleUser));

      // Check if there's a redirect URL saved
      const redirectUrl = localStorage.getItem(
        "everwood_redirect_after_signin"
      );

      if (redirectUrl) {
        localStorage.removeItem("everwood_redirect_after_signin");
        router.push(redirectUrl);
      } else if (pathname === "/sign-in") {
        // Default redirect to order page
        router.push("/order");
      }
    } catch (error) {
      console.error("Google callback error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to decode JWT token
  const decodeJwtResponse = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error("Error decoding JWT:", error);
      return null;
    }
  };

  const signIn = async (provider: string, email?: string) => {
    setIsLoading(true);

    try {
      // Handle different providers
      if (provider === "google") {
        // Google sign-in is handled by initiateGoogleAuth
        await initiateGoogleAuth();
        return;
      }

      if (provider === "facebook") {
        // Redirect to Facebook auth endpoint
        window.location.href = "/api/auth/facebook";
        return;
      }

      if (provider === "email" && email) {
        // Call the email authentication API
        const response = await fetch("/api/auth/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to send magic link");
        }

        // Email sent successfully, the user will receive an email with a magic link
        // The magic link will redirect to the callback endpoint, which will handle the authentication
        return;
      }

      // Mock implementation for other providers
      const mockUser: User = {
        id: `user-${Math.random().toString(36).substring(2, 9)}`,
        email:
          email ||
          `user-${Math.random().toString(36).substring(2, 9)}@example.com`,
        name: `User ${Math.floor(Math.random() * 1000)}`,
        provider,
      };

      setUser(mockUser);
      setIsGuest(false); // Exit guest mode when signing in
      localStorage.removeItem("everwood_guest_mode"); // Remove guest mode flag
      localStorage.setItem("everwood_user", JSON.stringify(mockUser));

      // Check if there's a redirect URL saved
      const redirectUrl = localStorage.getItem(
        "everwood_redirect_after_signin"
      );

      if (redirectUrl) {
        localStorage.removeItem("everwood_redirect_after_signin");
        router.push(redirectUrl);
      } else {
        // Default redirect to order page
        router.push("/order");
      }
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);

    try {
      // Handle Google sign out if needed
      if (user?.provider === "google" && window.google) {
        window.google.accounts.id.disableAutoSelect();
      }

      // Handle Facebook sign out if needed
      if (user?.provider === "facebook") {
        // You might want to revoke Facebook access token here
        // For now, we'll just clear local data
      }

      // Clear user data
      setUser(null);
      setIsGuest(false); // Also exit guest mode
      localStorage.removeItem("everwood_user");
      localStorage.removeItem("everwood_guest_mode");
      localStorage.removeItem("everwood_redirect_after_signin");
      router.push("/sign-in");
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to save user data to MongoDB
  const saveUserData = async (data: any): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch("/api/user-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          storeData: data,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save user data");
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error("Error saving user data:", error);
      return false;
    }
  };

  // Function to load user data from MongoDB
  const loadUserData = async (): Promise<any | null> => {
    console.log("Loading user data");
    console.log("User:", user);
    if (!user) return null;

    try {
      console.log("Fetching user data for user:", user.id);
      const response = await fetch(`/api/user-data?userId=${user.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          // No data found for this user, which is fine
          return null;
        }
        throw new Error("Failed to load user data");
      }

      const result = await response.json();
      return result.data?.storeData || null;
    } catch (error) {
      console.error("Error loading user data:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isGuest,
        signIn,
        signOut,
        initiateGoogleAuth,
        handleGoogleCallback,
        saveUserData,
        loadUserData,
        continueAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div>Loading authentication...</div>}>
      <AuthProviderContent>{children}</AuthProviderContent>
    </Suspense>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

// Add TypeScript declaration for Google
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: (callback: (notification: any) => void) => void;
          renderButton: (element: HTMLElement, options: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}
