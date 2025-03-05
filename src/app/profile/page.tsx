"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useCustomStore } from "@/store/customStore";
import {
  User,
  Settings,
  Palette,
  ShoppingCart,
  Save,
  Clock,
  ChevronRight,
  Edit,
  Trash2,
  LogOut,
  LogIn,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function ProfilePage() {
  const { user, signOut, isLoading, isGuest } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  // Get data from custom store
  const savedPalettes = useCustomStore((state) => state.savedPalettes);
  const saveToDatabase = useCustomStore((state) => state.saveToDatabase);
  const autoSaveEnabled = useCustomStore((state) => state.autoSaveEnabled);
  const setAutoSaveEnabled = useCustomStore(
    (state) => state.setAutoSaveEnabled
  );
  const lastSaved = useCustomStore((state) => state.lastSaved);

  useEffect(() => {
    // Redirect to sign-in if not authenticated
    if (!isLoading && !user && !isGuest) {
      router.push("/sign-in");
    }

    // Set display name from user data
    if (user?.name) {
      setDisplayName(user.name);
    }
  }, [user, isGuest, isLoading, router]);

  // Format the last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return "Never";

    const date = new Date(lastSaved);
    return date.toLocaleString();
  };

  const handleSaveData = async () => {
    setIsSaving(true);
    try {
      const success = await saveToDatabase();
      if (success) {
        toast.success("Your design data has been saved");
      } else {
        toast.error("Failed to save your design data");
      }
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("An error occurred while saving your data");
    } finally {
      setIsSaving(false);
    }
  };

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user || !user.name) return "U";

    const nameParts = user.name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

    return (
      nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
    ).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="relative w-12 h-12">
            <div className="absolute top-0 left-0 w-full h-full border-4 border-primary/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-full h-full border-4 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground font-medium">
            Loading your profile...
          </p>
        </motion.div>
      </div>
    );
  }

  // Show guest user profile
  if (isGuest) {
    return (
      <div className="container max-w-6xl py-8 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="shadow-lg border-2 border-primary/10 dark:border-primary/5">
            <CardHeader className="pb-2 border-b dark:border-border/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20 ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-shadow duration-300 hover:ring-primary/30">
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                      G
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                      Guest User
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      You're currently using Everwood as a guest
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push("/sign-in")}
                  className="md:self-start shadow-sm hover:shadow-md transition-shadow duration-300"
                  size="lg"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign in
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-4 rounded-md border border-blue-200 dark:border-blue-800">
                <h3 className="font-medium text-lg mb-2">About Guest Mode</h3>
                <p className="mb-4">
                  As a guest user, your designs and preferences are saved in
                  your browser's local storage. This means:
                </p>
                <ul className="list-disc pl-5 space-y-1 mb-4">
                  <li>
                    Your designs are only available on this device and browser
                  </li>
                  <li>Clearing your browser data will erase your designs</li>
                  <li>
                    You won't be able to access your designs from other devices
                  </li>
                </ul>
                <p>
                  Create an account to save your designs to the cloud and access
                  them from anywhere!
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Data Overview</h3>
                <Separator className="my-2" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Current Design
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">1</span>
                        <ShoppingCart className="h-5 w-5 text-primary" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Saved Palettes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {savedPalettes.length}
                        </span>
                        <Palette className="h-5 w-5 text-primary" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Last Saved
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {formatLastSaved()}
                        </span>
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Quick Actions</h3>
                <Separator className="my-2" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="justify-between"
                    onClick={() => router.push("/order")}
                  >
                    <span className="flex items-center">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Create New Design
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-between"
                    onClick={() => router.push("/palette")}
                  >
                    <span className="flex items-center">
                      <Palette className="mr-2 h-4 w-4" />
                      Manage Palettes
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-between"
                    onClick={handleSaveData}
                    disabled={isSaving}
                  >
                    <span className="flex items-center">
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? "Saving..." : "Save All Data"}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    className="justify-between"
                    onClick={() => router.push("/sign-in")}
                  >
                    <span className="flex items-center">
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign in to Your Account
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container max-w-6xl py-8 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-8">
          <motion.div
            className="flex items-start space-x-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Avatar className="h-24 w-24 ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-shadow duration-300 hover:ring-primary/30">
              <AvatarImage
                src={user.image || ""}
                alt={user.name || user.email}
              />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                {user.name || "User"}
              </h1>
              <p className="text-muted-foreground mt-1">{user.email}</p>
              <div className="flex items-center mt-3 gap-2">
                <Badge
                  variant="outline"
                  className="px-3 py-1 text-sm font-medium"
                >
                  {user.provider || "Account"}
                </Badge>
                <Badge
                  variant="secondary"
                  className="px-3 py-1 text-sm font-medium"
                >
                  Member
                </Badge>
              </div>
            </div>
          </motion.div>
          <motion.div
            className="flex gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              variant="outline"
              className="flex items-center shadow-sm hover:shadow-md transition-all duration-300"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
            <Button
              variant="destructive"
              className="flex items-center shadow-sm hover:shadow-md transition-all duration-300"
              onClick={() => setConfirmingSignOut(true)}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </motion.div>
        </div>

        <Tabs
          defaultValue="overview"
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="inline-flex h-12 items-center text-muted-foreground bg-background border-2 border-primary/10 dark:border-primary/5 rounded-lg p-1 shadow-sm">
            <TabsTrigger
              value="overview"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="designs"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              My Designs
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="shadow-lg border-2 border-primary/10 dark:border-primary/5">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-2xl">Account Overview</CardTitle>
                  <CardDescription className="text-base">
                    View a summary of your account and recent activity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="bg-primary/5 border-2 border-primary/10 dark:bg-primary/[0.03] dark:border-primary/5 transition-shadow duration-300 hover:shadow-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Saved Designs
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-3xl font-bold text-primary">
                            1
                          </span>
                          <ShoppingCart className="h-6 w-6 text-primary/60" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-2 border-primary/10 dark:bg-primary/[0.03] dark:border-primary/5 transition-shadow duration-300 hover:shadow-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Saved Palettes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-3xl font-bold text-primary">
                            {savedPalettes.length}
                          </span>
                          <Palette className="h-6 w-6 text-primary/60" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-2 border-primary/10 dark:bg-primary/[0.03] dark:border-primary/5 transition-shadow duration-300 hover:shadow-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Last Saved
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <span className="text-3xl font-bold text-primary">
                            {formatLastSaved()}
                          </span>
                          <Clock className="h-6 w-6 text-primary/60" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Account Details
                    </h3>
                    <Separator className="my-2" />
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div className="flex justify-between md:block">
                        <dt className="text-muted-foreground">Name</dt>
                        <dd className="font-medium md:mt-1">
                          {user.name || "Not provided"}
                        </dd>
                      </div>
                      <div className="flex justify-between md:block">
                        <dt className="text-muted-foreground">Email</dt>
                        <dd className="font-medium md:mt-1">{user.email}</dd>
                      </div>
                      <div className="flex justify-between md:block">
                        <dt className="text-muted-foreground">User ID</dt>
                        <dd className="font-medium md:mt-1 truncate">
                          {user.id}
                        </dd>
                      </div>
                      <div className="flex justify-between md:block">
                        <dt className="text-muted-foreground">Provider</dt>
                        <dd className="font-medium md:mt-1">
                          {user.provider || "Email"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">Quick Actions</h3>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        className="justify-between"
                        onClick={() => router.push("/order")}
                      >
                        <span className="flex items-center">
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Create New Design
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-between"
                        onClick={() => router.push("/palette")}
                      >
                        <span className="flex items-center">
                          <Palette className="mr-2 h-4 w-4" />
                          Manage Palettes
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-between"
                        onClick={handleSaveData}
                        disabled={isSaving}
                      >
                        <span className="flex items-center">
                          <Save className="mr-2 h-4 w-4" />
                          {isSaving ? "Saving..." : "Save All Data"}
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-between"
                        onClick={() => setActiveTab("settings")}
                      >
                        <span className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          Account Settings
                        </span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="designs">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="shadow-lg border-2 border-primary/10 dark:border-primary/5">
                <CardHeader>
                  <CardTitle>My Designs</CardTitle>
                  <CardDescription>
                    View and manage your saved designs and palettes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Current Design</h3>
                    <Separator className="my-2" />
                    <Card className="bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Active Design</h4>
                            <p className="text-sm text-muted-foreground">
                              Last modified: {formatLastSaved()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push("/order")}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleSaveData}
                              disabled={isSaving}
                            >
                              {isSaving ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Saved Palettes ({savedPalettes.length})
                    </h3>
                    <Separator className="my-2" />

                    {savedPalettes.length === 0 ? (
                      <div className="text-center py-8">
                        <Palette className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <h3 className="text-lg font-medium">
                          No saved palettes
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          You haven't saved any color palettes yet.
                        </p>
                        <Button onClick={() => router.push("/palette")}>
                          Create a Palette
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {savedPalettes.map((palette) => (
                          <Card key={palette.id} className="overflow-hidden">
                            <div className="h-8 flex">
                              {palette.colors.map((color, index) => (
                                <div
                                  key={index}
                                  className="flex-1 h-full"
                                  style={{ backgroundColor: color.hex }}
                                />
                              ))}
                            </div>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">
                                    {palette.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground">
                                    {palette.colors.length} colors • Created{" "}
                                    {new Date(
                                      palette.createdAt
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push("/palette")}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/palette")}
                  >
                    Manage All Palettes
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="settings">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="shadow-lg border-2 border-primary/10 dark:border-primary/5">
                <CardHeader>
                  <CardTitle>Account Settings</CardTitle>
                  <CardDescription>
                    Manage your account preferences and settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Preferences</h3>
                    <Separator className="my-2" />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="auto-save">Auto-save designs</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically save your designs every 30 seconds
                          </p>
                        </div>
                        <Switch
                          id="auto-save"
                          checked={autoSaveEnabled}
                          onCheckedChange={setAutoSaveEnabled}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">
                      Account Management
                    </h3>
                    <Separator className="my-2" />

                    <div className="space-y-4">
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Profile Information
                      </Button>

                      <Button
                        variant="destructive"
                        className="w-full justify-start"
                        onClick={() => setConfirmingSignOut(true)}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[425px] shadow-lg border-2 border-primary/10 dark:border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Profile</DialogTitle>
            <DialogDescription className="text-base">
              Update your profile information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right font-medium">
                Name
              </Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right font-medium">
                Email
              </Label>
              <Input
                id="email"
                value={user.email}
                disabled
                className="col-span-3 bg-muted"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={() => {
                toast.info(
                  "Profile update functionality is not implemented yet"
                );
                setIsEditing(false);
              }}
              className="shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={confirmingSignOut} onOpenChange={setConfirmingSignOut}>
        <DialogContent className="sm:max-w-[425px] shadow-lg border-2 border-primary/10 dark:border-primary/5">
          <DialogHeader>
            <DialogTitle className="text-2xl">Sign Out</DialogTitle>
            <DialogDescription className="text-base">
              Are you sure you want to sign out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmingSignOut(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={signOut}
              className="shadow-sm hover:shadow-md transition-shadow duration-300"
            >
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
