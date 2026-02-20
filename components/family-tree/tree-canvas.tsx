"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Database } from "@/lib/family-tree/database";
import { hasSpouse, getParentIds } from "@/lib/family-tree/database";
import type { Action, UIState } from "@/lib/family-tree/reducer";
import {
  computeLayout,
  computeConnections,
  NODE_WIDTH,
  NODE_HEIGHT,
} from "@/lib/family-tree/layout-engine";
import { TreeNode } from "./tree-node";
import { ConnectionLines } from "./connection-lines";
import { ContextMenu, type ContextMenuItem } from "./context-menu";
import { AddPersonDialog } from "./add-person-dialog";
import { PersonForm } from "./person-form";

interface TreeCanvasProps {
  db: Database;
  ui: UIState;
  dispatch: React.ActionDispatch<[action: Action]>;
}

type DialogMode =
  | { type: "add-child"; parentId: string }
  | { type: "add-spouse"; personId: string }
  | { type: "add-parent"; childId: string }
  | null;

interface ContextMenuState {
  personId: string;
  x: number;
  y: number;
}

export function TreeCanvas({ db, ui, dispatch }: TreeCanvasProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dragTargetId, setDragTargetId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute layout
  const layoutMap = useMemo(() => computeLayout(db), [db]);
  const connections = useMemo(
    () => computeConnections(db, layoutMap),
    [db, layoutMap]
  );

  // Compute SVG bounds
  const { svgWidth, svgHeight } = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    for (const node of Object.values(layoutMap)) {
      if (node.x + NODE_WIDTH > maxX) maxX = node.x + NODE_WIDTH;
      if (node.y + NODE_HEIGHT > maxY) maxY = node.y + NODE_HEIGHT;
    }
    return { svgWidth: maxX + 100, svgHeight: maxY + 100 };
  }, [layoutMap]);

  // Context menu handlers
  const handleContextMenu = useCallback(
    (personId: string, x: number, y: number) => {
      setContextMenu({ personId, x, y });
    },
    []
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Click handler -> open edit form
  const handleNodeClick = useCallback(
    (personId: string) => {
      dispatch({
        type: "OPEN_PERSON_FORM",
        personId,
        formMode: "edit",
      });
    },
    [dispatch]
  );

  // Build context menu items for a person
  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    if (!contextMenu) return [];
    const personId = contextMenu.personId;
    const person = db.persons.find((p) => p.id === personId);
    if (!person) return [];

    const personHasSpouse = hasSpouse(db, personId);
    const parentIds = getParentIds(db, personId);

    const items: ContextMenuItem[] = [
      {
        label: "Edit",
        onClick: () =>
          dispatch({
            type: "OPEN_PERSON_FORM",
            personId,
            formMode: "edit",
          }),
      },
      {
        label: "Add Child",
        onClick: () => setDialogMode({ type: "add-child", parentId: personId }),
      },
      {
        label: "Add Spouse",
        onClick: () =>
          setDialogMode({ type: "add-spouse", personId: personId }),
        disabled: personHasSpouse,
      },
      {
        label: "Add Parent",
        onClick: () =>
          setDialogMode({ type: "add-parent", childId: personId }),
      },
    ];

    if (parentIds.length > 0) {
      items.push({
        label: "Move Left",
        onClick: () =>
          dispatch({
            type: "MOVE_CHILD_LEFT",
            parentId: parentIds[0],
            childId: personId,
          }),
      });
      items.push({
        label: "Move Right",
        onClick: () =>
          dispatch({
            type: "MOVE_CHILD_RIGHT",
            parentId: parentIds[0],
            childId: personId,
          }),
      });
    }

    items.push({
      label: "Delete",
      onClick: () => dispatch({ type: "DELETE_PERSON", personId }),
      danger: true,
    });

    return items;
  }, [contextMenu, db, dispatch]);

  // Drag handlers for sibling reorder
  const handleDragStart = useCallback((personId: string) => {
    setDragSourceId(personId);
  }, []);

  const handleDragOver = useCallback(
    (personId: string) => {
      if (dragSourceId && personId !== dragSourceId) {
        setDragTargetId(personId);
      }
    },
    [dragSourceId]
  );

  const handleDragEnd = useCallback(() => {
    if (dragSourceId && dragTargetId) {
      const sourceParentIds = getParentIds(db, dragSourceId);
      const targetParentIds = getParentIds(db, dragTargetId);
      const sharedParent = sourceParentIds.find((pid) =>
        targetParentIds.includes(pid)
      );

      if (sharedParent) {
        const childRels = db.relationships
          .filter((r) => r.type === "parent" && r.person1Id === sharedParent)
          .sort((a, b) => a.orderIndex - b.orderIndex);
        const targetIdx = childRels.findIndex(
          (r) => r.person2Id === dragTargetId
        );
        if (targetIdx !== -1) {
          dispatch({
            type: "REORDER_CHILDREN",
            parentId: sharedParent,
            childId: dragSourceId,
            newIndex: targetIdx,
          });
        }
      }
    }
    setDragSourceId(null);
    setDragTargetId(null);
  }, [dragSourceId, dragTargetId, db, dispatch]);

  // Dialog confirm (AddPersonDialog for name+gender, then reducer auto-opens PersonForm)
  const handleDialogConfirm = useCallback(
    (name: string, gender: "male" | "female") => {
      if (!dialogMode) return;
      switch (dialogMode.type) {
        case "add-child":
          dispatch({
            type: "ADD_CHILD",
            parentId: dialogMode.parentId,
            name,
            gender,
          });
          break;
        case "add-spouse":
          dispatch({
            type: "ADD_SPOUSE",
            personId: dialogMode.personId,
            name,
            gender,
          });
          break;
        case "add-parent":
          dispatch({
            type: "ADD_PARENT",
            childId: dialogMode.childId,
            name,
            gender,
          });
          break;
      }
      setDialogMode(null);
    },
    [dialogMode, dispatch]
  );

  // PersonForm submit
  const handlePersonFormSubmit = useCallback(
    (
      personId: string,
      updates: Partial<Omit<import("@/lib/family-tree/database").Person, "id" | "createdAt">>
    ) => {
      dispatch({ type: "UPDATE_PERSON", personId, updates });
      dispatch({ type: "CLOSE_PERSON_FORM" });
    },
    [dispatch]
  );

  const handlePersonFormClose = useCallback(() => {
    dispatch({ type: "CLOSE_PERSON_FORM" });
  }, [dispatch]);

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Dialog title
  const dialogTitle = dialogMode
    ? dialogMode.type === "add-child"
      ? "Add Child"
      : dialogMode.type === "add-spouse"
        ? "Add Spouse"
        : "Add Parent"
    : "";

  // Editing person
  const editingPerson =
    ui.isFormOpen && ui.editingPersonId
      ? db.persons.find((p) => p.id === ui.editingPersonId) ?? null
      : null;

  return (
    <div
      ref={containerRef}
      className="family-tree-canvas"
      onContextMenu={handleCanvasContextMenu}
      onClick={closeContextMenu}
    >
      <div
        className="family-tree-canvas-inner"
        style={{
          position: "relative",
          minWidth: svgWidth,
          minHeight: svgHeight,
        }}
      >
        <ConnectionLines
          lines={connections}
          svgWidth={svgWidth}
          svgHeight={svgHeight}
        />
        {db.persons.map((person) => {
          const layout = layoutMap[person.id];
          if (!layout) return null;
          return (
            <TreeNode
              key={person.id}
              person={person}
              layout={layout}
              onContextMenu={handleContextMenu}
              onClick={handleNodeClick}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              isDragTarget={dragTargetId === person.id}
              isDragging={dragSourceId === person.id}
            />
          );
        })}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={closeContextMenu}
        />
      )}

      {dialogMode && (
        <AddPersonDialog
          title={dialogTitle}
          onConfirm={handleDialogConfirm}
          onCancel={() => setDialogMode(null)}
        />
      )}

      {ui.isFormOpen && editingPerson && (
        <PersonForm
          person={editingPerson}
          mode={ui.formMode}
          onSubmit={handlePersonFormSubmit}
          onClose={handlePersonFormClose}
        />
      )}
    </div>
  );
}
