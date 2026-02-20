// Pure JS tree layout engine
// Computes x, y positions for every node in the family tree
// Handles spouse grouping and subtree width calculation

import type { Database, Person } from "./database";
import { getSpouse, getChildren, getCoupleChildren, getParentIds } from "./database";

export interface LayoutNode {
  x: number;
  y: number;
  width: number;
}

export type LayoutMap = Record<string, LayoutNode>;

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;
const H_GAP = 24;
const V_GAP = 80;
const SPOUSE_GAP = 8;

interface SubtreeResult {
  width: number;
  layout: LayoutMap;
}

/** Compute subtree width for a person (and their spouse, treated as a unit) */
function computeSubtreeWidth(
  db: Database,
  personId: string,
  visited: Set<string>
): number {
  if (visited.has(personId)) return NODE_WIDTH;
  visited.add(personId);

  const spouse = getSpouse(db, personId);
  const spouseId = spouse?.id;

  if (spouseId) visited.add(spouseId);

  // Unit width for this couple/person
  const unitWidth = spouse
    ? NODE_WIDTH * 2 + SPOUSE_GAP
    : NODE_WIDTH;

  // Children
  const children = spouse
    ? getCoupleChildren(db, personId, spouseId!)
    : getChildren(db, personId);

  if (children.length === 0) return unitWidth;

  // Sum children subtree widths
  let childrenTotalWidth = 0;
  for (let i = 0; i < children.length; i++) {
    const childWidth = computeSubtreeWidth(db, children[i].id, new Set(visited));
    childrenTotalWidth += childWidth;
    if (i < children.length - 1) childrenTotalWidth += H_GAP;
  }

  return Math.max(unitWidth, childrenTotalWidth);
}

/** Lay out a subtree rooted at personId */
function layoutSubtree(
  db: Database,
  personId: string,
  x: number,
  y: number,
  visited: Set<string>
): SubtreeResult {
  if (visited.has(personId)) {
    return {
      width: NODE_WIDTH,
      layout: {
        [personId]: { x, y, width: NODE_WIDTH },
      },
    };
  }
  visited.add(personId);

  const spouse = getSpouse(db, personId);
  const spouseId = spouse?.id;

  if (spouseId) visited.add(spouseId);

  const unitWidth = spouse
    ? NODE_WIDTH * 2 + SPOUSE_GAP
    : NODE_WIDTH;

  // Get children
  const children = spouse
    ? getCoupleChildren(db, personId, spouseId!)
    : getChildren(db, personId);

  // First compute total children width to know overall subtree width
  const childWidths: number[] = [];
  for (const child of children) {
    childWidths.push(computeSubtreeWidth(db, child.id, new Set(visited)));
  }

  let childrenTotalWidth = 0;
  for (let i = 0; i < childWidths.length; i++) {
    childrenTotalWidth += childWidths[i];
    if (i < childWidths.length - 1) childrenTotalWidth += H_GAP;
  }

  const subtreeWidth = Math.max(unitWidth, childrenTotalWidth);

  // Position parent(s) centered above the subtree
  const layout: LayoutMap = {};

  if (spouse) {
    const coupleCenter = x + subtreeWidth / 2;
    const person1X = coupleCenter - NODE_WIDTH - SPOUSE_GAP / 2;
    const person2X = coupleCenter + SPOUSE_GAP / 2;

    layout[personId] = { x: person1X, y, width: NODE_WIDTH };
    layout[spouseId!] = { x: person2X, y, width: NODE_WIDTH };
  } else {
    const personX = x + subtreeWidth / 2 - NODE_WIDTH / 2;
    layout[personId] = { x: personX, y, width: NODE_WIDTH };
  }

  // Position children
  const childY = y + NODE_HEIGHT + V_GAP;
  let childX = x + (subtreeWidth - childrenTotalWidth) / 2;

  for (let i = 0; i < children.length; i++) {
    const childResult = layoutSubtree(
      db,
      children[i].id,
      childX,
      childY,
      new Set(visited)
    );
    Object.assign(layout, childResult.layout);
    childX += childWidths[i] + H_GAP;
  }

  return { width: subtreeWidth, layout };
}

