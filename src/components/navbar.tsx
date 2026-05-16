"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import {
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
import { motion } from "framer-motion";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  linkRef?: (el: HTMLAnchorElement | null) => void;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isGuest } = useAuth();
  const [activeTab, setActiveTab] = useState(pathname);
  const [navigationSequence, setNavigationSequence] = useState<string[]>([]);
  const saveToDatabase = useCustomStore((state) => state.saveToDatabase);
  const [isSaving, setIsSaving] = useState(false);
  // Sidebar is permanently collapsed — no toggle.
  const isSidebarOpen = false;

  useEffect(() => {
    setActiveTab(pathname);
  }, [pathname]);

  // Sliding active-indicator for the main nav. Measured from the real
  // item rects so it's exact regardless of padding/gap, and driven by
  // state (not framer's shared-layout) so route-change remounts of the
  // inner links don't make it jump.
  const navListRef = useRef<HTMLDivElement | null>(null);
  const navItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{
    top: number;
    height: number;
    visible: boolean;
  }>({ top: 0, height: 0, visible: false });

  const activeMainIndex = mainNavItems.findIndex(
    (item) => "href" in item && item.href === activeTab
  );

  useLayoutEffect(() => {
    const list = navListRef.current;
    const el = navItemRefs.current[activeMainIndex];
    if (!list || !el || activeMainIndex < 0) {
      setIndicator((p) => ({ ...p, visible: false }));
      return;
    }
    const listRect = list.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicator({
      top: elRect.top - listRect.top,
      height: elRect.height,
      visible: true,
    });
  }, [activeMainIndex, activeTab, pathname]);

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
    linkRef,
  }: NavLinkProps) => {
    if (!href) return null;

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      const newSequence = [...navigationSequence.slice(-3), href];
      setNavigationSequence(newSequence);
      router.push(href);
    };

    const isActive = activeTab === href;

    const link = (
      <Link
        href={href}
        ref={linkRef}
        onClick={handleClick}
        className={cn(
          "relative flex items-center w-full rounded-lg text-sm font-medium px-3 py-3 transition-colors duration-200 group",
          outlined && "border border-white/10 bg-white/[0.03] [&>span]:opacity-80",
          isCollapsed ? "justify-center" : "",
          isActive
            ? "text-blue-200"
            : "text-muted-foreground hover:bg-gray-800/50 hover:text-primary"
        )}
      >
        <Icon
          className={cn(
            "relative z-10 h-5 w-5 flex-shrink-0 transition-transform duration-200",
            isActive ? "scale-110" : "group-hover:scale-105",
            isCollapsed ? "mr-0" : "mr-3"
          )}
        />
        {!isCollapsed && <span className="relative z-10">{label}</span>}
      </Link>
    );

    // Collapsed rail hides labels — surface them on hover so the icons
    // are identifiable.
    if (!isCollapsed) return link;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 h-screen transition-[width] duration-300 ease-in-out hidden lg:block z-30 overflow-hidden bg-gray-900/30 backdrop-blur-xl backdrop-saturate-150 border-r border-white/10 shadow-glass-dark",
          isSidebarOpen ? "w-36" : "w-[4.5rem]"
        )}
      >
        <div className="h-16 flex items-center justify-center px-4 border-b border-white/5">
          <span
            className="text-xl font-bold cursor-pointer bg-clip-text text-transparent bg-gradient-to-br from-white to-blue-300 [-webkit-text-fill-color:transparent] hover:opacity-80 transition-opacity tracking-tight"
            onClick={() => router.push("/welcome")}
          >
            E
          </span>
        </div>
        <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex-1 overflow-hidden px-1.5 flex flex-col justify-center">
            <div
              ref={navListRef}
              className="relative flex flex-col space-y-1 py-2"
            >
              {indicator.visible && (
                <motion.div
                  aria-hidden
                  className="absolute left-0 right-0 rounded-lg bg-blue-900/30 pointer-events-none"
                  initial={false}
                  animate={{ top: indicator.top, height: indicator.height }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                >
                  <span className="absolute inset-y-0 left-0 w-1 bg-blue-500 rounded-r-full" />
                </motion.div>
              )}
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
                    linkRef={(el) => {
                      navItemRefs.current[index] = el;
                    }}
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
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-gray-900/30 backdrop-blur-xl backdrop-saturate-150 shadow-glass-dark">
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
              className="w-64 p-0 bg-gray-900/40 backdrop-blur-xl backdrop-saturate-150 border-r border-white/10 shadow-glass-dark"
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
    </TooltipProvider>
  );
}
