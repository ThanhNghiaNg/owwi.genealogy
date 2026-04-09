'use client'

import { memo } from 'react'
import type { ConnectionLine } from '@/lib/family-tree/layout-engine'

interface ConnectionLinesProps {
  lines: ConnectionLine[]
  svgWidth: number
  svgHeight: number
}

export const ConnectionLines = memo(function ConnectionLines({
  lines,
  svgWidth,
  svgHeight,
}: ConnectionLinesProps) {
  return (
    <svg
      className="family-tree-svg"
      width={svgWidth}
      height={svgHeight}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {lines.map((line) => {
        if (line.type === 'spouse') {
          return (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#e45c8a"
              strokeWidth={2}
              strokeDasharray="6 3"
            />
          )
        }

        // Parent-child: orthogonal routing
        const midY = (line.y1 + line.y2) / 2
        const path = `M ${line.x1} ${line.y1} L ${line.x1} ${midY} L ${line.x2} ${midY} L ${line.x2} ${line.y2}`

        return (
          <path
            key={line.id}
            d={path}
            fill="none"
            stroke="#5b7fa6"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        )
      })}
    </svg>
  )
})
