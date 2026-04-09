'use client'

import { useReducer, useEffect, useState, useCallback } from 'react'
import { loadDatabase, saveDatabase, type Database } from '@/lib/family-tree/database'
import { familyTreeReducer, type Action, type AppState } from '@/lib/family-tree/reducer'
import { useAuth } from '@/contexts/auth.context'
import { TreeCanvas } from './tree-canvas'
import { AddPersonDialog } from './add-person-dialog'
import { PersonForm } from './person-form'
import { LoginModal } from '@/components/auth/login-modal'
import { SyncModal } from '@/components/auth/sync-modal'

const EMPTY_STATE: AppState = {
  db: { persons: [], relationships: [] },
  ui: {
    isFormOpen: false,
    editingPersonId: null,
    formMode: 'create',
    viewport: { translateX: 0, translateY: 0, scale: 1 },
  },
}

// Convert cloud DB format to local DB format (using localId as primary key)
function cloudToLocal(cloudDb: { persons: unknown[]; relationships: unknown[] }): Database {
  const persons = (cloudDb.persons as Array<{
    localId: string
    name: string
    gender: 'male' | 'female'
    birthYear: number | null
    nickname: string | null
    phone: string | null
    address: string | null
    isDeceased: boolean
    createdAt: number
  }>).map((p) => ({
    id: p.localId,
    name: p.name,
    gender: p.gender,
    birthYear: p.birthYear,
    nickname: p.nickname,
    phone: p.phone,
    address: p.address,
    isDeceased: p.isDeceased,
    createdAt: p.createdAt,
  }))

  const relationships = (cloudDb.relationships as Array<{
    localId: string
    type: 'parent' | 'spouse'
    localPerson1Id: string
    localPerson2Id: string
    orderIndex: number
  }>).map((r) => ({
    id: r.localId,
    type: r.type,
    person1Id: r.localPerson1Id,
    person2Id: r.localPerson2Id,
    orderIndex: r.orderIndex,
  }))

  return { persons, relationships }
}

