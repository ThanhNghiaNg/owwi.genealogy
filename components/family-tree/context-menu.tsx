'use client'

import { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Adjust position so menu stays within viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    left: x,
    top: y,
  }

  return (
    <div ref={menuRef} className="family-tree-context-menu" style={menuStyle} role="menu">
      {items.map((item, index) => (
        <button
          key={index}
          className={`family-tree-context-menu-item${item.danger ? ' danger' : ''}${item.disabled ? ' disabled' : ''}`}
          onClick={() => {
            if (!item.disabled) {
              item.onClick()
              onClose()
            }
          }}
          disabled={item.disabled}
          role="menuitem"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
