import type { Database } from "@/lib/family-tree/database";

export interface AuthMeResponse {
  ok: boolean;
  userId?: string | null;
  user?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
}

export interface FamilyTreeApiResponse {
  ok: boolean;
  familyTree: {
    id: string | null;
    name: string;
    description: string | null;
    data: Database;
    rootPersonId: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
  } | null;
}

export async function fetchCurrentUser() {
  const response = await fetch("/api/auth/me", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as AuthMeResponse;
  if (!data.ok || !data.userId) {
    return null;
  }

  return data;
}

export async function fetchServerFamilyTree(): Promise<Database | null> {
  const response = await fetch("/api/family-tree", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as FamilyTreeApiResponse;
  return payload.familyTree?.data ?? null;
}

export async function saveServerFamilyTree(data: Database): Promise<void> {
  const response = await fetch("/api/family-tree", {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    throw new Error("Failed to save family tree");
  }
}

export async function migrateFamilyTreeToServer(data: Database): Promise<{ migrated: boolean; familyTree: Database | null }> {
  const response = await fetch("/api/family-tree/migrate", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    throw new Error("Failed to migrate family tree");
  }

  const payload = (await response.json()) as FamilyTreeApiResponse & { migrated: boolean };
  return {
    migrated: payload.migrated,
    familyTree: payload.familyTree?.data ?? null,
  };
}
