import type { Database } from './database'
import { findRoots, getSpouse, getChildren, getParentIds } from './database'

export const NODE_WIDTH = 160
export const NODE_HEIGHT = 80
export const H_GAP = 24
export const V_GAP = 80
export const SPOUSE_GAP = 8

export interface LayoutNode {
  x: number
  y: number
  width: number
}

export type LayoutMap = Record<string, LayoutNode>

interface SubtreeResult {
  layout: LayoutMap
  totalWidth: number
}

/**
 * Compute the width needed to render a subtree rooted at personId.
 * A "couple unit" takes the width of both nodes + spouse gap.
 * Children are placed below and their total width determines the subtree width.
 */
function computeSubtreeWidth(
  db: Database,
  personId: string,
  visited: Set<string>
): number {
  if (visited.has(personId)) return 0
  visited.add(personId)

  const spouse = getSpouse(db, personId)
  const unitWidth = spouse
    ? NODE_WIDTH * 2 + SPOUSE_GAP
    : NODE_WIDTH

  const children = getChildren(db, personId)
  // Filter children already visited (avoid double-counting shared children)
  const unvisitedChildren = children.filter((c) => !visited.has(c.id))

  if (unvisitedChildren.length === 0) return unitWidth

  const childrenTotalWidth = unvisitedChildren.reduce((sum, child, idx) => {
    const w = computeSubtreeWidth(db, child.id, new Set(visited))
    return sum + w + (idx > 0 ? H_GAP : 0)
  }, 0)

  return Math.max(unitWidth, childrenTotalWidth)
}

/**
 * Recursively place nodes in the layout map.
 */
function layoutSubtree(
  db: Database,
  personId: string,
  startX: number,
  startY: number,
  visited: Set<string>
): SubtreeResult {
  if (visited.has(personId)) return { layout: {}, totalWidth: 0 }
  visited.add(personId)

  const layout: LayoutMap = {}
  const spouse = getSpouse(db, personId)

  // Mark spouse as visited too so we don't re-layout it
  if (spouse) visited.add(spouse.id)

  const unitWidth = spouse ? NODE_WIDTH * 2 + SPOUSE_GAP : NODE_WIDTH

  const children = getChildren(db, personId)
  const unvisitedChildren = children.filter((c) => !visited.has(c.id))

  // Compute widths of each child subtree
  const childWidths = unvisitedChildren.map((child) =>
    computeSubtreeWidth(db, child.id, new Set(visited))
  )
  const childrenTotalWidth =
    childWidths.reduce((s, w) => s + w, 0) +
    Math.max(0, unvisitedChildren.length - 1) * H_GAP

  const totalWidth = Math.max(unitWidth, childrenTotalWidth)

  // Center the parent unit above children
  let parentUnitX: number
  if (childrenTotalWidth > unitWidth) {
    parentUnitX = startX + (childrenTotalWidth - unitWidth) / 2
  } else {
    parentUnitX = startX
  }

  // Place primary person
  layout[personId] = { x: parentUnitX, y: startY, width: NODE_WIDTH }

  // Place spouse immediately to the right
  if (spouse) {
    layout[spouse.id] = {
      x: parentUnitX + NODE_WIDTH + SPOUSE_GAP,
      y: startY,
      width: NODE_WIDTH,
    }
  }

  // Place children below
  if (unvisitedChildren.length > 0) {
    const childY = startY + NODE_HEIGHT + V_GAP
    let childX = startX + Math.max(0, (unitWidth - childrenTotalWidth) / 2)

    for (let i = 0; i < unvisitedChildren.length; i++) {
      const child = unvisitedChildren[i]
      const childResult = layoutSubtree(db, child.id, childX, childY, visited)
      Object.assign(layout, childResult.layout)
      childX += childWidths[i] + H_GAP
    }
  }

  return { layout, totalWidth }
}

/**
 * Find the primary root: the person with no parents who is not a spouse of another root.
 */
