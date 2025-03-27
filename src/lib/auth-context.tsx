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

  // Initialize Google One Tap - make sure this only runs client-side
  useEffect(() => {
    // Only run this effect in the browser
    if (typeof window === "undefined") return;

    // Skip if Google SDK is not loaded, user is already signed in, or no client ID
    if (!window.google || user || !GOOGLE_CLIENT_ID) return;

    // Add a small delay to ensure DOM is fully rendered to prevent hydration errors
    const initTimer = setTimeout(() => {
      try {
        // Check again that google is defined before using (for TypeScript)
        if (!window.google) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Display the One Tap UI if on sign-in page
        if (pathname === "/sign-in") {
          // Double check google is defined before using
          if (!window.google) return;

          window.google.accounts.id.prompt((notification: any) => {
            if (
              notification.isNotDisplayed() ||
              notification.isSkippedMoment()
            ) {
              console.log("Google One Tap not displayed or skipped");
            }
          });
        }
      } catch (error) {
        console.error("Error initializing Google One Tap:", error);
      }
    }, 500); // Delay to prevent hydration issues

    return () => clearTimeout(initTimer);
  }, [pathname, user]);

  // New useEffect to handle redirection after authentication
  useEffect(() => {
    // Skip if not in browser or no user
    if (typeof window === "undefined" || !user) return;

    // Add a flag to prevent double redirects with Google sign-in
    const googleRedirectInProgress = sessionStorage.getItem(
      "google_redirect_in_progress"
    );

    // Check if we're on the sign-in page and should be redirected
    if (pathname === "/sign-in" && !googleRedirectInProgress) {
      const redirectUrl = localStorage.getItem(
        "everwood_redirect_after_signin"
      );
      const onboardingStatus = localStorage.getItem("onboardingCompleted");

      console.log("Auth redirect check - User authenticated on sign-in page");
      console.log("Onboarding status:", onboardingStatus);

      // Set flag to prevent double redirects
      sessionStorage.setItem("google_redirect_in_progress", "true");

      // Use a timeout to ensure state has settled
      setTimeout(() => {
        if (redirectUrl) {
          console.log("Redirecting to saved URL:", redirectUrl);
          localStorage.removeItem("everwood_redirect_after_signin");
          window.location.href = redirectUrl;
        } else if (onboardingStatus === "true") {
          // If onboarding is completed, redirect to welcome page
          console.log("Onboarding completed, redirecting to welcome page");
          window.location.href = "/welcome";
        }
        // Clear redirect flag after redirect is done
        sessionStorage.removeItem("google_redirect_in_progress");
      }, 500);
    }
  }, [user, pathname]);

  // Function to continue as guest
  const continueAsGuest = () => {
    setIsGuest(true);
    setUser(null);
    localStorage.setItem("everwood_guest_mode", "true");
    localStorage.setItem("everwood_is_guest", "true");

    // Get the onboarding status
    const onboardingCompleted = localStorage.getItem("onboardingCompleted");

    // Check if there's a redirect URL saved
    const redirectUrl = localStorage.getItem("everwood_redirect_after_signin");

    if (redirectUrl) {
      localStorage.removeItem("everwood_redirect_after_signin");
      router.push(redirectUrl);
    } else if (onboardingCompleted !== "true") {
      // If onboarding is not completed, we'll handle it in the sign-in component
      // This function is called from there, so no navigation needed
      console.log("Guest user will see onboarding");
    } else {
      // Always redirect to welcome page first from sign-in page
      console.log("Guest user will be directed to welcome page");
      // Only navigate if not on sign-in page, let sign-in page handle it
      if (pathname !== "/sign-in") {
        window.location.href = "/welcome";
      }
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

      // Log user data for debugging
      console.log("Loading user data");
      console.log("User:", googleUser);

      // Check if this is a new user by looking for previous login data
      const existingUserData = localStorage.getItem("everwood_user");
      const isNewUser =
        !existingUserData ||
        (existingUserData && JSON.parse(existingUserData).id !== googleUser.id);

      // For new users, ensure onboarding is shown
      if (isNewUser) {
        localStorage.removeItem("onboardingCompleted");
      }

      // Update state and localStorage
      setUser(googleUser);
      setIsGuest(false);
      localStorage.removeItem("everwood_guest_mode");
      localStorage.setItem("everwood_user", JSON.stringify(googleUser));

      // Get redirection info
      const redirectUrl = localStorage.getItem(
        "everwood_redirect_after_signin"
      );
      const onboardingStatus = localStorage.getItem("onboardingCompleted");

      console.log("Google auth - Checking where to redirect");
      console.log("onboardingStatus:", onboardingStatus);
      console.log("pathname:", pathname);
      console.log("redirectUrl:", redirectUrl);

      // Force welcome page redirect after google sign-in if user already completed onboarding
      if (onboardingStatus === "true") {
        console.log("Google auth - Redirecting directly to welcome page");
        // Small delay to ensure state is updated
        setTimeout(() => {
          window.location.href = "/welcome";
        }, 300);
      }
      // Else let the sign-in component handle showing onboarding
    } catch (error) {
      console.error("Google callback error:", error);
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
      switch (provider) {
        case "google":
          await initiateGoogleAuth();
          break;

        case "facebook":
          // Implement Facebook auth flow
          try {
            const authUrl = `https://www.facebook.com/v11.0/dialog/oauth?client_id=${FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(
              FACEBOOK_REDIRECT_URI
            )}&response_type=code&scope=email,public_profile`;

            window.location.href = authUrl;
          } catch (error) {
            console.error("Facebook auth error:", error);
            throw error;
          }
          break;

        case "email":
          if (!email) throw new Error("Email is required for email login");

          try {
            // Call our email authentication API to send a magic link
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

            return Promise.resolve();
          } catch (error) {
            console.error("Email auth error:", error);
            throw error;
          }
          break;

        default:
          throw new Error(`Unsupported auth provider: ${provider}`);
      }
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
    } finally {
      // Only set loading to false for email login, for others we're redirecting
      if (provider === "email") {
        setIsLoading(false);
      }
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      setUser(null);
      setIsGuest(false);

      // Clear all auth-related localStorage items
      localStorage.removeItem("everwood_user");
      localStorage.removeItem("everwood_guest_mode");
      localStorage.removeItem("everwood_is_guest");

      // Also clear onboarding state if we want users to see it again
      localStorage.removeItem("onboardingCompleted");

      // Redirect to sign-in page
      router.push("/sign-in");
    } catch (error) {
      console.error("Sign out error:", error);
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
          email: user.email,
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
