"use client";

import { useState, useRef, useEffect } from "react";

interface AddPersonDialogProps {
  title: string;
  onConfirm: (name: string, gender: "male" | "female") => void;
  onCancel: () => void;
}

export function AddPersonDialog({
  title,
  onConfirm,
  onCancel,
}: AddPersonDialogProps) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(trimmed, gender);
    }
  }

  return (
    <div className="family-tree-dialog-overlay" onClick={onCancel}>
      <div
        className="family-tree-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <h3 className="family-tree-dialog-title">{title}</h3>
        <form onSubmit={handleSubmit}>
          <div className="family-tree-dialog-field">
            <label htmlFor="person-name">Name</label>
            <input
              ref={inputRef}
              id="person-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
              autoComplete="off"
            />
          </div>
          <div className="family-tree-dialog-field">
            <label>Gender</label>
            <div className="family-tree-dialog-gender">
              <button
                type="button"
                className={`gender-btn male ${gender === "male" ? "active" : ""}`}
                onClick={() => setGender("male")}
              >
                Male
              </button>
              <button
                type="button"
                className={`gender-btn female ${gender === "female" ? "active" : ""}`}
                onClick={() => setGender("female")}
              >
                Female
              </button>
            </div>
          </div>
          <div className="family-tree-dialog-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-confirm"
              disabled={!name.trim()}
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
