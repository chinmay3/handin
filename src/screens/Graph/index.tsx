import { useEffect, useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNotesStore } from '../../store/notes'
import { useUIStore } from '../../store/ui'
import { overlayBg, spring } from '../../lib/transitions'

interface GraphNode {
  id: string
  title: string
  parentId: string | null
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

interface GraphEdge {
  from: string
  to: string
}

export default function Graph() {
  const notes = useNotesStore(s => s.notes).filter(n => !n.isScratch)
  const toggleGraph = useUIStore(s => s.toggleGraph)
  const openNote = useUIStore(s => s.openNote)
  const svgRef = useRef<SVGSVGElement>(null)
  const animRef = useRef<number>()
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const w = window.innerWidth
    const h = window.innerHeight
    const cx = w / 2
    const cy = h / 2

    const graphNodes: GraphNode[] = notes.map((n, i) => {
      const angle = (i / notes.length) * Math.PI * 2
      const dist = 120 + Math.random() * 100
      return {
        id: n.id,
        title: n.title,
        parentId: n.parentId,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        radius: n.parentId ? 16 : 24
      }
    })

    const graphEdges: GraphEdge[] = notes
      .filter(n => n.parentId)
      .map(n => ({ from: n.parentId!, to: n.id }))

    setNodes(graphNodes)
    setEdges(graphEdges)
  }, [notes])

  useEffect(() => {
    if (nodes.length === 0) return

    const w = window.innerWidth
    const h = window.innerHeight
    const cx = w / 2
    const cy = h / 2

    const tick = () => {
      setNodes(prev => {
        const next = prev.map(n => ({ ...n }))

        for (let i = 0; i < next.length; i++) {
          for (let j = i + 1; j < next.length; j++) {
            const dx = next[j].x - next[i].x
            const dy = next[j].y - next[i].y
            const dist = Math.sqrt(dx * dx + dy * dy) || 1
            const force = 2000 / (dist * dist)
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            next[i].vx -= fx
            next[i].vy -= fy
            next[j].vx += fx
            next[j].vy += fy
          }
        }

        for (const edge of edges) {
          const a = next.find(n => n.id === edge.from)
          const b = next.find(n => n.id === edge.to)
          if (!a || !b) continue
          const dx = b.x - a.x
          const dy = b.y - a.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = (dist - 100) * 0.02
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          a.vx += fx
          a.vy += fy
          b.vx -= fx
          b.vy -= fy
        }

        for (const n of next) {
          if (n.id === dragging) continue
          n.vx += (cx - n.x) * 0.001
          n.vy += (cy - n.y) * 0.001
          n.vx *= 0.9
          n.vy *= 0.9
          n.x += n.vx
          n.y += n.vy
          n.x = Math.max(40, Math.min(w - 40, n.x))
          n.y = Math.max(40, Math.min(h - 40, n.y))
        }

        return next
      })

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [nodes.length, edges, dragging])

  const handleMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    const node = nodes.find(n => n.id === id)
    if (!node) return
    dragOffset.current = { x: e.clientX - node.x, y: e.clientY - node.y }
    setDragging(id)
  }, [nodes])

  useEffect(() => {
    if (!dragging) return

    const handleMove = (e: MouseEvent) => {
      setNodes(prev => prev.map(n =>
        n.id === dragging
          ? { ...n, x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y, vx: 0, vy: 0 }
          : n
      ))
    }

    const handleUp = () => setDragging(null)

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [dragging])

  const hovered = hoveredNode ? nodes.find(n => n.id === hoveredNode) : null
  const hoveredNote = hoveredNode ? notes.find(n => n.id === hoveredNode) : null

  return (
    <motion.div
      {...overlayBg}
      className="fixed inset-0 z-40 bg-bg/95 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={spring}
        className="w-full h-full"
      >
        <div className="absolute top-4 right-4 z-10">
          <button onClick={toggleGraph} className="text-muted hover:text-fg transition-colors text-sm">
            ✕
          </button>
        </div>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[10px] text-subtle tracking-widest uppercase">
          graph map
        </div>

        {notes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-subtle">
            no notes yet
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full" style={{ cursor: dragging ? 'grabbing' : 'default' }}>
            {edges.map(e => {
              const from = nodes.find(n => n.id === e.from)
              const to = nodes.find(n => n.id === e.to)
              if (!from || !to) return null
              return (
                <line
                  key={`${e.from}-${e.to}`}
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  stroke="#d0d0d0"
                  strokeWidth={1}
                />
              )
            })}

            {nodes.map(n => (
              <g
                key={n.id}
                onMouseDown={e => handleMouseDown(n.id, e)}
                onMouseEnter={() => setHoveredNode(n.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onDoubleClick={() => { openNote(n.id); toggleGraph() }}
                style={{ cursor: 'grab' }}
              >
                <circle
                  cx={n.x} cy={n.y} r={n.radius}
                  fill={n.parentId ? '#e8e8e8' : '#d8d8d8'}
                  stroke={hoveredNode === n.id ? '#999999' : '#c0c0c0'}
                  strokeWidth={1}
                />
                <text
                  x={n.x} y={n.y + n.radius + 14}
                  textAnchor="middle"
                  fill="#888888"
                  fontSize={10}
                  fontFamily="'Merta Sans', 'Avenir Next', Avenir, Helvetica, Arial, sans-serif"
                >
                  {n.title.length > 16 ? n.title.substring(0, 16) + '...' : n.title}
                </text>
              </g>
            ))}
          </svg>
        )}

        {hovered && hoveredNote && (
          <div
            className="fixed z-20 bg-surface border border-border rounded p-3 pointer-events-none max-w-[200px]"
            style={{ left: hovered.x + hovered.radius + 10, top: hovered.y - 20 }}
          >
            <div className="text-xs text-fg font-medium">{hoveredNote.title}</div>
            <div className="text-[10px] text-muted mt-1 line-clamp-3">
              {hoveredNote.content.substring(0, 100) || 'empty note'}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
