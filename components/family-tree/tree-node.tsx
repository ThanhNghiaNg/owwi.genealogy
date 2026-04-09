'use client'

import { useCallback, useRef, useState } from 'react'
import type { Person } from '@/lib/family-tree/database'
import type { LayoutNode } from '@/lib/family-tree/layout-engine'
import { Settings } from 'lucide-react'

interface TreeNodeProps {
  person: Person
  layout: LayoutNode
  onContextMenu: (personId: string, x: number, y: number) => void
  onClick: (personId: string) => void
  onDragStart: (personId: string) => void
  onDragOver: (personId: string) => void
  onDragEnd: () => void
  isDragTarget: boolean
  isDragging: boolean
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
  const nodeRef = useRef<HTMLDivElement>(null)
  const [didDrag, setDidDrag] = useState(false)
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onContextMenu(person.id, e.clientX, e.clientY)
    },
    [person.id, onContextMenu]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      setDidDrag(false)
      dragStartPos.current = { x: e.clientX, y: e.clientY }

      function handleMouseMove(moveEvent: MouseEvent) {
        if (!dragStartPos.current) return
        const dx = Math.abs(moveEvent.clientX - dragStartPos.current.x)
        const dy = Math.abs(moveEvent.clientY - dragStartPos.current.y)
        if (dx > 5 || dy > 5) {
          setDidDrag(true)
          onDragStart(person.id)
        }
      }

      function handleMouseUp() {
        dragStartPos.current = null
        onDragEnd()
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [person.id, onDragStart, onDragEnd]
  )

  const handleMouseEnter = useCallback(() => {
    onDragOver(person.id)
  }, [person.id, onDragOver])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!didDrag) {
        onClick(person.id)
      }
    },
    [didDrag, onClick, person.id]
  )

  const genderClass = person.gender === 'male' ? 'node-male' : 'node-female'
  const deceasedClass = person.isDeceased ? 'node-deceased' : ''

  const displayLabel = person.nickname
    ? person.nickname
    : person.birthYear != null
      ? String(person.birthYear)
      : ''

  return (
    <div
      ref={nodeRef}
      className={`family-tree-node ${genderClass} ${deceasedClass} ${isDragTarget ? 'drag-target' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'absolute',
        left: layout.x,
        top: layout.y,
        width: layout.width,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      tabIndex={0}
      role="button"
      aria-label={`${person.name}, ${person.gender === 'male' ? 'Nam' : 'Nữ'}${person.isDeceased ? ', đã mất' : ''}`}
    >
      <div className="node-gender-indicator" />
      <span className="node-name" title={person.name}>
        {person.name}
      </span>
      {displayLabel && <span className="node-sub-label">{displayLabel}</span>}
      {person.isDeceased && <span className="node-deceased-badge">✝</span>}
      <button
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          background: 'transparent',
          border: 'none',
          color: 'var(--ft-text-muted)',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.6,
          zIndex: 1,
        }}
        onClick={(e) => {
          e.stopPropagation()
          onContextMenu(person.id, e.clientX, e.clientY)
        }}
        aria-label="Options"
        title="Options"
      >
        <Settings size={12} />
      </button>
    </div>
  )
}