function findPrimaryRoot(db: Database) {
  const roots = findRoots(db)
  if (roots.length === 0) return null
  if (roots.length === 1) return roots[0]

  // If multiple roots, prefer the one that is not a spouse of another root
  for (const root of roots) {
    const spouse = getSpouse(db, root.id)
    if (spouse) {
      const spouseIsRoot = roots.some((r) => r.id === spouse.id)
      if (spouseIsRoot) {
        // Return the one with the lower id (consistent ordering)
        return root.id < spouse.id ? root : spouse
      }
    }
  }

  return roots[0]
}

/** Main entry point: compute layout for entire tree */
export function computeLayout(db: Database): LayoutMap {
  if (db.persons.length === 0) return {}

  const root = findPrimaryRoot(db)
  if (!root) return {}

  const visited = new Set<string>()
  const result = layoutSubtree(db, root.id, 0, 0, visited)

  // Handle any disconnected persons not yet laid out
  let maxY = 0
  for (const node of Object.values(result.layout)) {
    if (node.y + NODE_HEIGHT > maxY) maxY = node.y + NODE_HEIGHT
  }

  let offsetX = 0
  for (const person of db.persons) {
    if (!result.layout[person.id]) {
      result.layout[person.id] = { x: offsetX, y: maxY + V_GAP, width: NODE_WIDTH }
      offsetX += NODE_WIDTH + H_GAP
    }
  }

  return result.layout
}

/** Compute connection lines between parents and children */
export interface ConnectionLine {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  type: 'parent-child' | 'spouse'
}

export function computeConnections(db: Database, layoutMap: LayoutMap): ConnectionLine[] {
  const lines: ConnectionLine[] = []
  const processedChildren = new Set<string>()

  for (const person of db.persons) {
    const personLayout = layoutMap[person.id]
    if (!personLayout) continue

    const spouse = getSpouse(db, person.id)

    // Spouse line
    if (spouse && person.id < spouse.id) {
      const spouseLayout = layoutMap[spouse.id]
      if (spouseLayout) {
        lines.push({
          id: `spouse-${person.id}-${spouse.id}`,
          x1: personLayout.x + NODE_WIDTH,
          y1: personLayout.y + NODE_HEIGHT / 2,
          x2: spouseLayout.x,
          y2: spouseLayout.y + NODE_HEIGHT / 2,
          type: 'spouse',
        })
      }
    }

    // Parent-child lines: draw from the couple center point down
    const children = getChildren(db, person.id)
    for (const child of children) {
      const lineKey = `${person.id}-${child.id}`
      if (processedChildren.has(lineKey)) continue
      processedChildren.add(lineKey)

      const childLayout = layoutMap[child.id]
      if (!childLayout) continue

      let parentBottomX: number
      let parentBottomY: number

      if (spouse) {
        const spouseLayout = layoutMap[spouse.id]
        if (spouseLayout) {
          parentBottomX = (personLayout.x + NODE_WIDTH + spouseLayout.x) / 2
          parentBottomY = personLayout.y + NODE_HEIGHT
        } else {
          parentBottomX = personLayout.x + NODE_WIDTH / 2
          parentBottomY = personLayout.y + NODE_HEIGHT
        }
      } else {
        parentBottomX = personLayout.x + NODE_WIDTH / 2
        parentBottomY = personLayout.y + NODE_HEIGHT
      }

      // Check if child's other parent drew this line already
      const childParentIds = getParentIds(db, child.id)
      const otherParent = childParentIds.find((pid) => pid !== person.id)
      if (otherParent && otherParent < person.id) continue

      const childTopX = childLayout.x + NODE_WIDTH / 2
      const childTopY = childLayout.y

      lines.push({
        id: `parent-${person.id}-${child.id}`,
        x1: parentBottomX,
        y1: parentBottomY,
        x2: childTopX,
        y2: childTopY,
        type: 'parent-child',
      })
    }
  }

  return lines
}

export { NODE_WIDTH as default }
