/**
 * API client cho Family Tree backend.
 * Tất cả requests dùng credentials: "include" để browser tự gửi httpOnly cookie.
 */

const API_BASE = '/api'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  })

  let body: unknown
  try { body = await res.json() } catch { body = {} }

  if (!res.ok) {
    const message = (body as { error?: string })?.error ?? `HTTP ${res.status}`
    throw new ApiError(res.status, message)
  }
  return body as T
}

// --------------- Auth ---------------

export interface AuthUser {
  id: string
  email: string
}

export async function apiRequestOtp(email: string): Promise<void> {
  await request('/auth/request-otp', { method: 'POST', body: JSON.stringify({ email }) })
}

export async function apiVerifyOtp(email: string, otp: string): Promise<{ user: AuthUser }> {
  return request<{ message: string; user: AuthUser }>('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp }),
  })
}

export async function apiLogout(): Promise<void> {
  await request('/auth/verify-otp', { method: 'DELETE' })
}

// --------------- Tree ---------------

export interface CloudPerson {
  id: string
  localId: string
  name: string
  gender: 'male' | 'female'
  birthYear: number | null
  nickname: string | null
  phone: string | null
  address: string | null
  isDeceased: boolean
  createdAt: number
}

export interface CloudRelationship {
  id: string
  localId: string
  type: 'parent' | 'spouse'
  person1Id: string
  person2Id: string
  localPerson1Id: string
  localPerson2Id: string
  orderIndex: number
}

export interface CloudDatabase {
  persons: CloudPerson[]
  relationships: CloudRelationship[]
}

export async function apiFetchTree(): Promise<CloudDatabase> {
  return request<CloudDatabase>('/tree')
}

export async function apiCreatePerson(
  input: Omit<CloudPerson, 'id' | 'createdAt'>
): Promise<CloudPerson> {
  return request<CloudPerson>('/tree/persons', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function apiUpdatePerson(
  personId: string,
  updates: Partial<Omit<CloudPerson, 'id' | 'localId' | 'createdAt'>>
): Promise<CloudPerson> {
  return request<CloudPerson>(`/tree/persons/${personId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}

export async function apiDeletePerson(personId: string): Promise<void> {
  await request(`/tree/persons/${personId}`, { method: 'DELETE' })
}

export async function apiCreateRelationship(
  input: Omit<CloudRelationship, 'id'>
): Promise<CloudRelationship> {
  return request<CloudRelationship>('/tree/relationships', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function apiDeleteRelationship(relationshipId: string): Promise<void> {
  await request(`/tree/relationships/${relationshipId}`, { method: 'DELETE' })
}

// --------------- Sync ---------------

export interface SyncResponse {
  message: string
  database: CloudDatabase
}

export async function apiSyncLocalToCloud(localData: {
  persons: unknown[]
  relationships: unknown[]
}): Promise<SyncResponse> {
  return request<SyncResponse>('/sync', {
    method: 'POST',
    body: JSON.stringify({ localData }),
  })
}

export async function apiLoadCloudToLocal(): Promise<{ database: CloudDatabase }> {
  return request<{ database: CloudDatabase }>('/sync')
}