/** Find the primary root (person with no parents, not a spouse-only node) */
function findPrimaryRoot(db: Database): Person | undefined {
  const childIds = new Set(
    db.relationships.filter((r) => r.type === "parent").map((r) => r.person2Id)
  );

  // All persons that are not children of anyone
  const roots = db.persons.filter((p) => !childIds.has(p.id));

  if (roots.length === 0) return undefined;
  if (roots.length === 1) return roots[0];

  // Among roots, prefer one that is a parent of someone or not just a spouse
  // Basically, pick the one who has children or is connected to the tree
  for (const root of roots) {
    const isParent = db.relationships.some(
      (r) => r.type === "parent" && r.person1Id === root.id
    );
    if (isParent) return root;
  }

  // If no root is a parent, just pick the first
  // But also check if it's a spouse of someone who IS a parent
  for (const root of roots) {
    const spouse = getSpouse(db, root.id);
    if (spouse) {
      const spouseIsParent = db.relationships.some(
        (r) => r.type === "parent" && r.person1Id === spouse.id
      );
      if (spouseIsParent) {
        // The spouse is the real tree-holder; pick the root as the spouse side
        // Actually, return the spouse
        return spouse;
      }
    }
  }

  return roots[0];
}

/** Main entry point: compute layout for entire tree */
export function computeLayout(db: Database): LayoutMap {
  if (db.persons.length === 0) return {};

  const root = findPrimaryRoot(db);
  if (!root) return {};

  const visited = new Set<string>();
  const result = layoutSubtree(db, root.id, 0, 0, visited);

  // Handle any disconnected persons not yet laid out
  let maxY = 0;
  for (const node of Object.values(result.layout)) {
    if (node.y + NODE_HEIGHT > maxY) maxY = node.y + NODE_HEIGHT;
  }

  let offsetX = 0;
  for (const person of db.persons) {
    if (!result.layout[person.id]) {
      result.layout[person.id] = {
        x: offsetX,
        y: maxY + V_GAP,
        width: NODE_WIDTH,
      };
      offsetX += NODE_WIDTH + H_GAP;
    }
  }

  return result.layout;
}

/** Compute connection lines between parents and children */
export interface ConnectionLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: "parent-child" | "spouse";
}

export function computeConnections(
  db: Database,
  layoutMap: LayoutMap
): ConnectionLine[] {
  const lines: ConnectionLine[] = [];
  const processedChildren = new Set<string>();

  for (const person of db.persons) {
    const personLayout = layoutMap[person.id];
    if (!personLayout) continue;

    const spouse = getSpouse(db, person.id);

    // Spouse line
    if (spouse && person.id < spouse.id) {
      const spouseLayout = layoutMap[spouse.id];
      if (spouseLayout) {
        lines.push({
          id: `spouse-${person.id}-${spouse.id}`,
          x1: personLayout.x + NODE_WIDTH,
          y1: personLayout.y + NODE_HEIGHT / 2,
          x2: spouseLayout.x,
          y2: spouseLayout.y + NODE_HEIGHT / 2,
          type: "spouse",
        });
      }
    }

    // Parent-child lines: draw from the couple center point down
    const children = getChildren(db, person.id);
    for (const child of children) {
      const lineKey = `${person.id}-${child.id}`;
      if (processedChildren.has(lineKey)) continue;
      processedChildren.add(lineKey);

      const childLayout = layoutMap[child.id];
      if (!childLayout) continue;

      // If the person has a spouse, draw from the couple's center
      let parentBottomX: number;
      let parentBottomY: number;

      if (spouse) {
        const spouseLayout = layoutMap[spouse.id];
        if (spouseLayout) {
          parentBottomX =
            (personLayout.x + NODE_WIDTH + spouseLayout.x) / 2;
          parentBottomY = personLayout.y + NODE_HEIGHT;
        } else {
          parentBottomX = personLayout.x + NODE_WIDTH / 2;
          parentBottomY = personLayout.y + NODE_HEIGHT;
        }
      } else {
        parentBottomX = personLayout.x + NODE_WIDTH / 2;
        parentBottomY = personLayout.y + NODE_HEIGHT;
      }

      // Also check if child's other parent drew this
      const childParentIds = getParentIds(db, child.id);
      const otherParent = childParentIds.find((pid) => pid !== person.id);
      if (otherParent && otherParent < person.id) {
        // The other parent (with lower id) will draw this line
        continue;
      }

      const childTopX = childLayout.x + NODE_WIDTH / 2;
      const childTopY = childLayout.y;

      lines.push({
        id: `parent-${person.id}-${child.id}`,
        x1: parentBottomX,
        y1: parentBottomY,
        x2: childTopX,
        y2: childTopY,
        type: "parent-child",
      });
    }
  }

  return lines;
}

export { NODE_WIDTH, NODE_HEIGHT, H_GAP, V_GAP };
