"use client";

import { useReducer, useEffect, useState, useCallback } from "react";
import { loadDatabase, type Database } from "@/lib/family-tree/database";
import { familyTreeReducer, type Action, type AppState } from "@/lib/family-tree/reducer";
import { TreeCanvas } from "./tree-canvas";
import { AddPersonDialog } from "./add-person-dialog";
import { PersonForm } from "./person-form";

const EMPTY_STATE: AppState = {
  db: { persons: [], relationships: [] },
  ui: { isFormOpen: false, editingPersonId: null, formMode: "create", viewport: { translateX: 0, translateY: 0, scale: 1 } },
};

export function FamilyTreeApp() {
  const [state, dispatch] = useReducer(familyTreeReducer, EMPTY_STATE);
  const [mounted, setMounted] = useState(false);
  const [showInitDialog, setShowInitDialog] = useState(false);

  const { db, ui } = state;

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadDatabase();
    dispatch({ type: "INIT", db: stored });
    setMounted(true);
  }, []);

  const handleAddRoot = useCallback(
    (name: string, gender: "male" | "female") => {
      dispatch({ type: "ADD_PERSON", name, gender });
      setShowInitDialog(false);
    },
    []
  );

  const handleClearTree = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("family-tree-db");
    }
    dispatch({ type: "INIT", db: { persons: [], relationships: [] } });
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

  if (!mounted) {
    return (
      <div className="family-tree-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  const isEmpty = db.persons.length === 0;

  // If the form is open and we're on the empty state (just added root), show form
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
          <h1>Phả hệ</h1>
        </div>
        <div className="header-actions">
          {!isEmpty && (
            <>
              {/* <button
                className="header-btn"
                onClick={() => setShowInitDialog(true)}
              >
                Add Root
              </button> */}
              {/* <button className="header-btn danger" onClick={handleClearTree}>
                Clear All
              </button> */}
            </>
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
            <button
              className="btn-add-root"
              onClick={() => setShowInitDialog(true)}
            >
              Add First Person
            </button>
          </div>
        ) : (
          <TreeCanvas db={db} ui={ui} dispatch={dispatch} />
        )}
      </main>

      <footer className="family-tree-footer">
        <span>Hỗ trợ cuộn chuột và cử chỉ chụm hai ngón để phóng to/thu nhỏ.</span>
        <span className="footer-separator">|</span>
        <span>Nhấn giữ và kéo để di chuyển</span>
      </footer>

      {showInitDialog && (
        <AddPersonDialog
          title="Add Person"
          onConfirm={handleAddRoot}
          onCancel={() => setShowInitDialog(false)}
        />
      )}

      {/* Show person form at app level if tree is empty (root just added) */}
      {isEmpty && ui.isFormOpen && editingPerson && (
        <PersonForm
          person={editingPerson}
          mode={ui.formMode}
          onSubmit={handlePersonFormSubmit}
          onClose={handlePersonFormClose}
        />
      )}
    </div>
  );
}
