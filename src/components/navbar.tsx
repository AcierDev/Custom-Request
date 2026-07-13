"use client";

import { useState } from "react";
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
  railLabel: string;
};

type DividerItem = NavItemBase & {
  type: "divider";
};

type NavItem = NavLinkItem | DividerItem;

const mainNavItems: NavItem[] = [
  {
    href: "/palette",
    icon: Palette,
    label: "Palette",
    railLabel: "Palette",
    hotkey: "5",
  },
  {
    href: "/viewer",
    icon: PencilRuler,
    label: "Viewer",
    railLabel: "Viewer",
    hotkey: "1",
  },
];

const bottomNavItems: NavItem[] = [
  {
    href: "/draw-pattern",
    icon: Pencil,
    label: "Draw Pattern",
    railLabel: "Draw",
    hotkey: "6",
  },
  {
    href: "/paint-selector",
    icon: Paintbrush,
    label: "Paint Colors",
    railLabel: "Paint",
    hotkey: "7",
  },
];

const NAV_TOOLTIP_DELAY_MS = 200;

interface NavLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  railLabel: string;
  isCollapsed: boolean;
  outlined?: boolean;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, isGuest } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const saveToDatabase = useCustomStore((state) => state.saveToDatabase);
  const [isSaving, setIsSaving] = useState(false);

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
    railLabel,
    isCollapsed,
    outlined,
  }: NavLinkProps) => {
    if (!href) return null;

    const handleClick = () => {
      setMobileMenuOpen(false);
    };

    const isActive = pathname === href || pathname.startsWith(`${href}/`);

    const link = (
      <Link
        href={href}
        onClick={handleClick}
        aria-label={label}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative flex w-full items-center rounded-lg border text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400",
          isCollapsed
            ? "min-h-[var(--desktop-nav-rail-item-min-height)] flex-col justify-center gap-1 px-1.5 py-2"
            : "border-transparent px-3 py-3",
          outlined && !isCollapsed && "border-white/10 bg-white/[0.03]",
          isActive
            ? "border-sky-400/60 bg-sky-500/15 text-sky-100"
            : isCollapsed
              ? "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:bg-white/[0.09] hover:text-white"
              : "text-muted-foreground hover:border-white/10 hover:bg-gray-800/50 hover:text-primary"
        )}
      >
        {isActive && isCollapsed && (
          <span
            aria-hidden
            className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-sky-400"
          />
        )}
        <Icon
          className={cn(
            "relative z-10 h-5 w-5 flex-shrink-0 transition-transform duration-200",
            isActive ? "scale-110" : "group-hover:scale-105",
            isCollapsed ? "mr-0" : "mr-3"
          )}
        />
        <span
          className={cn(
            "relative z-10 max-w-full truncate",
            isCollapsed
              ? "text-xs font-semibold leading-none tracking-tight"
              : ""
          )}
        >
          {isCollapsed ? railLabel : label}
        </span>
      </Link>
    );

    if (!isCollapsed) return link;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={NAV_TOOLTIP_DELAY_MS}>
      <aside
        aria-label="Application navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden h-screen w-[var(--desktop-nav-rail-width)] flex-col overflow-hidden border-r border-white/15 bg-gray-900/80 shadow-glass-dark backdrop-blur-xl backdrop-saturate-150 lg:flex"
        )}
      >
        <div className="flex h-16 flex-none items-center justify-center border-b border-white/5 px-4">
          <Link
            href="/welcome"
            aria-label="Everwood home"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl font-bold tracking-tight text-sky-100 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400"
          >
            E
          </Link>
        </div>
        <div className="mx-4 my-2 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden px-1.5">
            <nav
              aria-label="Primary"
              className="relative flex flex-col space-y-1 py-2"
            >
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
                    railLabel={"railLabel" in item ? item.railLabel : ""}
                    isCollapsed
                  />
                )
              )}
            </nav>
          </div>
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="px-1.5 pt-2 pb-2">
            <nav aria-label="Creative tools" className="flex flex-col space-y-2">
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
                    railLabel={"railLabel" in item ? item.railLabel : ""}
                    isCollapsed
                    outlined
                  />
                )
              )}
            </nav>
          </div>
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="p-3">
            <div className="flex flex-col gap-2">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Open account menu"
                      className="h-[var(--desktop-nav-rail-account-target-size)] w-full flex-shrink-0 rounded-lg p-0 hover:bg-gray-800/60 focus-visible:ring-sky-400"
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
                      aria-label="Open guest menu"
                      className="h-[var(--desktop-nav-rail-account-target-size)] w-full flex-shrink-0 rounded-lg p-0 hover:bg-gray-800/60 focus-visible:ring-sky-400"
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

      <nav className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b border-white/10 bg-gray-900/30 backdrop-blur-xl backdrop-saturate-150 shadow-glass-dark">
        <div className="w-full flex h-14 items-center px-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
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
                        railLabel={"railLabel" in item ? item.railLabel : ""}
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
                          railLabel={"railLabel" in item ? item.railLabel : ""}
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
