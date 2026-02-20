"use client";

import { useCallback, useRef, useState } from "react";
import type { Person } from "@/lib/family-tree/database";
import type { LayoutNode } from "@/lib/family-tree/layout-engine";

interface TreeNodeProps {
  person: Person;
  layout: LayoutNode;
  onContextMenu: (personId: string, x: number, y: number) => void;
  onClick: (personId: string) => void;
  onDragStart: (personId: string) => void;
  onDragOver: (personId: string) => void;
  onDragEnd: () => void;
  isDragTarget: boolean;
  isDragging: boolean;
}

export function TreeNode({
  person,
  layout,
  onContextMenu,
  onClick,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragTarget,
  isDragging,
}: TreeNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [didDrag, setDidDrag] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu(person.id, e.clientX, e.clientY);
    },
    [person.id, onContextMenu]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setDidDrag(false);
      dragStartPos.current = { x: e.clientX, y: e.clientY };

      function handleMouseMove(moveEvent: MouseEvent) {
        if (!dragStartPos.current) return;
        const dx = Math.abs(moveEvent.clientX - dragStartPos.current.x);
        const dy = Math.abs(moveEvent.clientY - dragStartPos.current.y);
        if (dx > 5 || dy > 5) {
          setDidDrag(true);
          onDragStart(person.id);
        }
      }

      function handleMouseUp() {
        dragStartPos.current = null;
        onDragEnd();
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      }

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [person.id, onDragStart, onDragEnd]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (didDrag) return;
      e.stopPropagation();
      onClick(person.id);
    },
    [person.id, onClick, didDrag]
  );

  const handleMouseEnter = useCallback(() => {
    onDragOver(person.id);
  }, [person.id, onDragOver]);

  const genderClass = person.gender === "male" ? "node-male" : "node-female";
  const deceasedClass = person.isDeceased ? "node-deceased" : "";

  const displayLabel = person.nickname
    ? person.nickname
    : person.birthYear != null
      ? String(person.birthYear)
      : person.gender;

  return (
    <div
      ref={nodeRef}
      className={`family-tree-node ${genderClass} ${deceasedClass} ${isDragTarget ? "drag-target" : ""} ${isDragging ? "dragging" : ""}`}
      style={{
        position: "absolute",
        left: layout.x,
        top: layout.y,
        width: layout.width,
      }}
      onContextMenu={handleContextMenu}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      role="treeitem"
      aria-label={`${person.name}, ${person.gender}`}
      tabIndex={0}
    >
      <div className="node-gender-indicator" />
      <div className="node-name">{person.name}</div>
      <div className="node-sub-label">{displayLabel}</div>
      {person.isDeceased && <div className="node-deceased-badge">Đã mất</div>}
    </div>
  );
}
