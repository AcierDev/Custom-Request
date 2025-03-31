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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, signOut, isLoading, isGuest } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  const savedPalettes = useCustomStore((state) => state.savedPalettes);
  const saveToDatabase = useCustomStore((state) => state.saveToDatabase);
  const autoSaveEnabled = useCustomStore((state) => state.autoSaveEnabled);
  const setAutoSaveEnabled = useCustomStore(
    (state) => state.setAutoSaveEnabled
  );
  const lastSaved = useCustomStore((state) => state.lastSaved);

  useEffect(() => {
    if (!isLoading && !user && !isGuest) {
      router.push("/sign-in");
    }
    if (user?.name) {
      setDisplayName(user.name);
    }
  }, [user, isGuest, isLoading, router]);

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
    return null; // Should be redirected by useEffect
  }

  return (
    <div className="container max-w-6xl py-8 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className="shadow-lg border-2 border-primary/10 dark:border-primary/5 overflow-hidden">
          <CardHeader className="bg-muted/30 dark:bg-muted/10 p-6 border-b dark:border-border/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <motion.div
                className="flex items-center space-x-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Avatar className="h-20 w-20 ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-shadow duration-300 hover:ring-primary/30">
                  <AvatarImage
                    src={user.image || ""}
                    alt={user.name || user.email}
                  />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    {user.name || "User"}
                  </h1>
                  <p className="text-muted-foreground text-sm mt-0.5">
                    {user.email}
                  </p>
                  <div className="flex items-center mt-2 gap-2">
                    <Badge
                      variant="outline"
                      className="px-2.5 py-0.5 text-xs font-medium"
                    >
                      {user.provider || "Account"}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="px-2.5 py-0.5 text-xs font-medium"
                    >
                      Member
                    </Badge>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="flex gap-2 flex-shrink-0 md:self-start"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center shadow-sm hover:shadow-md transition-all duration-300"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex items-center shadow-sm hover:shadow-md transition-all duration-300"
                  onClick={() => setConfirmingSignOut(true)}
                >
                  <LogOut className="mr-1.5 h-3.5 w-3.5" />
                  Sign Out
                </Button>
              </motion.div>
            </div>
          </CardHeader>

          <Tabs
            defaultValue="overview"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="px-6 py-3 border-b dark:border-border/50">
              <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <TabsTrigger
                  value="overview"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="designs"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  My Designs
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                >
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>

            <CardContent className="p-6 space-y-8">
              <TabsContent value="overview" className="mt-0">
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.1,
                          delayChildren: 0.1,
                        },
                      },
                    }}
                  >
                    {[
                      {
                        title: "Saved Designs",
                        value: "1",
                        Icon: ShoppingCart,
                      },
                      {
                        title: "Saved Palettes",
                        value: savedPalettes.length,
                        Icon: Palette,
                      },
                      {
                        title: "Last Saved",
                        value: formatLastSaved(),
                        Icon: Clock,
                        isDate: true,
                      },
                    ].map(({ title, value, Icon, isDate }, index) => (
                      <motion.div
                        key={title}
                        variants={{
                          hidden: { y: 20, opacity: 0 },
                          visible: { y: 0, opacity: 1 },
                        }}
                      >
                        <Card className="bg-background border transition-shadow hover:shadow-md dark:bg-muted/20">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                              {title}
                            </CardTitle>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </CardHeader>
                          <CardContent>
                            <div
                              className={cn(
                                "font-bold",
                                isDate ? "text-sm" : "text-2xl"
                              )}
                            >
                              {value}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Account Details
                    </h3>
                    <Separator className="mb-4" />
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      {[
                        { label: "Name", value: user.name || "Not provided" },
                        { label: "Email", value: user.email },
                        { label: "User ID", value: user.id, truncate: true },
                        { label: "Provider", value: user.provider || "Email" },
                      ].map(({ label, value, truncate }) => (
                        <div key={label} className="flex flex-col">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd
                            className={cn(
                              "font-medium mt-0.5",
                              truncate && "truncate"
                            )}
                          >
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Quick Actions
                    </h3>
                    <Separator className="mb-4" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => router.push("/order")}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Create New Design
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => router.push("/palette")}
                      >
                        <Palette className="mr-2 h-4 w-4" />
                        Manage Palettes
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={handleSaveData}
                        disabled={isSaving}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? "Saving..." : "Save All Data"}
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start"
                        onClick={() => setActiveTab("settings")}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Account Settings
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="designs" className="mt-0">
                <motion.div
                  key="designs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Current Design
                    </h3>
                    <Separator className="mb-4" />
                    <Card className="bg-muted/50 dark:bg-muted/20">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div>
                          <h4 className="font-medium">Active Design</h4>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Last modified: {formatLastSaved()}
                          </p>
                        </div>
                        <div className="flex space-x-2 flex-shrink-0">
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
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold">
                        Saved Palettes ({savedPalettes.length})
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/palette")}
                      >
                        Manage Palettes
                      </Button>
                    </div>
                    <Separator className="mb-4" />

                    {savedPalettes.length === 0 ? (
                      <div className="text-center py-10 border border-dashed rounded-lg">
                        <Palette className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <h4 className="text-md font-medium">
                          No saved palettes yet
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1 mb-4">
                          Create and save palettes in the Palette editor.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => router.push("/palette")}
                        >
                          Go to Palette Editor
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {savedPalettes.map((palette) => (
                          <Card
                            key={palette.id}
                            className="overflow-hidden border hover:shadow-sm transition-shadow"
                          >
                            <div className="h-10 flex border-b">
                              {palette.colors.map((color, index) => (
                                <div
                                  key={index}
                                  className="flex-1 h-full"
                                  style={{ backgroundColor: color.hex }}
                                  title={color.hex}
                                />
                              ))}
                            </div>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium truncate pr-2">
                                    {palette.name}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {palette.colors.length} colors • Created{" "}
                                    {new Date(
                                      palette.createdAt
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Preferences</h3>
                    <Separator className="mb-4" />
                    <div className="space-y-4 max-w-md">
                      <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 dark:bg-muted/20">
                        <div className="space-y-0.5 pr-4">
                          <Label htmlFor="auto-save" className="font-medium">
                            Auto-save designs
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically save your designs periodically.
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
                    <h3 className="text-lg font-semibold mb-3">
                      Account Management
                    </h3>
                    <Separator className="mb-4" />
                    <div className="space-y-3 max-w-md">
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
                        Sign Out from this device
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </motion.div>

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
