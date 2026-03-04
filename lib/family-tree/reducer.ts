import {
  type Database,
  type Person,
  createPerson,
  deletePerson,
  updatePerson,
  addRelationship,
  getMaxChildOrder,
  swapChildOrder,
  getParentIds,
  getSpouse,
  getChildren,
  hasSpouse,
  saveDatabase,
} from "./database";

// --------------- UI State ---------------

export interface Viewport {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface UIState {
  isFormOpen: boolean;
  editingPersonId: string | null;
  formMode: "create" | "edit";
  viewport: Viewport;
}

export interface AppState {
  db: Database;
  ui: UIState;
}

const initialViewport: Viewport = {
  scale: 1,
  translateX: 0,
  translateY: 0,
};

const initialUI: UIState = {
  isFormOpen: false,
  editingPersonId: null,
  formMode: "create",
  viewport: initialViewport,
};

// --------------- Action Types ---------------

export type Action =
  | { type: "INIT"; db: Database }
  | { type: "ADD_PERSON"; name: string; gender: "male" | "female" }
  | {
      type: "ADD_CHILD";
      parentId: string;
      name: string;
      gender: "male" | "female";
    }
  | {
      type: "ADD_SPOUSE";
      personId: string;
      name: string;
      gender: "male" | "female";
    }
  | {
      type: "ADD_PARENT";
      childId: string;
      name: string;
      gender: "male" | "female";
    }
  | { type: "DELETE_PERSON"; personId: string }
  | { type: "MOVE_CHILD_LEFT"; parentId: string; childId: string }
  | { type: "MOVE_CHILD_RIGHT"; parentId: string; childId: string }
  | {
      type: "REORDER_CHILDREN";
      parentId: string;
      childId: string;
      newIndex: number;
    }
  | {
      type: "UPDATE_PERSON";
      personId: string;
      updates: Partial<Omit<Person, "id" | "createdAt">>;
    }
  | {
      type: "OPEN_PERSON_FORM";
      personId: string;
      formMode: "create" | "edit";
    }
  | { type: "CLOSE_PERSON_FORM" }
  | { type: "SET_FORM_MODE"; formMode: "create" | "edit" }
  | { type: "SET_VIEWPORT"; viewport: Viewport }
  | {
      type: "ZOOM";
      delta: number;
      cursorX: number;
      cursorY: number;
      containerRect: { left: number; top: number };
    }
  | { type: "RESET_VIEWPORT" };

// --------------- Reducer ---------------

export function familyTreeReducer(state: AppState, action: Action): AppState {
  let newDb: Database;

  switch (action.type) {
    case "INIT":
      return { db: action.db, ui: initialUI };

    case "ADD_PERSON": {
      const { db: resultDb, person } = createPerson(
        state.db,
        action.name,
        action.gender
      );
      saveDatabase(resultDb);
      return {
        db: resultDb,
        ui: {
          isFormOpen: true,
          editingPersonId: person.id,
          formMode: "create",
          viewport: state.ui.viewport,
        },
      };
    }

    case "ADD_CHILD": {
      const { db: dbWithChild, person: child } = createPerson(
        state.db,
        action.name,
        action.gender
      );
      const order = getMaxChildOrder(state.db, action.parentId) + 1;
      let db = addRelationship(
        dbWithChild,
        "parent",
        action.parentId,
        child.id,
        order
      );
      const spouse = getSpouse(state.db, action.parentId);
      if (spouse) {
        db = addRelationship(db, "parent", spouse.id, child.id, order);
      }
      saveDatabase(db);
      return {
        db,
        ui: {
          isFormOpen: true,
          editingPersonId: child.id,
          formMode: "create",
          viewport: state.ui.viewport,
        },
      };
    }

    case "ADD_SPOUSE": {
      if (hasSpouse(state.db, action.personId)) return state;
      const { db: dbWithSpouse, person: spouse } = createPerson(
        state.db,
        action.name,
        action.gender
      );
      let db = addRelationship(
        dbWithSpouse,
        "spouse",
        action.personId,
        spouse.id
      );
      const existingChildren = getChildren(state.db, action.personId);
      for (const child of existingChildren) {
        const parentRel = state.db.relationships.find(
          (r) =>
            r.type === "parent" &&
            r.person1Id === action.personId &&
            r.person2Id === child.id
        );
        db = addRelationship(
          db,
          "parent",
          spouse.id,
          child.id,
          parentRel?.orderIndex ?? 0
        );
      }
      saveDatabase(db);
      return {
        db,
        ui: {
          isFormOpen: true,
          editingPersonId: spouse.id,
          formMode: "create",
          viewport: state.ui.viewport,
        },
      };
    }

    case "ADD_PARENT": {
      const { db: dbWithParent, person: parent } = createPerson(
        state.db,
        action.name,
        action.gender
      );
      const existingParentIds = getParentIds(state.db, action.childId);
      if (existingParentIds.length > 0) {
        let db = dbWithParent;
        db = addRelationship(db, "parent", parent.id, existingParentIds[0], 0);
        saveDatabase(db);
        return {
          db,
          ui: {
            isFormOpen: true,
            editingPersonId: parent.id,
            formMode: "create",
            viewport: state.ui.viewport,
          },
        };
      } else {
        const db = addRelationship(
          dbWithParent,
          "parent",
          parent.id,
          action.childId,
          0
        );
        saveDatabase(db);
        return {
          db,
          ui: {
            isFormOpen: true,
            editingPersonId: parent.id,
            formMode: "create",
            viewport: state.ui.viewport,
          },
        };
      }
    }

    case "DELETE_PERSON": {
      newDb = deletePerson(state.db, action.personId);
      saveDatabase(newDb);
      return { db: newDb, ui: state.ui };
    }

    case "MOVE_CHILD_LEFT": {
      newDb = swapChildOrder(
        state.db,
        action.parentId,
        action.childId,
        "left"
      );
      saveDatabase(newDb);
      return { db: newDb, ui: state.ui };
    }

    case "MOVE_CHILD_RIGHT": {
      newDb = swapChildOrder(
        state.db,
        action.parentId,
        action.childId,
        "right"
      );
      saveDatabase(newDb);
      return { db: newDb, ui: state.ui };
    }

    case "REORDER_CHILDREN": {
      const childRels = state.db.relationships
        .filter(
          (r) => r.type === "parent" && r.person1Id === action.parentId
        )
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const currentIdx = childRels.findIndex(
        (r) => r.person2Id === action.childId
      );
      if (currentIdx === -1 || action.newIndex === currentIdx) return state;

      const ordered = [...childRels];
      const [moved] = ordered.splice(currentIdx, 1);
      ordered.splice(action.newIndex, 0, moved);

      const relIdToNewOrder = new Map<string, number>();
      ordered.forEach((r, i) => relIdToNewOrder.set(r.id, i));

      const newRels = state.db.relationships.map((r) => {
        if (relIdToNewOrder.has(r.id)) {
          return { ...r, orderIndex: relIdToNewOrder.get(r.id)! };
        }
        return r;
      });

      newDb = { ...state.db, relationships: newRels };
      saveDatabase(newDb);
      return { db: newDb, ui: state.ui };
    }

    case "UPDATE_PERSON": {
      newDb = updatePerson(state.db, action.personId, action.updates);
      saveDatabase(newDb);
      return { db: newDb, ui: state.ui };
    }

    case "OPEN_PERSON_FORM": {
      return {
        ...state,
        ui: {
          isFormOpen: true,
          editingPersonId: action.personId,
          formMode: action.formMode,
          viewport: state.ui.viewport,
        },
      };
    }

    case "CLOSE_PERSON_FORM": {
      return {
        ...state,
        ui: initialUI,
      };
    }

    case "SET_FORM_MODE": {
      return {
        ...state,
        ui: {
          ...state.ui,
          formMode: action.formMode,
        },
      };
    }

    case "SET_VIEWPORT": {
      return {
        ...state,
        ui: {
          ...state.ui,
          viewport: action.viewport,
        },
      };
    }

    case "ZOOM": {
      const { scale, translateX, translateY } = state.ui.viewport;
      const MIN_SCALE = 0.3;
      const MAX_SCALE = 2.5;

      // Calculate new scale
      const zoomFactor = action.delta > 0 ? 0.92 : 1.08;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * zoomFactor));

      // Cursor position relative to the container
      const cx = action.cursorX - action.containerRect.left;
      const cy = action.cursorY - action.containerRect.top;

      // Zoom toward cursor: adjust translate so the point under cursor stays fixed
      // Point in content space: (cx - translateX) / scale
      // After zoom: newTranslateX = cx - (cx - translateX) / scale * newScale
      const newTranslateX = cx - ((cx - translateX) / scale) * newScale;
      const newTranslateY = cy - ((cy - translateY) / scale) * newScale;

      return {
        ...state,
        ui: {
          ...state.ui,
          viewport: {
            scale: newScale,
            translateX: newTranslateX,
            translateY: newTranslateY,
          },
        },
      };
    }

    case "RESET_VIEWPORT": {
      return {
        ...state,
        ui: {
          ...state.ui,
          viewport: initialViewport,
        },
      };
    }

    default:
      return state;
  }
}

// --------------- Selectors ---------------

export function selectRoot(db: Database): Person | undefined {
  const childIds = new Set(
    db.relationships.filter((r) => r.type === "parent").map((r) => r.person2Id)
  );
  return db.persons.find((p) => !childIds.has(p.id));
}

export function selectChildrenByParent(
  db: Database,
  parentId: string
): Person[] {
  const childRels = db.relationships
    .filter((r) => r.type === "parent" && r.person1Id === parentId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const seen = new Set<string>();
  const children: Person[] = [];
  for (const rel of childRels) {
    if (!seen.has(rel.person2Id)) {
      seen.add(rel.person2Id);
      const person = db.persons.find((p) => p.id === rel.person2Id);
      if (person) children.push(person);
    }
  }
  return children;
}

export function selectSpouse(
  db: Database,
  personId: string
): Person | undefined {
  return getSpouse(db, personId);
}

export function selectParentIds(
  db: Database,
  personId: string
): string[] {
  return getParentIds(db, personId);
}
