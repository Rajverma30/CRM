'use client'

import { useState, type DragEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface KanbanColumn {
  id: string
  title: string
  color: string
}

interface KanbanBoardProps<T extends { id: string; status: string }> {
  columns: KanbanColumn[]
  items: T[]
  renderCard: (item: T) => ReactNode
  onMove: (itemId: string, newStatus: string) => void
}

export function KanbanBoard<T extends { id: string; status: string }>({
  columns,
  items,
  renderCard,
  onMove,
}: KanbanBoardProps<T>) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<string | null>(null)

  function handleDragStart(e: DragEvent, itemId: string) {
    setDraggedId(itemId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', itemId)
  }

  function handleDragOver(e: DragEvent, columnId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverColumn(columnId)
  }

  function handleDragLeave() {
    setOverColumn(null)
  }

  function handleDrop(e: DragEvent, columnId: string) {
    e.preventDefault()
    const itemId = e.dataTransfer.getData('text/plain')
    if (itemId) {
      const item = items.find(i => i.id === itemId)
      if (item && item.status !== columnId) {
        onMove(itemId, columnId)
      }
    }
    setDraggedId(null)
    setOverColumn(null)
  }

  function handleDragEnd() {
    setDraggedId(null)
    setOverColumn(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map(col => {
        const columnItems = items.filter(i => i.status === col.id)
        return (
          <div
            key={col.id}
            className={cn(
              'flex-shrink-0 w-72 rounded-lg border bg-muted/30 transition-colors',
              overColumn === col.id && 'ring-2 ring-primary/50 bg-primary/5'
            )}
            onDragOver={e => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, col.id)}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-sm font-semibold">{col.title}</span>
              </div>
              <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                {columnItems.length}
              </span>
            </div>
            <div className="p-2 space-y-2 min-h-[120px]">
              {columnItems.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={e => handleDragStart(e, item.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'cursor-grab active:cursor-grabbing transition-opacity',
                    draggedId === item.id && 'opacity-50'
                  )}
                >
                  {renderCard(item)}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
