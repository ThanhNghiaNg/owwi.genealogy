export const FAMILY_TREE_STORAGE_KEY = "family-tree-db";

export function getSyncDecisionKey(userId: string): string {
  return `family-tree-sync-decided:${userId}`;
}
