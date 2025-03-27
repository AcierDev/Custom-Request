"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Facebook,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
  Share2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { Suspense } from "react";
import { Onboarding } from "@/components/Onboarding";

// Error messages for different error codes
const ERROR_MESSAGES: Record<string, string> = {
  no_code: "Authentication failed: No authorization code received",
  token_exchange: "Authentication failed: Could not exchange code for token",
  user_info: "Authentication failed: Could not retrieve user information",
  server_error: "Authentication failed: Server error",
  no_token: "Authentication failed: No token received",
  invalid_token: "Authentication failed: Invalid or expired token",
  processing: "Authentication failed: Error processing authentication",
  facebook_auth_error: "Facebook authentication failed. Please try again.",
  default: "An error occurred during authentication. Please try again.",
};

// Create a separate client component that uses useSearchParams
function SignInContent() {
  const { signIn, isLoading: authLoading, continueAsGuest, user } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [redirectInfo, setRedirectInfo] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState({
    google: false,
    facebook: false,
    email: false,
    guest: false,
  });

  // Check for error in URL
  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      setError(ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default);
    }

    // Check for redirect info
    const redirectAfterSignin = localStorage.getItem(
      "everwood_redirect_after_signin"
    );
    if (redirectAfterSignin) {
      setRedirectInfo("You'll be redirected after signing in");
    }
  }, [searchParams]);

  // Check for successful login and show onboarding
  useEffect(() => {
    if (!user) {
      console.log("No authenticated user yet");
      return;
    }

    console.log("User authenticated in sign-in page:", user);
    const onboardingCompleted = localStorage.getItem("onboardingCompleted");
    console.log("Onboarding completed:", onboardingCompleted);

    // If a redirect is already in progress, don't start another one
    if (sessionStorage.getItem("redirect_in_progress") === "true") {
      console.log("Redirect already in progress, skipping");
      return;
    }

    // This is a fresh authentication
    if (onboardingCompleted !== "true") {
      // New user - show onboarding
      console.log("New user - showing onboarding");
      setShowOnboarding(true);
    } else {
      // User has completed onboarding - redirect to welcome page
      console.log(
        "User already completed onboarding - redirecting to welcome page"
      );
      sessionStorage.setItem("redirect_in_progress", "true");

      // Force navigation to welcome page
      window.location.href = "/welcome";
    }
  }, [user]);

  const handleProviderSignIn = async (provider: string) => {
    try {
      setError(null);
      setIsLoading({ ...isLoading, [provider]: true });

      // Set a flag that we're initiating sign-in
      sessionStorage.setItem("signin_initiated", provider);

      await signIn(provider);
      // The rest will be handled by the auth context and the useEffect above
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      setError(`Failed to sign in with ${provider}. Please try again.`);
      sessionStorage.removeItem("signin_initiated");
    } finally {
      setIsLoading({ ...isLoading, [provider]: false });
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setError(null);
      setEmailSent(false);
      setIsLoading({ ...isLoading, email: true });
      await signIn("email", email);
      // If we get here, the email was sent successfully
      setEmailSent(true);
    } catch (error) {
      console.error("Error signing in with email:", error);
      setError("Failed to sign in with email. Please try again.");
    } finally {
      setIsLoading({ ...isLoading, email: false });
    }
  };

  const handleGuestAccess = () => {
    try {
      setError(null);
      setIsLoading({ ...isLoading, guest: true });
      continueAsGuest();

      // Check if onboarding is completed
      const onboardingCompleted = localStorage.getItem("onboardingCompleted");
      if (onboardingCompleted !== "true") {
        console.log("Guest user needs onboarding, showing onboarding");
        // Show onboarding for guest users
        setShowOnboarding(true);
      } else {
        // Always redirect to welcome page
        console.log("Redirecting guest user to welcome page");
        window.location.href = "/welcome";
      }
    } catch (error) {
      console.error("Error continuing as guest:", error);
      setError("Failed to continue as guest. Please try again.");
      setIsLoading({ ...isLoading, guest: false });
    }
  };

  const isAnyLoading = Object.values(isLoading).some(Boolean) || authLoading;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {!showOnboarding ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-muted/30 shadow-lg backdrop-blur-sm bg-background/95">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                Welcome to Everwood
              </CardTitle>
              <CardDescription className="text-center">
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Alert variant="destructive" className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex-1">
                        {error}
                      </AlertDescription>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0"
                        onClick={() => setError(null)}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Dismiss</span>
                      </Button>
                    </Alert>
                  </motion.div>
                )}

                {redirectInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Alert
                      variant="default"
                      className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                        <AlertDescription className="flex-1 text-blue-700 dark:text-blue-300">
                          {redirectInfo}
                        </AlertDescription>
                      </div>
                    </Alert>
                  </motion.div>
                )}

                {emailSent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Alert
                      variant="default"
                      className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-green-500 dark:text-green-400" />
                        <AlertDescription className="flex-1 text-green-700 dark:text-green-300">
                          Magic link sent! Check your email to continue.
                        </AlertDescription>
                      </div>
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-12 border-muted-foreground/20 hover:bg-muted/50 relative overflow-hidden group"
                  onClick={() => handleProviderSignIn("google")}
                  disabled={isAnyLoading}
                >
                  {isLoading.google ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <div className="absolute inset-0 w-3 bg-[#4285F4] transform -skew-x-[20deg] -translate-x-full group-hover:animate-google-btn" />
                      <svg className="h-5 w-5 z-10" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                        <path d="M1 1h22v22H1z" fill="none" />
                      </svg>
                      <span className="z-10">Google</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center justify-center gap-2 h-12 border-muted-foreground/20 hover:bg-muted/50 relative overflow-hidden group"
                  onClick={() => handleProviderSignIn("facebook")}
                  disabled={isAnyLoading}
                >
                  {isLoading.facebook ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <div className="absolute inset-0 w-3 bg-[#1877F2] transform -skew-x-[20deg] -translate-x-full group-hover:animate-google-btn" />
                      <Facebook className="h-5 w-5 text-[#1877F2] z-10" />
                      <span className="z-10">Facebook</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-muted-foreground/20" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue without an account
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 h-12 border-muted-foreground/20 hover:bg-muted/50 relative overflow-hidden group"
                onClick={handleGuestAccess}
                disabled={isAnyLoading}
              >
                {isLoading.guest ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <div className="absolute inset-0 w-3 bg-blue-400 transform -skew-x-[20deg] -translate-x-full group-hover:animate-google-btn" />
                    <User className="h-5 w-5 z-10" />
                    <span className="z-10">Continue as Guest</span>
                  </>
                )}
              </Button>

              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email-form"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={!email || isAnyLoading}
                >
                  {isLoading.email ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-5 w-5 mr-2" />
                  )}
                  Continue with Email
                </Button>
              </form>
            </CardContent>
            <CardFooter className="text-center text-xs text-muted-foreground mt-4">
              <div className="w-full">
                By continuing, you agree to our Terms of Service and Privacy
                Policy.
                <div className="mt-2">
                  <span>Guest users can create and share designs, </span>
                  <span className="font-medium text-primary">
                    but data may be lost if you clear your browser storage.
                  </span>
                </div>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      ) : (
        <Onboarding />
      )}
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card className="border-muted/30 shadow-lg backdrop-blur-sm bg-background/95">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">
                  Welcome to Everwood
                </CardTitle>
                <CardDescription className="text-center">
                  Loading...
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
