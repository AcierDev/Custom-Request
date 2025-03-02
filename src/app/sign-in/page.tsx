"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Apple,
  Facebook,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  X,
  Share2,
  Info,
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

// Error messages for different error codes
const ERROR_MESSAGES: Record<string, string> = {
  no_code: "Authentication failed: No authorization code received",
  token_exchange: "Authentication failed: Could not exchange code for token",
  user_info: "Authentication failed: Could not retrieve user information",
  server_error: "Authentication failed: Server error",
  no_token: "Authentication failed: No token received",
  processing: "Authentication failed: Error processing authentication",
  default: "An error occurred during authentication. Please try again.",
};

export default function SignIn() {
  const { signIn, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState<{ [key: string]: boolean }>({
    google: false,
    apple: false,
    facebook: false,
    email: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [redirectInfo, setRedirectInfo] = useState<string | null>(null);

  // Check for error parameter in URL
  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      setError(ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.default);
    }
  }, [searchParams]);

  // Check if user was redirected from a shared design link
  useEffect(() => {
    const redirectUrl = localStorage.getItem("everwood_redirect_after_signin");
    if (
      redirectUrl &&
      redirectUrl.includes("order") &&
      (redirectUrl.includes("share=") || redirectUrl.includes("s="))
    ) {
      setRedirectInfo("Sign in to view the shared design");
    }
  }, []);

  const handleProviderSignIn = async (provider: string) => {
    try {
      setError(null);
      setIsLoading({ ...isLoading, [provider]: true });
      await signIn(provider);
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      setError(`Failed to sign in with ${provider}. Please try again.`);
    } finally {
      setIsLoading({ ...isLoading, [provider]: false });
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setError(null);
      setIsLoading({ ...isLoading, email: true });
      await signIn("email", email);
    } catch (error) {
      console.error("Error signing in with email:", error);
      setError("Failed to sign in with email. Please try again.");
    } finally {
      setIsLoading({ ...isLoading, email: false });
    }
  };

  const isAnyLoading = Object.values(isLoading).some(Boolean) || authLoading;

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
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
                className="flex items-center justify-center gap-2 h-12 border-muted-foreground/20 hover:bg-muted/50"
                onClick={() => handleProviderSignIn("apple")}
                disabled={isAnyLoading}
              >
                {isLoading.apple ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Apple className="h-5 w-5" />
                    <span>Apple</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 h-12 border-muted-foreground/20 hover:bg-muted/50"
                onClick={() => handleProviderSignIn("facebook")}
                disabled={isAnyLoading}
              >
                {isLoading.facebook ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Facebook className="h-5 w-5" />
                    <span>Facebook</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                className="flex items-center justify-center gap-2 h-12 border-muted-foreground/20 hover:bg-muted/50"
                onClick={() => document.getElementById("email-form")?.focus()}
                disabled={isAnyLoading}
              >
                <Mail className="h-5 w-5" />
                <span>Email</span>
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

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
          <CardFooter className="flex flex-col space-y-2">
            <p className="text-center text-sm text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link
                href="#"
                className="underline underline-offset-4 hover:text-primary"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="#"
                className="underline underline-offset-4 hover:text-primary"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
