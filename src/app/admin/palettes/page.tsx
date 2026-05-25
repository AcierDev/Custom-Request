"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  FolderIcon,
  Loader2,
  Palette,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminColor = {
  id?: string;
  hex: string;
  name?: string;
};

type AdminPalette = {
  id: string;
  name: string;
  colors?: AdminColor[];
  createdAt?: string;
  updatedAt?: string;
  folderId?: string;
  isPublic?: boolean;
  versions?: Array<unknown>;
};

type AdminFolder = {
  id: string;
  name: string;
};

type AdminPaletteUser = {
  userId: string;
  email?: string;
  lastUpdated?: string;
  savedPalettes: AdminPalette[];
  paletteFolders: AdminFolder[];
};

const AKIVA_EMAIL = "akivaweil@gmail.com";
const ALLOWED_EMAILS = [AKIVA_EMAIL];

const normalizeEmail = (email?: string) => email?.trim().toLowerCase() ?? "";

const isAllowedEmail = (email?: string) =>
  Boolean(email && ALLOWED_EMAILS.includes(normalizeEmail(email)));

const isAkivaEmail = (email?: string) => normalizeEmail(email) === AKIVA_EMAIL;

const formatDate = (date?: string) => {
  if (!date) return "No date";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "No date";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const ownerLabel = (user: AdminPaletteUser) =>
  isAkivaEmail(user.email)
    ? `Akiva Weil (${AKIVA_EMAIL})`
    : user.email || `User ${user.userId.slice(0, 10)}`;

function PaletteSwatches({ colors }: { colors: AdminColor[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(36px,1fr))] gap-2">
      {colors.slice(0, 18).map((color, index) => (
        <div key={color.id ?? `${color.hex}-${index}`} className="min-w-0">
          <div
            className="h-10 rounded-md border border-white/15 shadow-inner"
            style={{ backgroundColor: color.hex }}
            title={`${color.name || "Untitled color"} ${color.hex}`}
          />
          <div className="mt-1 truncate text-[11px] text-slate-400">
            {color.name || color.hex}
          </div>
        </div>
      ))}
      {colors.length > 18 ? (
        <div className="flex h-10 items-center justify-center rounded-md border border-slate-700 text-xs text-slate-400">
          +{colors.length - 18}
        </div>
      ) : null}
    </div>
  );
}

