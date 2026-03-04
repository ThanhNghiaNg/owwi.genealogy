"use client";

interface SyncModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onConfirmSync: () => Promise<void>;
  onDiscardLocal: () => Promise<void>;
}

export function SyncModal({
  isOpen,
  isSubmitting,
  onConfirmSync,
  onDiscardLocal,
}: SyncModalProps) {
  if (!isOpen) return null;

  return (
    <div className="family-tree-dialog-overlay">
      <div className="family-tree-dialog" role="dialog" aria-label="Sync local data">
        <h3 className="family-tree-dialog-title">Sync local data</h3>
        <p>Do you want to sync your local data to cloud?</p>
        <div className="family-tree-dialog-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => {
              void onDiscardLocal();
            }}
            disabled={isSubmitting}
          >
            No
          </button>
          <button
            type="button"
            className="btn-confirm"
            onClick={() => {
              void onConfirmSync();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Syncing..." : "Yes"}
          </button>
        </div>
      </div>
    </div>
  );
}
