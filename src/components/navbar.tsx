"use client";

import { useState, useEffect } from "react";
import { useSidebar } from "@/contexts/sidebar-context";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Palette,
  LogOut,
  User,
  Save,
  PencilRuler,
  LogIn,
  Pencil,
  Paintbrush,
} from "lucide-react";
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
  { href: "/palette", icon: Palette, label: "Palette", hotkey: "5" },
  { href: "/viewer", icon: PencilRuler, label: "Viewer", hotkey: "1" },
];

const bottomNavItems: NavItem[] = [
  { href: "/draw-pattern", icon: Pencil, label: "Draw Pattern", hotkey: "6" },
  {
    href: "/paint-selector",
    icon: Paintbrush,
    label: "Paint Colors",
    hotkey: "7",
  },
];

interface NavLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isCollapsed: boolean;
  outlined?: boolean;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isGuest } = useAuth();
  const [activeTab, setActiveTab] = useState(pathname);
  const [navigationSequence, setNavigationSequence] = useState<string[]>([]);
  const saveToDatabase = useCustomStore((state) => state.saveToDatabase);
  const [isSaving, setIsSaving] = useState(false);
  const sidebarContext = useSidebar();
  const [localSidebarOpen, setLocalSidebarOpen] = useState(true);
  const isSidebarOpen = sidebarContext?.isSidebarOpen ?? localSidebarOpen;
  const setIsSidebarOpen =
    sidebarContext?.setIsSidebarOpen ?? setLocalSidebarOpen;

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

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

  const NavLink = ({
    href,
    icon: Icon,
    label,
    isCollapsed,
    outlined,
  }: NavLinkProps) => {
    if (!href) return null;

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      const newSequence = [...navigationSequence.slice(-3), href];
      setNavigationSequence(newSequence);
      router.push(href);
    };

    const isActive = activeTab === href;

    return (
      <Link
        href={href}
        onClick={handleClick}
        className={cn(
          "relative flex items-center w-full rounded-lg text-sm font-medium px-3 py-3 transition-colors duration-200 group",
          outlined && "border border-white/10 bg-white/[0.03]",
          isCollapsed ? "justify-center" : "",
          isActive
            ? "bg-blue-900/30 text-blue-200"
            : "text-muted-foreground hover:bg-gray-800/50 hover:text-primary"
        )}
      >
        {isActive && (
          <span className="absolute inset-y-0 left-0 w-1 bg-blue-500 rounded-r-full" />
        )}
        <Icon
          className={cn(
            "h-5 w-5 flex-shrink-0 transition-transform duration-200",
            isActive ? "scale-110" : "group-hover:scale-105",
            isCollapsed ? "mr-0" : "mr-3"
          )}
        />
        {!isCollapsed && <span>{label}</span>}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 h-screen transition-[width] duration-300 ease-in-out hidden lg:block z-30 overflow-hidden bg-[hsl(var(--sidebar)/0.55)] backdrop-blur-xl backdrop-saturate-150 border-r border-white/10 shadow-glass-dark",
          isSidebarOpen ? "w-36" : "w-12"
        )}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          {isSidebarOpen && (
            <span
              className="text-lg font-bold cursor-pointer bg-clip-text text-transparent bg-gradient-to-br from-white to-blue-300 [-webkit-text-fill-color:transparent] hover:opacity-80 transition-opacity tracking-tight"
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
              "hover:bg-gray-800/60 text-gray-300",
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
        <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex-1 overflow-hidden px-3 flex flex-col justify-center">
            <div className="flex flex-col space-y-1 py-2">
              {mainNavItems.map((item, index) =>
                item.type === "divider" ? (
                  <Separator
                    key={index}
                    className="my-2 bg-white/10"
                    decorative
                  />
                ) : (
                  <NavLink
                    key={"href" in item ? item.href : index}
                    href={"href" in item ? item.href : ""}
                    icon={"icon" in item ? item.icon : Menu}
                    label={"label" in item ? item.label : ""}
                    isCollapsed={!isSidebarOpen}
                  />
                )
              )}
            </div>
          </div>
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="px-3 pt-2 pb-2">
            <div className="flex flex-col space-y-2">
              {bottomNavItems.map((item, index) =>
                item.type === "divider" ? (
                  <Separator
                    key={index}
                    className="my-2 bg-white/10"
                    decorative
                  />
                ) : (
                  <NavLink
                    key={"href" in item ? item.href : index}
                    href={"href" in item ? item.href : ""}
                    icon={"icon" in item ? item.icon : Menu}
                    label={"label" in item ? item.label : ""}
                    isCollapsed={!isSidebarOpen}
                    outlined
                  />
                )
              )}
            </div>
          </div>
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="p-3">
            <div
              className={cn("flex gap-2", !isSidebarOpen && "flex-col")}
            >
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 p-0 h-9 w-9 rounded-full hover:bg-gray-800/60"
                    >
                      <Avatar className="h-8 w-8 ring-1 ring-white/15">
                        <AvatarImage
                          src={user.image || ""}
                          alt={user.name || user.email}
                        />
                        <AvatarFallback className="text-xs bg-blue-900/40 text-blue-200">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 glass-surface rounded-xl"
                  >
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer focus:bg-white/10"
                      onClick={() => router.push("/profile")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer focus:bg-white/10"
                      onClick={handleSaveData}
                      disabled={isSaving}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      <span>{isSaving ? "Saving..." : "Save My Data"}</span>
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
                      className="flex-shrink-0 p-0 h-9 w-9 rounded-full hover:bg-gray-800/60"
                    >
                      <Avatar className="h-8 w-8 ring-1 ring-white/15">
                        <AvatarFallback className="text-xs bg-blue-900/40 text-blue-200">
                          G
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 glass-surface rounded-xl"
                  >
                    <DropdownMenuLabel>Guest User</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer focus:bg-white/10"
                      onClick={() => router.push("/profile")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer focus:bg-white/10"
                      onClick={handleSaveData}
                      disabled={isSaving}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      <span>{isSaving ? "Saving..." : "Save My Data"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-blue-300 focus:text-blue-200 focus:bg-blue-500/10"
                      onClick={() => router.push("/sign-in")}
                    >
                      <LogIn className="mr-2 h-4 w-4" />
                      <span>Sign in</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  size="icon"
                  onClick={() => router.push("/sign-in")}
                  className="sidebar-action-btn"
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
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-[hsl(var(--sidebar)/0.55)] backdrop-blur-xl backdrop-saturate-150 shadow-glass-dark">
        <div className="w-full flex h-14 items-center px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="hover:bg-gray-800/60 text-gray-200"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <span
              className="text-xl font-bold mr-auto cursor-pointer bg-clip-text text-transparent bg-gradient-to-br from-white to-blue-300 [-webkit-text-fill-color:transparent] tracking-tight ml-2"
              onClick={() => router.push("/viewer")}
            >
              Everwood
            </span>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto mr-2 p-0 h-9 w-9 rounded-full hover:bg-gray-800/60"
                  >
                    <Avatar className="h-8 w-8 ring-1 ring-white/15">
                      <AvatarImage
                        src={user.image || ""}
                        alt={user.name || user.email}
                      />
                      <AvatarFallback className="text-xs bg-blue-900/40 text-blue-200">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 glass-surface rounded-xl"
                >
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-white/10"
                    onClick={() => router.push("/profile")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-white/10"
                    onClick={handleSaveData}
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    <span>{isSaving ? "Saving..." : "Save My Data"}</span>
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
                    className="ml-auto mr-2 p-0 h-9 w-9 rounded-full hover:bg-gray-800/60"
                  >
                    <Avatar className="h-8 w-8 ring-1 ring-white/15">
                      <AvatarFallback className="text-xs bg-blue-900/40 text-blue-200">
                        G
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 glass-surface rounded-xl"
                >
                  <DropdownMenuLabel>Guest User</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-white/10"
                    onClick={handleSaveData}
                    disabled={isSaving}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    <span>{isSaving ? "Saving..." : "Save My Data"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer focus:bg-white/10"
                    onClick={() => router.push("/profile")}
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-blue-300 focus:text-blue-200 focus:bg-blue-500/10"
                    onClick={() => router.push("/sign-in")}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Sign in</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={() => router.push("/sign-in")}
                className="ml-auto sidebar-action-btn w-auto"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign in
              </Button>
            )}

            <SheetContent
              side="left"
              className="w-64 p-0 bg-[hsl(var(--sidebar)/0.7)] backdrop-blur-xl backdrop-saturate-150 border-r border-white/10 shadow-glass-dark"
            >
              <div className="h-16 flex items-center px-4 border-b border-white/5">
                <span className="text-lg font-bold cursor-pointer bg-clip-text text-transparent bg-gradient-to-br from-white to-blue-300 [-webkit-text-fill-color:transparent] tracking-tight">
                  Everwood
                </span>
              </div>
              <div className="flex flex-col h-[calc(100dvh-4rem)]">
                <div className="flex-1 flex flex-col space-y-1 py-2 px-3 overflow-y-auto no-scrollbar">
                  {mainNavItems.map((item, index) =>
                    item.type === "divider" ? (
                      <Separator
                        key={index}
                        className="my-2 bg-white/10"
                      />
                    ) : (
                      <NavLink
                        key={"href" in item ? item.href : index}
                        href={"href" in item ? item.href : ""}
                        icon={"icon" in item ? item.icon : Menu}
                        label={"label" in item ? item.label : ""}
                        isCollapsed={false}
                      />
                    )
                  )}
                </div>
                <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <div className="px-3 pt-2 pb-2">
                  <div className="flex flex-col space-y-2">
                    {bottomNavItems.map((item, index) =>
                      item.type === "divider" ? (
                        <Separator
                          key={index}
                          className="my-2 bg-white/10"
                        />
                      ) : (
                        <NavLink
                          key={"href" in item ? item.href : index}
                          href={"href" in item ? item.href : ""}
                          icon={"icon" in item ? item.icon : Menu}
                          label={"label" in item ? item.label : ""}
                          isCollapsed={false}
                          outlined
                        />
                      )
                    )}
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
