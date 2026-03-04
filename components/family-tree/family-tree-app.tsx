"use client";

import { useReducer, useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  loadDatabase,
  saveDatabase,
  type Database,
} from "@/lib/family-tree/database";
import {
  familyTreeReducer,
  type AppState,
} from "@/lib/family-tree/reducer";
import { TreeCanvas } from "./tree-canvas";
import { AddPersonDialog } from "./add-person-dialog";
import { PersonForm } from "./person-form";
import { useAuth } from "@/contexts/auth-context";
import { LoginModal } from "@/components/auth/login-modal";
import { SyncModal } from "@/components/auth/sync-modal";
import { apiClient } from "@/lib/api/client";
import { FAMILY_TREE_STORAGE_KEY, getSyncDecisionKey } from "@/lib/family-tree/storage-keys";

const EMPTY_STATE: AppState = {
  db: { persons: [], relationships: [] },
  ui: {
    isFormOpen: false,
    editingPersonId: null,
    formMode: "create",
    viewport: { translateX: 0, translateY: 0, scale: 1 },
  },
};

function hasData(db: Database): boolean {
  return db.persons.length > 0 || db.relationships.length > 0;
}

export function FamilyTreeApp() {
  const [state, dispatch] = useReducer(familyTreeReducer, EMPTY_STATE);
  const [mounted, setMounted] = useState(false);
  const [showInitDialog, setShowInitDialog] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();
  const lastCloudSnapshotRef = useRef<string>("");

  const { db, ui } = state;

  useEffect(() => {
    const stored = loadDatabase();
    dispatch({ type: "INIT", db: stored });
    lastCloudSnapshotRef.current = JSON.stringify(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(window.navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const applyCloudSnapshot = useCallback((snapshot: Database) => {
    saveDatabase(snapshot);
    dispatch({ type: "INIT", db: snapshot });
    lastCloudSnapshotRef.current = JSON.stringify(snapshot);
  }, []);

  useEffect(() => {
    if (!mounted || isAuthLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      setCloudReady(false);
      setShowSyncModal(false);
      return;
    }

    if (!isOnline) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const syncDecisionKey = getSyncDecisionKey(user.id);
        const hasDecidedSync = localStorage.getItem(syncDecisionKey) === "1";
        const localDb = loadDatabase();

        if (!hasDecidedSync && hasData(localDb)) {
          if (!cancelled) {
            setShowSyncModal(true);
            setCloudReady(false);
          }
          return;
        }

        const cloud = await apiClient.getTree();
        if (!cancelled) {
          applyCloudSnapshot(cloud);
          localStorage.setItem(syncDecisionKey, "1");
          setCloudReady(true);
        }
      } catch (error) {
        console.error("Failed to hydrate cloud tree", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, isAuthLoading, isAuthenticated, user, isOnline, applyCloudSnapshot]);

  const cloudSyncEnabled = useMemo(
    () => mounted && isAuthenticated && Boolean(user) && cloudReady && isOnline && !showSyncModal,
    [mounted, isAuthenticated, user, cloudReady, isOnline, showSyncModal]
  );

  useEffect(() => {
    if (!cloudSyncEnabled) {
      return;
    }

    const serialized = JSON.stringify(db);
    if (serialized === lastCloudSnapshotRef.current) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        await apiClient.replaceTree(db);
        lastCloudSnapshotRef.current = serialized;
      } catch (error) {
        console.error("Failed to sync tree to cloud", error);
      }
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [db, cloudSyncEnabled]);

  const handleSyncYes = useCallback(async () => {
    if (!user) return;

    setIsSyncing(true);
    try {
      const cloud = await apiClient.sync(db);
      applyCloudSnapshot(cloud);
      localStorage.setItem(getSyncDecisionKey(user.id), "1");
      setShowSyncModal(false);
      setCloudReady(true);
    } finally {
      setIsSyncing(false);
    }
  }, [user, db, applyCloudSnapshot]);

  const handleSyncNo = useCallback(async () => {
    if (!user) return;

    setIsSyncing(true);
    try {
      const cloud = await apiClient.getTree();
      applyCloudSnapshot(cloud);
      localStorage.setItem(getSyncDecisionKey(user.id), "1");
      setShowSyncModal(false);
      setCloudReady(true);
    } finally {
      setIsSyncing(false);
    }
  }, [user, applyCloudSnapshot]);

  const handleAddRoot = useCallback((name: string, gender: "male" | "female") => {
    dispatch({ type: "ADD_PERSON", name, gender });
    setShowInitDialog(false);
  }, []);

  const handleClearTree = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(FAMILY_TREE_STORAGE_KEY);
    }
    dispatch({ type: "INIT", db: { persons: [], relationships: [] } });
    lastCloudSnapshotRef.current = JSON.stringify({ persons: [], relationships: [] });
  }, []);

  const handlePersonFormSubmit = useCallback(
    (
      personId: string,
      updates: Partial<Omit<import("@/lib/family-tree/database").Person, "id" | "createdAt">>
    ) => {
      dispatch({ type: "UPDATE_PERSON", personId, updates });
      dispatch({ type: "CLOSE_PERSON_FORM" });
    },
    []
  );

  const handlePersonFormClose = useCallback(() => {
    dispatch({ type: "CLOSE_PERSON_FORM" });
  }, []);

  if (!mounted || isAuthLoading) {
    return (
      <div className="family-tree-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  const isEmpty = db.persons.length === 0;
  const editingPerson =
    ui.isFormOpen && ui.editingPersonId
      ? db.persons.find((p) => p.id === ui.editingPersonId) ?? null
      : null;

  return (
    <div className="family-tree-app">
      <header className="family-tree-header">
        <div className="header-left">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2C10.34 2 9 3.34 9 5C9 6.3 9.84 7.4 11 7.82V10H8C5.24 10 3 12.24 3 15V16.18C1.84 16.6 1 17.7 1 19C1 20.66 2.34 22 4 22C5.66 22 7 20.66 7 19C7 17.7 6.16 16.6 5 16.18V15C5 13.35 6.35 12 8 12H11V16.18C9.84 16.6 9 17.7 9 19C9 20.66 10.34 22 12 22C13.66 22 15 20.66 15 19C15 17.7 14.16 16.6 13 16.18V12H16C17.65 12 19 13.35 19 15V16.18C17.84 16.6 17 17.7 17 19C17 20.66 18.34 22 20 22C21.66 22 23 20.66 23 19C23 17.7 22.16 16.6 21 16.18V15C21 12.24 18.76 10 16 10H13V7.82C14.16 7.4 15 6.3 15 5C15 3.34 13.66 2 12 2Z" fill="currentColor" />
          </svg>
          <h1>Pha he</h1>
        </div>

        <div className="header-actions" style={{ display: "flex", gap: 8 }}>
          <span style={{ fontSize: 12, opacity: 0.8 }}>{isOnline ? "Online" : "Offline"}</span>
          {!isEmpty && (
            <button className="header-btn danger" onClick={handleClearTree}>
              Clear local
            </button>
          )}
          {isAuthenticated ? (
            <button
              className="header-btn"
              onClick={() => {
                void logout();
              }}
            >
              Logout
            </button>
          ) : (
            <button className="header-btn" onClick={() => setShowLoginModal(true)}>
              Login
            </button>
          )}
        </div>
      </header>

      <main className="family-tree-main">
        {isEmpty ? (
          <div className="family-tree-empty">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2C10.34 2 9 3.34 9 5C9 6.3 9.84 7.4 11 7.82V10H8C5.24 10 3 12.24 3 15V16.18C1.84 16.6 1 17.7 1 19C1 20.66 2.34 22 4 22C5.66 22 7 20.66 7 19C7 17.7 6.16 16.6 5 16.18V15C5 13.35 6.35 12 8 12H11V16.18C9.84 16.6 9 17.7 9 19C9 20.66 10.34 22 12 22C13.66 22 15 20.66 15 19C15 17.7 14.16 16.6 13 16.18V12H16C17.65 12 19 13.35 19 15V16.18C17.84 16.6 17 17.7 17 19C17 20.66 18.34 22 20 22C21.66 22 23 20.66 23 19C23 17.7 22.16 16.6 21 16.18V15C21 12.24 18.76 10 16 10H13V7.82C14.16 7.4 15 6.3 15 5C15 3.34 13.66 2 12 2Z" fill="currentColor" />
              </svg>
            </div>
            <h2>Start Your Family Tree</h2>
            <p>Add the first person to begin building your family tree.</p>
            <button className="btn-add-root" onClick={() => setShowInitDialog(true)}>
              Add First Person
            </button>
          </div>
        ) : (
          <TreeCanvas db={db} ui={ui} dispatch={dispatch} />
        )}
      </main>

      <footer className="family-tree-footer">
        <span>Use mouse wheel or pinch to zoom in and out.</span>
        <span className="footer-separator">|</span>
        <span>Drag on empty space to pan</span>
      </footer>

      {showInitDialog && (
        <AddPersonDialog
          title="Add Person"
          onConfirm={handleAddRoot}
          onCancel={() => setShowInitDialog(false)}
        />
      )}

      {isEmpty && ui.isFormOpen && editingPerson && (
        <PersonForm
          person={editingPerson}
          mode={ui.formMode}
          onSubmit={handlePersonFormSubmit}
          onClose={handlePersonFormClose}
        />
      )}

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />

      <SyncModal
        isOpen={showSyncModal}
        isSubmitting={isSyncing}
        onConfirmSync={handleSyncYes}
        onDiscardLocal={handleSyncNo}
      />
    </div>
  );
}
