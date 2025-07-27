import { useState, useEffect, useCallback, useMemo } from "react";

const STORAGE_KEY = "palette-folder-collapse-states";

interface FolderCollapseState {
  [folderId: string]: boolean;
}

// Singleton state to ensure all hook instances share the same state
let globalCollapsedFolders: FolderCollapseState = {};
let globalUncategorizedCollapsed = false;
let globalIsInitialized = false;
let listeners: Set<() => void> = new Set();

const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      globalCollapsedFolders = parsed.folders || {};
      globalUncategorizedCollapsed = parsed.uncategorized || false;
    }
  } catch (error) {
    console.error("Error loading folder collapse states:", error);
  }
  globalIsInitialized = true;
};

const saveToStorage = () => {
  if (!globalIsInitialized) return;

  try {
    const stateToStore = {
      folders: globalCollapsedFolders,
      uncategorized: globalUncategorizedCollapsed,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToStore));
  } catch (error) {
    console.error("Error saving folder collapse states:", error);
  }
};

// Load initial state
if (typeof window !== "undefined") {
  loadFromStorage();
}

export const useFolderCollapse = () => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => forceUpdate({});
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const toggleFolder = useCallback((folderId: string) => {
    globalCollapsedFolders = {
      ...globalCollapsedFolders,
      [folderId]: !globalCollapsedFolders[folderId],
    };
    saveToStorage();
    notifyListeners();
  }, []);

  const toggleUncategorized = useCallback(() => {
    globalUncategorizedCollapsed = !globalUncategorizedCollapsed;
    saveToStorage();
    notifyListeners();
  }, []);

  const isFolderCollapsed = useCallback((folderId: string) => {
    return globalCollapsedFolders[folderId] || false;
  }, []);

  const clearCollapseStates = useCallback(() => {
    globalCollapsedFolders = {};
    globalUncategorizedCollapsed = false;
    saveToStorage();
    notifyListeners();
  }, []);

  const memoizedReturn = useMemo(
    () => ({
      isFolderCollapsed,
      isUncategorizedCollapsed: globalUncategorizedCollapsed,
      toggleFolder,
      toggleUncategorized,
      clearCollapseStates,
    }),
    [isFolderCollapsed, toggleFolder, toggleUncategorized, clearCollapseStates]
  );

  return memoizedReturn;
};
