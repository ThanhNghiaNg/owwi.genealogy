'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import {
  apiRequestOtp,
  apiVerifyOtp,
  apiLogout,
  apiLoadCloudToLocal,
  apiSyncLocalToCloud,
  ApiError,
  type AuthUser,
  type CloudDatabase,
} from '@/lib/api-client'

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated'

export type SyncState = 'idle' | 'prompting' | 'syncing' | 'done' | 'error'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  syncState: SyncState
  syncError: string | null
  cloudDatabase: CloudDatabase | null

  // Auth
  requestOtp: (email: string) => Promise<void>
  verifyOtp: (email: string, otp: string) => Promise<void>
  logout: () => Promise<void>

  // Sync
  acceptSync: (localData: { persons: unknown[]; relationships: unknown[] }) => Promise<void>
  discardLocalData: () => Promise<void>
  dismissSync: () => void
  promptSync: (localData: { persons: unknown[]; relationships: unknown[] }) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

const SESSION_KEY = 'auth_user'

function readStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch { return null }
}

function writeStoredUser(user: AuthUser | null): void {
  if (typeof window === 'undefined') return
  if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  else sessionStorage.removeItem(SESSION_KEY)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [cloudDatabase, setCloudDatabase] = useState<CloudDatabase | null>(null)
  const pendingLocalDataRef = useRef<{ persons: unknown[]; relationships: unknown[] } | null>(null)

  // On mount: kiểm tra cookie session
  useEffect(() => {
    const storedUser = readStoredUser()
    if (storedUser) {
      setUser(storedUser)
      setStatus('authenticated')
      // Load cloud data ngầm
      apiLoadCloudToLocal()
        .then((res) => setCloudDatabase(res.database))
        .catch(() => {
          // Cookie hết hạn
          setUser(null)
          writeStoredUser(null)
          setStatus('unauthenticated')
        })
    } else {
      // Thử verify cookie ngầm
      apiLoadCloudToLocal()
        .then((res) => {
          setCloudDatabase(res.database)
          setStatus('authenticated')
        })
        .catch(() => {
          setStatus('unauthenticated')
        })
    }
  }, [])

  const requestOtp = useCallback(async (email: string) => {
    await apiRequestOtp(email)
  }, [])

  const verifyOtp = useCallback(async (email: string, otp: string) => {
    const { user: loggedInUser } = await apiVerifyOtp(email, otp)
    setUser(loggedInUser)
    writeStoredUser(loggedInUser)
    setStatus('authenticated')
  }, [])

  const logout = useCallback(async () => {
    try { await apiLogout() } catch { /* clear anyway */ }
    setUser(null)
    writeStoredUser(null)
    setCloudDatabase(null)
    setSyncState('idle')
    setSyncError(null)
    setStatus('unauthenticated')
  }, [])

  const promptSync = useCallback(
    (localData: { persons: unknown[]; relationships: unknown[] }) => {
      pendingLocalDataRef.current = localData
      setSyncState('prompting')
    },
    []
  )

  const acceptSync = useCallback(
    async (localData: { persons: unknown[]; relationships: unknown[] }) => {
      setSyncState('syncing')
      setSyncError(null)
      console.log({localData})
      try {
        const res = await apiSyncLocalToCloud(localData)
        setCloudDatabase(res.database)
        setSyncState('done')
        pendingLocalDataRef.current = null
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Đồng bộ thất bại. Vui lòng thử lại.'
        setSyncError(message)
        setSyncState('error')
      }
    },
    []
  )

  const discardLocalData = useCallback(async () => {
    setSyncState('syncing')
    setSyncError(null)
    try {
      const res = await apiLoadCloudToLocal()
      setCloudDatabase(res.database)
      setSyncState('done')
      pendingLocalDataRef.current = null
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Không thể tải dữ liệu cloud.'
      setSyncError(message)
      setSyncState('error')
    }
  }, [])

  const dismissSync = useCallback(() => {
    setSyncState('idle')
    setSyncError(null)
    pendingLocalDataRef.current = null
  }, [])

  const value: AuthContextValue = {
    status, user, syncState, syncError, cloudDatabase,
    requestOtp, verifyOtp, logout,
    acceptSync, discardLocalData, dismissSync, promptSync,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
