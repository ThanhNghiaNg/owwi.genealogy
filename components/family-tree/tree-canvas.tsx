'use client'

import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import type { Database } from '@/lib/family-tree/database'
import { hasSpouse, getParentIds } from '@/lib/family-tree/database'
import type { Action, UIState } from '@/lib/family-tree/reducer'
import {
  computeLayout,
  computeConnections,
  NODE_WIDTH,
  NODE_HEIGHT,
} from '@/lib/family-tree/layout-engine'
import { TreeNode } from './tree-node'
import { ConnectionLines } from './connection-lines'
import { ContextMenu, type ContextMenuItem } from './context-menu'
import { AddPersonDialog } from './add-person-dialog'
import { PersonForm } from './person-form'

interface TreeCanvasProps {
  db: Database
  ui: UIState
  dispatch: React.ActionDispatch<[action: Action]>
}

interface ContextMenuState {
  personId: string
  x: number
  y: number
}

export function TreeCanvas({ db, ui, dispatch }: TreeCanvasProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [dragSourceId, setDragSourceId] = useState<string | null>(null)
  const [dragTargetId, setDragTargetId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Pan state refs (avoid re-renders during pan)
  const isPanningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0 })
  const panStartViewportRef = useRef({ translateX: 0, translateY: 0 })
  const contentRef = useRef<HTMLDivElement>(null)

  // Pinch state refs
  const lastPinchDistRef = useRef<number | null>(null)
  const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null)

  // Viewport from state
  const { viewport = { translateX: 0, translateY: 0, scale: 1 } } = ui || {}

  // Compute layout
  const layoutMap = useMemo(() => computeLayout(db), [db])
  const connections = useMemo(() => computeConnections(db, layoutMap), [db, layoutMap])

  // Compute SVG bounds
  const { svgWidth, svgHeight } = useMemo(() => {
    let maxX = 0
    let maxY = 0
    for (const node of Object.values(layoutMap)) {
      if (node.x + NODE_WIDTH > maxX) maxX = node.x + NODE_WIDTH
      if (node.y + NODE_HEIGHT > maxY) maxY = node.y + NODE_HEIGHT
    }
    return { svgWidth: maxX + 100, svgHeight: maxY + 100 }
  }, [layoutMap])

  // Context menu handlers
  const handleContextMenu = useCallback((personId: string, x: number, y: number) => {
    setContextMenu({ personId, x, y })
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Click handler → open edit form
  const handleNodeClick = useCallback(
    (personId: string) => {
      dispatch({ type: 'OPEN_PERSON_FORM', personId, formMode: 'edit' })
    },
    [dispatch]
  )

  // Build context menu items for a person
  const contextMenuItems = useMemo((): ContextMenuItem[] => {
    if (!contextMenu) return []
    const personId = contextMenu.personId
    const person = db.persons.find((p) => p.id === personId)
    if (!person) return []

    const personHasSpouse = hasSpouse(db, personId)
    const parentIds = getParentIds(db, personId)

    const items: ContextMenuItem[] = [
      {
        label: 'Chỉnh sửa',
        onClick: () => dispatch({ type: 'OPEN_PERSON_FORM', personId, formMode: 'edit' }),
      },
      {
        label: 'Thêm con',
        onClick: () => dispatch({ type: 'ADD_CHILD', parentId: personId, name: '', gender: 'male' }),
      },
      {
        label: 'Thêm vợ/chồng',
        onClick: () => dispatch({ type: 'ADD_SPOUSE', personId, name: '', gender: 'male' }),
        disabled: personHasSpouse,
      },
    ]

    if (parentIds.length > 0) {
      items.push({
        label: 'Di chuyển sang trái',
        onClick: () => dispatch({ type: 'MOVE_CHILD_LEFT', parentId: parentIds[0], childId: personId }),
      })
      items.push({
        label: 'Di chuyển sang phải',
        onClick: () => dispatch({ type: 'MOVE_CHILD_RIGHT', parentId: parentIds[0], childId: personId }),
      })
    } else {
      items.push({
        label: 'Thêm cha/mẹ',
        onClick: () => dispatch({ type: 'ADD_PARENT', childId: personId, name: '', gender: 'male' }),
      })
    }

    items.push({
      label: 'Xóa',
      danger: true,
      onClick: () => {
        if (confirm(`Xóa ${person.name}?`)) {
          dispatch({ type: 'DELETE_PERSON', personId })
        }
      },
    })

    return items
  }, [contextMenu, db, dispatch])

  // Drag handlers
  const handleDragStart = useCallback((personId: string) => {
    setDragSourceId(personId)
  }, [])

  const handleDragOver = useCallback((personId: string) => {
    setDragTargetId(personId)
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragSourceId && dragTargetId && dragSourceId !== dragTargetId) {
      const sourceParentIds = getParentIds(db, dragSourceId)
      const targetParentIds = getParentIds(db, dragTargetId)
      if (
        sourceParentIds.length > 0 &&
        targetParentIds.length > 0 &&
        sourceParentIds[0] === targetParentIds[0]
      ) {
        const parentId = sourceParentIds[0]
        const siblings = db.relationships
          .filter((r) => r.type === 'parent' && r.person1Id === parentId)
          .sort((a, b) => a.orderIndex - b.orderIndex)
        const newIndex = siblings.findIndex((r) => r.person2Id === dragTargetId)
        if (newIndex !== -1) {
          dispatch({ type: 'REORDER_CHILDREN', parentId, childId: dragSourceId, newIndex })
        }
      }
    }
    setDragSourceId(null)
    setDragTargetId(null)
  }, [db, dispatch, dragSourceId, dragTargetId])

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault()
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      dispatch({
        type: 'ZOOM',
        delta: e.deltaY,
        cursorX: e.clientX,
        cursorY: e.clientY,
        containerRect: { left: rect.left, top: rect.top },
      })
    },
    [dispatch]
  )

  // Mouse pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      if ((e.target as HTMLElement).closest('.family-tree-node')) return
      if ((e.target as HTMLElement).closest('.viewport-controls')) return
      isPanningRef.current = true
      panStartRef.current = { x: e.clientX, y: e.clientY }
      panStartViewportRef.current = { translateX: viewport.translateX, translateY: viewport.translateY }

      function handleMouseMove(moveEvent: MouseEvent) {
        if (!isPanningRef.current) return
        const dx = moveEvent.clientX - panStartRef.current.x
        const dy = moveEvent.clientY - panStartRef.current.y
        const content = contentRef.current
        if (content) {
          content.style.transform = `translate(${panStartViewportRef.current.translateX + dx}px, ${panStartViewportRef.current.translateY + dy}px)`
        }
      }

      function handleMouseUp(upEvent: MouseEvent) {
        if (!isPanningRef.current) return
        isPanningRef.current = false
        const dx = upEvent.clientX - panStartRef.current.x
        const dy = upEvent.clientY - panStartRef.current.y
        dispatch({
          type: 'SET_VIEWPORT',
          viewport: {
            scale: viewport.scale,
            translateX: panStartViewportRef.current.translateX + dx,
            translateY: panStartViewportRef.current.translateY + dy,
          },
        })
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [dispatch, viewport.translateX, viewport.translateY, viewport.scale]
  )

  // Touch events (pinch zoom + pan)
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isPanningRef.current = true
        panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        panStartViewportRef.current = { translateX: viewport.translateX, translateY: viewport.translateY }
      }
      if (e.touches.length === 2) {
        isPanningRef.current = false
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDistRef.current = Math.sqrt(dx * dx + dy * dy)
        lastPinchCenterRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && isPanningRef.current) {
        const dx = e.touches[0].clientX - panStartRef.current.x
        const dy = e.touches[0].clientY - panStartRef.current.y
        const content = contentRef.current
        if (content) {
          content.style.transform = `translate(${panStartViewportRef.current.translateX + dx}px, ${panStartViewportRef.current.translateY + dy}px)`
        }
      }

      if (e.touches.length === 2 && lastPinchDistRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const newDist = Math.sqrt(dx * dx + dy * dy)
        const scaleFactor = newDist / lastPinchDistRef.current
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2

        const MIN_SCALE = 0.3
        const MAX_SCALE = 2.5
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, viewport.scale * scaleFactor))
        const newTranslateX = cx - ((cx - viewport.translateX) / viewport.scale) * newScale
        const newTranslateY = cy - ((cy - viewport.translateY) / viewport.scale) * newScale

        dispatch({
          type: 'SET_VIEWPORT',
          viewport: { scale: newScale, translateX: newTranslateX, translateY: newTranslateY },
        })

        lastPinchDistRef.current = newDist
        lastPinchCenterRef.current = { x: cx, y: cy }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        lastPinchDistRef.current = null
        lastPinchCenterRef.current = null
      }
      if (e.touches.length === 0) {
        isPanningRef.current = false
      }
      if (e.touches.length === 1) {
        isPanningRef.current = true
        panStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        panStartViewportRef.current = { translateX: viewport.translateX, translateY: viewport.translateY }
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [dispatch, viewport.scale, viewport.translateX, viewport.translateY])

  // Reset viewport
  const handleResetViewport = useCallback(() => {
    dispatch({ type: 'RESET_VIEWPORT' })
  }, [dispatch])

  // PersonForm submit
  const handlePersonFormSubmit = useCallback(
    (personId: string, updates: Partial<Omit<import('@/lib/family-tree/database').Person, 'id' | 'createdAt'>>) => {
      dispatch({ type: 'UPDATE_PERSON', personId, updates })
      dispatch({ type: 'CLOSE_PERSON_FORM' })
    },
    [dispatch]
  )

  const handlePersonFormClose = useCallback(() => {
    dispatch({ type: 'CLOSE_PERSON_FORM' })
  }, [dispatch])

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  const editingPerson =
    ui.isFormOpen && ui.editingPersonId
      ? db.persons.find((p) => p.id === ui.editingPersonId) ?? null
      : null

  const scalePercent = Math.round(viewport.scale * 100)

  return (
    <div
      ref={containerRef}
      className="family-tree-canvas"
      onContextMenu={handleCanvasContextMenu}
      onClick={closeContextMenu}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
    >
      {/* Zoom controls */}
      <div className="viewport-controls">
        <button
          className="viewport-btn"
          onClick={() => {
            const container = containerRef.current
            if (!container) return
            const rect = container.getBoundingClientRect()
            dispatch({
              type: 'ZOOM',
              delta: -1,
              cursorX: rect.left + rect.width / 2,
              cursorY: rect.top + rect.height / 2,
              containerRect: { left: rect.left, top: rect.top },
            })
          }}
          aria-label="Zoom in"
          title="Zoom in"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <span className="viewport-scale">{scalePercent}%</span>
        <button
          className="viewport-btn"
          onClick={() => {
            const container = containerRef.current
            if (!container) return
            const rect = container.getBoundingClientRect()
            dispatch({
              type: 'ZOOM',
              delta: 1,
              cursorX: rect.left + rect.width / 2,
              cursorY: rect.top + rect.height / 2,
              containerRect: { left: rect.left, top: rect.top },
            })
          }}
          aria-label="Zoom out"
          title="Zoom out"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <button
          className="viewport-btn viewport-btn-reset"
          onClick={handleResetViewport}
          aria-label="Reset view"
          title="Reset view"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2.5 7A5.5 5.5 0 1 1 3 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Viewport transform container */}
      <div
        ref={contentRef}
        className="family-tree-viewport"
        style={{
          transform: `translate(${viewport.translateX}px, ${viewport.translateY}px)`,
          transformOrigin: '0 0',
        }}
      >
        <div
          className="family-tree-canvas-inner"
          style={{
            position: 'relative',
            minWidth: svgWidth,
            minHeight: svgHeight,
            transform: `scale(${viewport.scale})`,
          }}
        >
          <ConnectionLines lines={connections} svgWidth={svgWidth} svgHeight={svgHeight} />
          {db.persons.map((person) => {
            const layout = layoutMap[person.id]
            if (!layout) return null
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
            )
          })}
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={closeContextMenu}
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
  )
}
