// SQL-like relational data layer for the Family Tree
// Two tables: persons and relationships, persisted to localStorage

export interface Person {
  id: string
  name: string
  gender: 'male' | 'female'
  birthYear: number | null
  nickname: string | null
  phone: string | null
  address: string | null
  isDeceased: boolean
  createdAt: number
}

export interface Relationship {
  id: string
  type: 'parent' | 'spouse'
  person1Id: string
  person2Id: string
  orderIndex: number
}

export interface Database {
  persons: Person[]
  relationships: Relationship[]
}

const STORAGE_KEY = 'family-tree-db'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// --------------- Persistence ---------------

export function loadDatabase(): Database {
  if (typeof window === 'undefined') return { persons: [], relationships: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    console.log({raw})
    if (raw) {
      const parsed = JSON.parse(raw) as Database
      console.log({parsed, hehe: {
        persons: Array.isArray(parsed.persons) ? parsed.persons : [],
        relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
      }})
      return {
        persons: Array.isArray(parsed.persons) ? parsed.persons : [],
        relationships: Array.isArray(parsed.relationships) ? parsed.relationships : [],
      }
    }
  } catch {
    // corrupted data – start fresh
  }
  return { persons: [], relationships: [] }
}

export function saveDatabase(db: Database): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

// --------------- Person CRUD ---------------

export function createPerson(
  db: Database,
  name: string,
  gender: 'male' | 'female'
): { db: Database; person: Person } {
  const person: Person = {
    id: generateId(),
    name,
    gender,
    birthYear: null,
    nickname: null,
    phone: null,
    address: null,
    isDeceased: false,
    createdAt: Date.now(),
  }
  const newDb: Database = { ...db, persons: [...db.persons, person] }
  return { db: newDb, person }
}

export function deletePerson(db: Database, personId: string): Database {
  return {
    persons: db.persons.filter((p) => p.id !== personId),
    relationships: db.relationships.filter(
      (r) => r.person1Id !== personId && r.person2Id !== personId
    ),
  }
}

export function updatePerson(
  db: Database,
  personId: string,
  updates: Partial<Omit<Person, 'id' | 'createdAt'>>
): Database {
  return {
    ...db,
    persons: db.persons.map((p) => (p.id === personId ? { ...p, ...updates } : p)),
  }
}

export function getPersonById(db: Database, id: string): Person | undefined {
  return db.persons.find((p) => p.id === id)
}

// --------------- Relationship CRUD ---------------

export function addRelationship(
  db: Database,
  type: 'parent' | 'spouse',
  person1Id: string,
  person2Id: string,
  orderIndex: number = 0
): Database {
  const rel: Relationship = {
    id: generateId(),
    type,
    person1Id,
    person2Id,
    orderIndex,
  }
  return { ...db, relationships: [...db.relationships, rel] }
}

// --------------- Relationship Queries ---------------

/** Get children of a person (person is parent, children are person2Id) */
export function getChildren(db: Database, parentId: string): Person[] {
  const childRels = db.relationships
    .filter((r) => r.type === 'parent' && r.person1Id === parentId)
    .sort((a, b) => a.orderIndex - b.orderIndex)
  return childRels
    .map((r) => db.persons.find((p) => p.id === r.person2Id))
    .filter(Boolean) as Person[]
}

/** Get all parent IDs of a person */
export function getParentIds(db: Database, personId: string): string[] {
  return db.relationships
    .filter((r) => r.type === 'parent' && r.person2Id === personId)
    .map((r) => r.person1Id)
}

/** Get spouse of a person (if any) */
export function getSpouse(db: Database, personId: string): Person | undefined {
  const spouseRel = db.relationships.find(
    (r) =>
      r.type === 'spouse' &&
      (r.person1Id === personId || r.person2Id === personId)
  )
  if (!spouseRel) return undefined
  const spouseId = spouseRel.person1Id === personId ? spouseRel.person2Id : spouseRel.person1Id
  return db.persons.find((p) => p.id === spouseId)
}

/** Check if a person has a spouse */
export function hasSpouse(db: Database, personId: string): boolean {
  return db.relationships.some(
    (r) =>
      r.type === 'spouse' && (r.person1Id === personId || r.person2Id === personId)
  )
}

/** Find the root person(s): persons with no parents */
export function findRoots(db: Database): Person[] {
  const childIds = new Set(
    db.relationships.filter((r) => r.type === 'parent').map((r) => r.person2Id)
  )
  return db.persons.filter((p) => !childIds.has(p.id))
}

/** Get the single root: for a connected tree, pick the first root found */
export function getRoot(db: Database): Person | undefined {
  const roots = findRoots(db)
  return roots.length > 0 ? roots[0] : undefined
}

/** Get children of a couple */
export function getCoupleChildren(
  db: Database,
  parent1Id: string,
  parent2Id: string
): Person[] {
  const p1Children = new Set(
    db.relationships
      .filter((r) => r.type === 'parent' && r.person1Id === parent1Id)
      .map((r) => r.person2Id)
  )
  const p2Children = new Set(
    db.relationships
      .filter((r) => r.type === 'parent' && r.person1Id === parent2Id)
      .map((r) => r.person2Id)
  )
  const sharedIds = [...p1Children].filter((id) => p2Children.has(id))
  return sharedIds
    .map((id) => db.persons.find((p) => p.id === id))
    .filter(Boolean) as Person[]
}

/** Get max orderIndex among children of a parent */
export function getMaxChildOrder(db: Database, parentId: string): number {
  const childRels = db.relationships.filter(
    (r) => r.type === 'parent' && r.person1Id === parentId
  )
  if (childRels.length === 0) return -1
  return Math.max(...childRels.map((r) => r.orderIndex))
}

/** Swap child order (move left or right) */
export function swapChildOrder(
  db: Database,
  parentId: string,
  childId: string,
  direction: 'left' | 'right'
): Database {
  const childRels = db.relationships
    .filter((r) => r.type === 'parent' && r.person1Id === parentId)
    .sort((a, b) => a.orderIndex - b.orderIndex)

  const currentIdx = childRels.findIndex((r) => r.person2Id === childId)
  if (currentIdx === -1) return db

  const targetIdx = direction === 'left' ? currentIdx - 1 : currentIdx + 1
  if (targetIdx < 0 || targetIdx >= childRels.length) return db

  const currentRel = childRels[currentIdx]
  const targetRel = childRels[targetIdx]

  const newRels = db.relationships.map((r) => {
    if (r.id === currentRel.id) return { ...r, orderIndex: targetRel.orderIndex }
    if (r.id === targetRel.id) return { ...r, orderIndex: currentRel.orderIndex }
    return r
  })
  return { ...db, relationships: newRels }
}