function PaletteCard({
  palette,
  owner,
  isAkivaPalette,
}: {
  palette: AdminPalette;
  owner: string;
  isAkivaPalette: boolean;
}) {
  const colors = palette.colors ?? [];

  return (
    <article
      className={`rounded-lg border p-4 ${
        isAkivaPalette
          ? "border-sky-500/35 bg-sky-950/20"
          : "border-slate-800 bg-slate-950/70"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={`mb-2 inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
              isAkivaPalette
                ? "border-sky-400/40 bg-sky-500/10 text-sky-200"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {isAkivaPalette ? <ShieldCheck className="h-3.5 w-3.5" /> : null}
            <span className="truncate">
              {isAkivaPalette ? "Akiva's palette" : `Owner: ${owner}`}
            </span>
          </div>
          <h3 className="truncate text-base font-semibold text-slate-100">
            {palette.name || "Untitled Palette"}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {colors.length} colors · {palette.versions?.length ?? 1}{" "}
            version{(palette.versions?.length ?? 1) === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">
          {palette.isPublic ? "Public" : "Private"}
        </div>
      </div>

      <div className="mt-4">
        <PaletteSwatches colors={colors} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>Created {formatDate(palette.createdAt)}</span>
        <span>Updated {formatDate(palette.updatedAt)}</span>
      </div>
    </article>
  );
}

function UserPaletteSection({
  user,
  isAkivaSection,
}: {
  user: AdminPaletteUser;
  isAkivaSection: boolean;
}) {
  const owner = ownerLabel(user);
  const folderById = new Map(
    user.paletteFolders.map((folder) => [folder.id, folder])
  );
  const palettesByFolder = new Map<string, AdminPalette[]>();

  user.savedPalettes.forEach((palette) => {
    const folderId =
      palette.folderId && folderById.has(palette.folderId)
        ? palette.folderId
        : "unorganized";
    palettesByFolder.set(folderId, [
      ...(palettesByFolder.get(folderId) ?? []),
      palette,
    ]);
  });

  const folderEntries = [
    ...user.paletteFolders
      .filter((folder) => palettesByFolder.has(folder.id))
      .map((folder) => [folder.id, folder.name] as const),
    ...(palettesByFolder.has("unorganized")
      ? [["unorganized", "Unorganized"] as const]
      : []),
  ];

  return (
    <section
      className={`py-8 ${
        isAkivaSection
          ? "rounded-xl border border-sky-500/35 bg-sky-950/10 px-4 sm:px-6"
          : "border-t border-slate-800"
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-semibold text-white">
              {isAkivaSection ? "Akiva's palettes" : owner}
            </h2>
            {isAkivaSection ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Akiva's account
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {isAkivaSection ? `${owner} · ` : ""}
            {user.savedPalettes.length} saved palette
            {user.savedPalettes.length === 1 ? "" : "s"} · last saved{" "}
            {formatDate(user.lastUpdated)}
          </p>
        </div>
        <div className="max-w-full overflow-hidden text-ellipsis rounded-md border border-slate-800 px-3 py-2 text-xs text-slate-400">
          {user.userId}
        </div>
      </div>

      <div className="mt-6 space-y-7">
        {folderEntries.map(([folderId, folderName]) => {
          const palettes = palettesByFolder.get(folderId) ?? [];
          return (
            <div key={folderId}>
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
                <FolderIcon className="h-4 w-4" />
                <span>{folderName}</span>
                <span className="text-slate-500">({palettes.length})</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {palettes.map((palette) => (
                  <PaletteCard
                    key={palette.id}
                    palette={palette}
                    owner={owner}
                    isAkivaPalette={isAkivaSection}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function AdminPalettesPage() {
  const { user, isLoading } = useAuth();
  const [users, setUsers] = useState<AdminPaletteUser[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const canView = isAllowedEmail(user?.email);

  useEffect(() => {
    if (isLoading || !user || !canView) return;
    const userEmail = user.email;

    async function loadPalettes() {
      setIsFetching(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/palettes", {
          headers: {
            "x-user-email": userEmail,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load palettes");
        }

        setUsers(data.users || []);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load palettes"
        );
      } finally {
        setIsFetching(false);
      }
    }

    loadPalettes();
  }, [canView, isLoading, user]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const usersWithPalettes = users.filter((entry) => entry.savedPalettes.length > 0);

    if (!normalizedQuery) return usersWithPalettes;

    return usersWithPalettes
      .map((entry) => ({
        ...entry,
        savedPalettes: entry.savedPalettes.filter((palette) => {
          const owner = ownerLabel(entry).toLowerCase();
          const paletteName = palette.name?.toLowerCase() ?? "";
          const colors = (palette.colors ?? [])
            .map((color) => `${color.name ?? ""} ${color.hex}`)
            .join(" ")
            .toLowerCase();

          return (
            owner.includes(normalizedQuery) ||
            paletteName.includes(normalizedQuery) ||
            colors.includes(normalizedQuery)
          );
        }),
      }))
      .filter((entry) => entry.savedPalettes.length > 0);
  }, [query, users]);

  const isAkivaUser = (entry: AdminPaletteUser) =>
    isAkivaEmail(entry.email) ||
    (isAkivaEmail(user?.email) && entry.userId === user?.id);
  const akivaUsers = filteredUsers.filter(isAkivaUser);
  const otherUsers = filteredUsers.filter((entry) => !isAkivaUser(entry));
  const akivaPaletteCount = akivaUsers.reduce(
    (sum, entry) => sum + entry.savedPalettes.length,
    0
  );
  const otherPaletteCount = otherUsers.reduce(
    (sum, entry) => sum + entry.savedPalettes.length,
    0
  );

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (!user || !canView) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-200">
        <div className="mx-auto max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-6">
          <AlertTriangle className="h-8 w-8 text-amber-300" />
          <h1 className="mt-4 text-2xl font-semibold text-white">
            Palette archive access
          </h1>
          <p className="mt-2 text-slate-400">
            Sign in with an approved email address to view saved palettes across
            users.
          </p>
          <Button asChild className="mt-6">
            <a href="/sign-in">Sign in</a>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-200 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-sky-300">
              <Palette className="h-4 w-4" />
              All saved palettes
            </div>
            <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
              Palette archive
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Organized by user, folder, and saved palette.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex">
            <div className="rounded-lg border border-sky-500/35 bg-sky-950/20 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-sky-200">
                <ShieldCheck className="h-4 w-4" />
                Akiva's palettes
              </div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {akivaPaletteCount}
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Users className="h-4 w-4" />
                Other users
              </div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {otherUsers.length}
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 px-4 py-3">
              <div className="text-xs text-slate-400">Other palettes</div>
              <div className="mt-1 text-2xl font-semibold text-white">
                {otherPaletteCount}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users, palettes, colors, or hex values"
            className="w-full max-w-xl border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500"
          />
          {isFetching ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading palettes
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="mt-8 rounded-lg border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {!isFetching && !error && filteredUsers.length === 0 ? (
          <div className="mt-10 rounded-lg border border-slate-800 p-8 text-center text-slate-400">
            No saved palettes found.
          </div>
        ) : null}

        <div className="mt-8 space-y-10">
          {akivaUsers.map((entry) => (
            <UserPaletteSection
              key={entry.userId}
              user={entry}
              isAkivaSection
            />
          ))}

          {otherUsers.length > 0 ? (
            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium uppercase tracking-normal text-slate-500">
                <Users className="h-4 w-4" />
                Other users
              </div>
              {otherUsers.map((entry) => (
                <UserPaletteSection
                  key={entry.userId}
                  user={entry}
                  isAkivaSection={false}
                />
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
