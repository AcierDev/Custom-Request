"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Moon,
  Sun,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  ShoppingCart,
  Palette,
  LogOut,
  User,
  Save,
  PencilRuler,
  LogIn,
  Eye,
  Pencil,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCustomStore } from "@/store/customStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type NavItemBase = {
  hotkey?: string;
  type?: string;
};

type NavLinkItem = NavItemBase & {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

type DividerItem = NavItemBase & {
  type: "divider";
};

type NavItem = NavLinkItem | DividerItem;

const mainNavItems: NavItem[] = [
  { href: "/order", icon: ShoppingCart, label: "Order", hotkey: "1" },
  { href: "/designs", icon: Save, label: "Saved Designs", hotkey: "4" },
  // { href: "/viewer", icon: Eye, label: "View Art", hotkey: "6" },
  { href: "/preview", icon: Eye, label: "Preview", hotkey: "2" },
  { href: "/design", icon: PencilRuler, label: "Design", hotkey: "3" },
  { href: "/draw-pattern", icon: Pencil, label: "Draw Pattern", hotkey: "6" },
  { href: "/palette", icon: Palette, label: "Palette", hotkey: "5" },
];

interface NavbarProps {
  onOpenSettings: () => void;
}

interface NavLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export function Navbar({ onOpenSettings }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isGuest } = useAuth();
  const [activeTab, setActiveTab] = useState(pathname);
  const [navigationSequence, setNavigationSequence] = useState<string[]>([]);
  const saveToDatabase = useCustomStore((state) => state.saveToDatabase);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user || !user.name) return "U";

    const nameParts = user.name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

    return (
      nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
    ).toUpperCase();
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

  const NavLink = ({ href, icon: Icon, label }: NavLinkProps) => {
    if (!href) return null;

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent default Link navigation

      // Update sequence by keeping last 3 items and adding new href
      const newSequence = [...navigationSequence.slice(-3), href];
      setNavigationSequence(newSequence);

      router.push(href); // Normal navigation if sequence doesn't match
    };

    const isActive = activeTab === href;

    return (
      <Link
        href={href}
        className={cn(
          "flex items-center rounded-lg px-3 py-4 text-sm font-medium transition-all duration-200 ease-in-out group",
          isActive
            ? "bg-gradient-to-r from-blue-500/90 to-violet-500/90 text-white shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-primary",
          !isSidebarOpen ? "justify-center" : ""
        )}
        onClick={handleClick}
      >
        <Icon
          className={cn(
            "h-5 w-5 flex-shrink-0 transition-transform duration-200 ease-in-out",
            isActive ? "scale-110" : "group-hover:scale-105",
            !isSidebarOpen ? "mr-0" : "mr-3"
          )}
        />
        {isSidebarOpen && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed h-screen transition-all duration-300 ease-in-out border-r dark:border-gray-800/50 border-gray-200/80 bg-white/95 dark:bg-gradient-to-b dark:from-gray-950/95 dark:via-gray-900/90 dark:to-gray-800/80 dark:backdrop-blur-sm hidden lg:block z-30",
          isSidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/80 dark:border-gray-800/50">
          {isSidebarOpen && (
            <span
              className="text-lg font-bold cursor-pointer text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-80 transition-opacity"
              onClick={() => router.push("/welcome")}
            >
              Everwood
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              "hover:bg-muted/80 dark:hover:bg-gray-800/60",
              isSidebarOpen ? "" : "mx-auto"
            )}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </div>
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex-1 overflow-y-auto no-scrollbar px-3">
            <div className="flex flex-col space-y-1 py-2">
              {mainNavItems.map((item, index) =>
                item.type === "divider" ? (
                  <Separator
                    key={index}
                    className="my-2 bg-gray-200/80 dark:bg-gray-700/50"
                    decorative
                  />
                ) : (
                  <NavLink
                    key={"href" in item ? item.href : index}
                    href={"href" in item ? item.href : ""}
                    icon={"icon" in item ? item.icon : Menu}
                    label={"label" in item ? item.label : ""}
                  />
                )
              )}
            </div>
          </div>
          <div className="p-3 border-t border-gray-200/80 dark:border-gray-700/50 bg-white/80 dark:bg-gray-950/60">
            <div className={cn("flex gap-2", !isSidebarOpen && "flex-col")}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex-shrink-0 hover:bg-muted/80 dark:hover:bg-gray-800/60"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
                <span className="sr-only">
                  {theme === "dark"
                    ? "Switch to light theme"
                    : "Switch to dark theme"}
                </span>
              </Button>
              <Button
                className={cn(
                  "flex items-center justify-center bg-white text-black hover:opacity-90 transition-opacity shadow-sm",
                  isSidebarOpen ? "flex-1" : ""
                )}
                onClick={onOpenSettings}
              >
                <Settings className="h-5 w-5 flex-shrink-0" />
                {isSidebarOpen && <span className="ml-2">Settings</span>}
              </Button>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 p-0 h-9 w-9 rounded-full hover:bg-muted/80 dark:hover:bg-gray-800/60"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.image || ""}
                          alt={user.name || user.email}
                        />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900/50 dark:to-violet-900/50 text-primary dark:text-blue-300">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-background/95 backdrop-blur-sm border-border/50"
                  >
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer focus:bg-muted/80"
                      onClick={() => router.push("/profile")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer focus:bg-muted/80"
                      onClick={handleSaveData}
                      disabled={isSaving}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      <span>{isSaving ? "Saving..." : "Save My Designs"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={signOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : isGuest ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 p-0 h-9 w-9 rounded-full hover:bg-muted/80 dark:hover:bg-gray-800/60"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                          G
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 bg-background/95 backdrop-blur-sm border-border/50"
                  >
                    <DropdownMenuLabel>Guest User</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer focus:bg-muted/80"
                      onClick={() => router.push("/profile")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer focus:bg-muted/80"
                      onClick={handleSaveData}
                      disabled={isSaving}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      <span>{isSaving ? "Saving..." : "Save My Designs"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-primary focus:text-primary focus:bg-primary/10"
                      onClick={() => router.push("/sign-in")}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      <span>Sign in</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/sign-in")}
                  className="flex-shrink-0 hover:bg-muted/80 dark:hover:bg-gray-800/60 border-border/50"
                >
                  <LogIn className="h-5 w-5" />
                  <span className="sr-only">Sign in</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Navbar */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b border-gray-200/80 dark:border-gray-800/50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <div className="w-full flex h-14 items-center px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="hover:bg-muted/80 dark:hover:bg-gray-800/60"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <span
              className="text-xl font-bold mr-auto cursor-pointer text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-80 transition-opacity ml-2"
              onClick={() => router.push("/order")}
            >
              Everwood
            </span>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto mr-2 p-0 h-9 w-9 rounded-full hover:bg-muted/80 dark:hover:bg-gray-800/60"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.image || ""}
                        alt={user.name || user.email}
                      />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-900/50 dark:to-violet-900/50 text-primary dark:text-blue-300">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-background/95 backdrop-blur-sm border-border/50"
                >
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-muted/80"
                    onClick={() => router.push("/profile")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-muted/80"
                    onClick={handleSaveData}
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    <span>{isSaving ? "Saving..." : "Save My Designs"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    onClick={signOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : isGuest ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto mr-2 p-0 h-9 w-9 rounded-full hover:bg-muted/80 dark:hover:bg-gray-800/60"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300">
                        G
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-background/95 backdrop-blur-sm border-border/50"
                >
                  <DropdownMenuLabel>Guest User</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-muted/80"
                    onClick={handleSaveData}
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    <span>{isSaving ? "Saving..." : "Save My Designs"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-muted/80"
                    onClick={() => router.push("/profile")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-primary focus:text-primary focus:bg-primary/10"
                    onClick={() => router.push("/sign-in")}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Sign in</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/sign-in")}
                className="ml-auto border-border/50 hover:bg-muted/80"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Button>
            )}

            <SheetContent
              side="left"
              className="w-64 p-0 bg-white/95 dark:bg-gradient-to-b dark:from-gray-950/95 dark:via-gray-900/90 dark:to-gray-850/95 dark:backdrop-blur-sm border-r dark:border-gray-800/50"
            >
              <div className="h-16 flex items-center px-4 border-b border-gray-200/80 dark:border-gray-800/50 bg-white/80 dark:bg-gray-950/80">
                <span className="text-lg font-bold cursor-pointer text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">
                  Everwood
                </span>
              </div>
              <div className="flex flex-col h-[calc(100dvh-4rem)]">
                <div className="flex-1 flex flex-col space-y-1 py-2 px-3 overflow-y-auto no-scrollbar">
                  {mainNavItems.map((item, index) =>
                    item.type === "divider" ? (
                      <Separator
                        key={index}
                        className="my-2 bg-gray-200/80 dark:bg-gray-700/50"
                      />
                    ) : (
                      <NavLink
                        key={"href" in item ? item.href : index}
                        href={"href" in item ? item.href : ""}
                        icon={"icon" in item ? item.icon : Menu}
                        label={"label" in item ? item.label : ""}
                      />
                    )
                  )}
                </div>
                <div className="p-4 border-t border-gray-200/80 dark:border-gray-700/50 bg-white/80 dark:bg-gray-950/60">
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 flex items-center justify-center bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:opacity-90 transition-opacity shadow-sm"
                      onClick={onOpenSettings}
                    >
                      <Settings className="mr-2 h-5 w-5" />
                      Settings
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setTheme(theme === "dark" ? "light" : "dark");
                      }}
                      className="flex-shrink-0 hover:bg-muted/80 dark:hover:bg-gray-800/60"
                    >
                      {theme === "dark" ? (
                        <Sun className="h-5 w-5" />
                      ) : (
                        <Moon className="h-5 w-5" />
                      )}
                      <span className="sr-only">
                        {theme === "dark"
                          ? "Switch to light theme"
                          : "Switch to dark theme"}
                      </span>
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
