'use client'

import { useAuth } from '@/contexts/auth.context'
import { loadDatabase } from '@/lib/family-tree/database'

interface SyncModalProps {
  localPersonCount: number
  localRelationshipCount: number
  cloudPersonCount: number
  onClose?: () => void
}

export function SyncModal({
  localPersonCount,
  localRelationshipCount,
  cloudPersonCount,
  onClose,
}: SyncModalProps) {
  const { syncState, syncError, acceptSync, discardLocalData, dismissSync } = useAuth()

  const isLoading = syncState === 'syncing'
  const isDone = syncState === 'done'
  const isError = syncState === 'error'

  const localData = {
    persons: Array(localPersonCount).fill(null),
    relationships: Array(localRelationshipCount).fill(null),
  }

  const localDb = loadDatabase()

  if (isDone) {
    return (
      <div className="family-tree-dialog-overlay">
        <div className="family-tree-dialog" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <p style={{ color: 'var(--ft-text)', fontWeight: 600, fontSize: 16 }}>
            Đồng bộ thành công!
          </p>
          <p style={{ color: 'var(--ft-text-muted)', fontSize: 13, marginTop: 8 }}>
            Dữ liệu của bạn đã được lưu lên cloud.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="family-tree-dialog-overlay" onClick={!isLoading ? dismissSync : undefined}>
      <div
        className="family-tree-dialog"
        style={{ minWidth: 380 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Đồng bộ dữ liệu"
      >
        <h3 className="family-tree-dialog-title">
          {isLoading ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}
        </h3>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
            <p style={{ color: 'var(--ft-text-muted)', marginTop: 16, fontSize: 14 }}>
              Đang đồng bộ dữ liệu lên cloud...
            </p>
          </div>
        ) : isError ? (
          <>
            <p style={{ color: 'var(--ft-danger)', fontSize: 14, marginBottom: 16 }}>
              {syncError}
            </p>
            <div className="family-tree-dialog-actions">
              <button className="btn-cancel" onClick={dismissSync}>Đóng</button>
              <button
                className="btn-confirm"
                onClick={() => acceptSync(localDb)}
              >
                Thử lại
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--ft-text-muted)', fontSize: 14, marginBottom: 16 }}>
              Bạn đăng nhập với dữ liệu cục bộ hiện có. Chọn hành động:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div
                style={{
                  background: 'var(--ft-bg)',
                  border: '1px solid var(--ft-border)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--ft-text)', marginBottom: 4 }}>
                  📱 Dữ liệu cục bộ (thiết bị này)
                </div>
                <div style={{ color: 'var(--ft-text-muted)' }}>
                  {localPersonCount} thành viên · {localRelationshipCount} quan hệ
                </div>
              </div>

              {cloudPersonCount > 0 && (
                <div
                  style={{
                    background: 'var(--ft-bg)',
                    border: '1px solid var(--ft-border)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--ft-text)', marginBottom: 4 }}>
                    ☁️ Dữ liệu trên cloud
                  </div>
                  <div style={{ color: 'var(--ft-text-muted)' }}>
                    {cloudPersonCount} thành viên
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn-confirm"
                style={{ width: '100%' }}
                onClick={() => acceptSync(localData)}
              >
                Đồng bộ dữ liệu cục bộ lên cloud
              </button>
              {cloudPersonCount > 0 && (
                <button
                  className="btn-cancel"
                  style={{ width: '100%' }}
                  onClick={discardLocalData}
                >
                  Dùng dữ liệu cloud (xóa dữ liệu cục bộ)
                </button>
              )}
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--ft-text-muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '4px 0',
                }}
                onClick={dismissSync}
              >
                Bỏ qua, dùng cục bộ
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