export function FamilyTreeApp() {
  const { status, user, syncState, cloudDatabase, logout, promptSync } = useAuth()
  const [state, dispatch] = useReducer(familyTreeReducer, EMPTY_STATE)
  const [mounted, setMounted] = useState(false)
  const [showInitDialog, setShowInitDialog] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [hasCheckedSync, setHasCheckedSync] = useState(false)

  const { db, ui } = state

  // Load initial data
  useEffect(() => {
    const localDb = loadDatabase()
    console.log("1 localDb: ",localDb)

    if (status === 'authenticated' && cloudDatabase) {
      // Use cloud data if available
      const localConverted = cloudToLocal(cloudDatabase as { persons: unknown[]; relationships: unknown[] })
      dispatch({ type: 'INIT', db: localConverted })
      saveDatabase(localConverted)
    } else {
      dispatch({ type: 'INIT', db: localDb })
    }

    setMounted(true)
  }, [status, cloudDatabase])

  // After login: check if local data should be synced
  useEffect(() => {
    if (!mounted || hasCheckedSync) return
    if (status !== 'authenticated') return

    setHasCheckedSync(true)
    const localDb = loadDatabase()
    console.log("2 localDb: ",localDb)

    if (localDb.persons.length > 0 && syncState === 'idle') {
      // Has local data → prompt sync
      promptSync({
        persons: localDb.persons,
        relationships: localDb.relationships,
      })
    }
  }, [status, mounted, hasCheckedSync, syncState, promptSync])

  // After sync done: reload from cloudDatabase
  useEffect(() => {
    if (syncState === 'done' && cloudDatabase) {
      const converted = cloudToLocal(cloudDatabase as { persons: unknown[]; relationships: unknown[] })
      dispatch({ type: 'INIT', db: converted })
      saveDatabase(converted)
    }
  }, [syncState, cloudDatabase])

  const handleAddRoot = useCallback((name: string, gender: 'male' | 'female') => {
    dispatch({ type: 'ADD_PERSON', name, gender })
    setShowInitDialog(false)
  }, [])

  const handlePersonFormSubmit = useCallback(
    (personId: string, updates: Partial<Omit<import('@/lib/family-tree/database').Person, 'id' | 'createdAt'>>) => {
      dispatch({ type: 'UPDATE_PERSON', personId, updates })
      dispatch({ type: 'CLOSE_PERSON_FORM' })
    },
    []
  )

  const handlePersonFormClose = useCallback(() => {
    dispatch({ type: 'CLOSE_PERSON_FORM' })
  }, [])

  if (!mounted) {
    return (
      <div className="family-tree-loading">
        <div className="loading-spinner" />
      </div>
    )
  }

  const isEmpty = db.persons.length === 0

  const editingPerson =
    ui.isFormOpen && ui.editingPersonId
      ? db.persons.find((p) => p.id === ui.editingPersonId) ?? null
      : null

  const showSyncModal =
    status === 'authenticated' &&
    (syncState === 'prompting' || syncState === 'syncing' || syncState === 'error' || syncState === 'done')

  const localDb = loadDatabase()
    console.log("3 localDb: ",localDb)

  console.log({localDb, cloudDatabase})

  return (
    <div className="family-tree-app">
      <header className="family-tree-header">
        <div className="header-left">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2C10.34 2 9 3.34 9 5C9 6.3 9.84 7.4 11 7.82V10H8C5.24 10 3 12.24 3 15V16.18C1.84 16.6 1 17.7 1 19C1 20.66 2.34 22 4 22C5.66 22 7 20.66 7 19C7 17.7 6.16 16.6 5 16.18V15C5 13.35 6.35 12 8 12H11V16.18C9.84 16.6 9 17.7 9 19C9 20.66 10.34 22 12 22C13.66 22 15 20.66 15 19C15 17.7 14.16 16.6 13 16.18V12H16C17.65 12 19 13.35 19 15V16.18C17.84 16.6 17 17.7 17 19C17 20.66 18.34 22 20 22C21.66 22 23 20.66 23 19C23 17.7 22.16 16.6 21 16.18V15C21 12.24 18.76 10 16 10H13V7.82C14.16 7.4 15 6.3 15 5C15 3.34 13.66 2 12 2Z"
              fill="currentColor"
            />
          </svg>
          <h1>Phả hệ</h1>
        </div>

        <div className="header-actions">
          {status === 'authenticated' && user ? (
            <>
              <span style={{ color: 'var(--ft-text-muted)', fontSize: 13 }}>{user.email}</span>
              <button className="header-btn" onClick={logout}>
                Đăng xuất
              </button>
            </>
          ) : status !== 'loading' ? (
            <button className="header-btn" onClick={() => setShowLoginModal(true)}>
              Đăng nhập
            </button>
          ) : null}
        </div>
      </header>

      <main className="family-tree-main">
        {isEmpty ? (
          <div className="family-tree-empty">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 2C10.34 2 9 3.34 9 5C9 6.3 9.84 7.4 11 7.82V10H8C5.24 10 3 12.24 3 15V16.18C1.84 16.6 1 17.7 1 19C1 20.66 2.34 22 4 22C5.66 22 7 20.66 7 19C7 17.7 6.16 16.6 5 16.18V15C5 13.35 6.35 12 8 12H11V16.18C9.84 16.6 9 17.7 9 19C9 20.66 10.34 22 12 22C13.66 22 15 20.66 15 19C15 17.7 14.16 16.6 13 16.18V12H16C17.65 12 19 13.35 19 15V16.18C17.84 16.6 17 17.7 17 19C17 20.66 18.34 22 20 22C21.66 22 23 20.66 23 19C23 17.7 22.16 16.6 21 16.18V15C21 12.24 18.76 10 16 10H13V7.82C14.16 7.4 15 6.3 15 5C15 3.34 13.66 2 12 2Z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h2>Bắt đầu xây dựng phả hệ</h2>
            <p>Thêm người đầu tiên để bắt đầu xây dựng cây phả hệ của bạn.</p>
            <button className="btn-add-root" onClick={() => setShowInitDialog(true)}>
              Thêm người đầu tiên
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
          title="Thêm người"
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

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}

      {showSyncModal && (
        <SyncModal
          localPersonCount={localDb.persons.length}
          localRelationshipCount={localDb.relationships.length}
          cloudPersonCount={cloudDatabase?.persons?.length ?? 0}
        />
      )}
    </div>
  )
}
