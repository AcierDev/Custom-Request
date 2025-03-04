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
  Eye,
  LogOut,
  User,
  ChevronDown,
  Save,
  PencilRuler,
  LogIn,
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
  { href: "/preview", icon: Eye, label: "Preview", hotkey: "2" },
  { href: "/design", icon: PencilRuler, label: "Design", hotkey: "3" },
  { href: "/palette", icon: Palette, label: "Palette", hotkey: "4" },
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

  const isInputElement = (element: Element | null): boolean => {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      element.getAttribute("contenteditable") === "true"
    );
  };

  const handleHotkey = useCallback(
    (key: string) => {
      const navItem = mainNavItems.find((item) => item.hotkey === key);
      if (navItem && "href" in navItem) {
        router.push(navItem.href);
      }
    },
    [router]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInputElement(document.activeElement)) {
        return;
      }

      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      const key = event.key;
      if (/^[1-9]$/.test(key)) {
        event.preventDefault();
        handleHotkey(key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleHotkey]);

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

    return (
      <Link
        href={href}
        className={`flex items-center rounded-lg px-3 py-4 text-sm font-medium ${
          activeTab === href
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-primary"
        } ${!isSidebarOpen ? "justify-center" : ""}`}
        onClick={handleClick}
      >
        <Icon
          className={`h-5 w-5 flex-shrink-0 ${
            !isSidebarOpen ? "mr-0" : "mr-3"
          }`}
        />
        {isSidebarOpen && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-16"
        } fixed h-screen transition-all duration-300 ease-in-out border-r dark:border-gray-800 border-gray-200 bg-white dark:bg-gradient-to-b dark:from-gray-800 dark:to-gray-600 hidden lg:block z-30`}
      >
        <div className="h-16 flex items-center justify-between px-4 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
          {isSidebarOpen && (
            <span className="text-lg font-bold cursor-pointer text-gray-900 dark:text-white hover:text-primary transition-colors">
              Everwood
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={`${
              isSidebarOpen ? "" : "mx-auto"
            } hover:bg-gray-200 dark:hover:bg-gray-800`}
          >
            {isSidebarOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle sidebar</span>
          </Button>
        </div>
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50/50 dark:bg-gradient-to-b dark:from-gray-950/90 dark:to-gray-950/70">
          <div className="flex-1 overflow-y-auto no-scrollbar px-3">
            <div className="flex flex-col space-y-1 py-2">
              {mainNavItems.map((item, index) =>
                item.type === "divider" ? (
                  <Separator
                    key={index}
                    className="my-2 bg-gray-200 dark:bg-gray-600"
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
          <div className="p-3 border-t border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/50">
            <div
              className={`${
                isSidebarOpen ? "flex gap-2" : "flex flex-col gap-2"
              }`}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-800"
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
                className={`flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 ${
                  isSidebarOpen ? "flex-1" : ""
                }`}
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
                      className="flex-shrink-0 p-0 h-9 w-9 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage
                          src={user.image || ""}
                          alt={user.name || user.email}
                        />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => router.push("/profile")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={handleSaveData}
                      disabled={isSaving}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      <span>{isSaving ? "Saving..." : "Save My Designs"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive focus:text-destructive"
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
                      className="flex-shrink-0 p-0 h-9 w-9 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                          G
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Guest User</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={() => router.push("/profile")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onClick={handleSaveData}
                      disabled={isSaving}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      <span>{isSaving ? "Saving..." : "Save My Designs"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-primary focus:text-primary"
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
                  className="flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-800"
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
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full flex h-14 items-center px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="hover:bg-gray-200 dark:hover:bg-gray-800"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <span
              className="text-xl font-bold mr-auto cursor-pointer text-gray-900 dark:text-white hover:text-primary transition-colors"
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
                    className="ml-auto mr-2 p-0 h-9 w-9 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.image || ""}
                        alt={user.name || user.email}
                      />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => router.push("/profile")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleSaveData}
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    <span>{isSaving ? "Saving..." : "Save My Designs"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
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
                    className="ml-auto mr-2 p-0 h-9 w-9 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                        G
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Guest User</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={handleSaveData}
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    <span>{isSaving ? "Saving..." : "Save My Designs"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-primary focus:text-primary"
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
                className="ml-auto"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Button>
            )}

            <SheetContent
              side="left"
              className="w-64 p-0 bg-white dark:bg-gradient-to-b dark:from-gray-800 dark:to-gray-600"
            >
              <div className="flex flex-col h-[100dvh] bg-gray-50/50 dark:bg-gradient-to-b dark:from-gray-950/90 dark:to-gray-950/70">
                <div className="flex-1 flex flex-col space-y-1 py-2 overflow-y-auto no-scrollbar">
                  {mainNavItems.map((item, index) =>
                    item.type === "divider" ? (
                      <Separator
                        key={index}
                        className="my-2 bg-gray-200 dark:bg-gray-600"
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
                <div className="p-4 border-t border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/50">
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90"
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
                      className="flex-shrink-0 hover:bg-gray-200 dark:hover:bg-gray-800"
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
