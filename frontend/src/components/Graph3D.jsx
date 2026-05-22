import { useRef, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Billboard } from '@react-three/drei'
import * as THREE from 'three'

const NODE_COLORS = {
  convicted: '#e63946',
  enron_employee: '#4fc3f7',
  external: '#64748b',
  personal: '#a78bfa',
}

function Node({ node, position, onHover, onClick, hovered, selected }) {
  const meshRef = useRef()
  const isConvicted = node.type === 'convicted'
  const isActive = hovered || selected
  const baseColor = NODE_COLORS[node.type] || '#64748b'
  const size = Math.max(0.15, Math.min(0.6, 0.15 + (node.email_count || 0) / 2000))

  useFrame((_, delta) => {
    if (meshRef.current) {
      if (isConvicted) meshRef.current.rotation.y += delta * 0.8
      if (isActive) meshRef.current.scale.setScalar(1.3)
      else meshRef.current.scale.setScalar(1.0)
    }
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerEnter={(e) => { e.stopPropagation(); onHover(node) }}
        onPointerLeave={() => onHover(null)}
        onClick={(e) => { e.stopPropagation(); onClick(node) }}
      >
        {isConvicted
          ? <octahedronGeometry args={[size * 1.2, 0]} />
          : <sphereGeometry args={[size, 12, 12]} />
        }
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={isActive ? 0.8 : (isConvicted ? 0.4 : 0.1)}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>
      {/* Glow ring for convicted */}
      {isConvicted && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.5, size * 1.8, 32]} />
          <meshBasicMaterial color="#e63946" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Label */}
      {isActive && (
        <Billboard>
          <Html center distanceFactor={8}>
            <div style={{
              background: 'rgba(10,10,15,0.95)',
              border: `1px solid ${baseColor}`,
              borderRadius: '4px',
              padding: '6px 10px',
              color: '#e2e8f0',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: `0 0 12px ${baseColor}40`,
            }}>
              <div style={{ color: baseColor, fontWeight: 700, marginBottom: 2 }}>
                {node.convicted_name || node.label}
              </div>
              <div style={{ color: '#64748b', fontSize: '10px' }}>{node.email}</div>
              {node.email_count > 0 && (
                <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                  {node.email_count} emails
                  {node.suspicious_sent > 0 && <span style={{ color: '#e63946' }}> · {node.suspicious_sent} suspicious</span>}
                </div>
              )}
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  )
}

function Edge({ start, end, weight, isSuspicious }) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ], [start, end])

  const lineGeom = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points)
    return g
  }, [points])

  const opacity = Math.min(0.6, Math.max(0.05, weight / 50))

  return (
    <line geometry={lineGeom}>
      <lineBasicMaterial
        color={isSuspicious ? '#f4a261' : '#1e3a5f'}
        transparent
        opacity={opacity}
        linewidth={1}
      />
    </line>
  )
}

function GraphScene({ nodes, edges, onSelectNode }) {
  const [hoveredNode, setHoveredNode] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)

  // Force-directed layout: spread nodes in 3D space
  const positions = useMemo(() => {
    const pos = {}
    const nodeIds = nodes.map(n => n.id)
    const adjacency = {}
    nodeIds.forEach(id => { adjacency[id] = [] })
    edges.forEach(e => {
      if (adjacency[e.source]) adjacency[e.source].push(e.target)
      if (adjacency[e.target]) adjacency[e.target].push(e.source)
    })

    // Convicted nodes at center, others spread out
    nodes.forEach((node, i) => {
      if (node.convicted) {
        const theta = (i / nodes.filter(n => n.convicted).length) * Math.PI * 2
        pos[node.id] = [Math.cos(theta) * 3, (Math.random() - 0.5) * 4, Math.sin(theta) * 3]
      } else {
        // Fibonacci sphere distribution
        const phi = Math.acos(1 - 2 * (i + 0.5) / nodes.length)
        const theta = Math.PI * (1 + Math.sqrt(5)) * i
        const radius = 12 + Math.random() * 8
        pos[node.id] = [
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi),
        ]
      }
    })
    return pos
  }, [nodes, edges])

  const handleClick = useCallback((node) => {
    setSelectedNode(node)
    onSelectNode(node)
  }, [onSelectNode])

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={2} color="#e63946" distance={20} />
      <pointLight position={[20, 10, 20]} intensity={0.5} color="#4fc3f7" />

      {/* Edges */}
      {edges.slice(0, 1500).map((edge, i) => {
        const sp = positions[edge.source]
        const tp = positions[edge.target]
        if (!sp || !tp) return null
        return (
          <Edge
            key={i}
            start={sp}
            end={tp}
            weight={edge.weight}
            isSuspicious={edge.is_suspicious_link}
          />
        )
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const pos = positions[node.id]
        if (!pos) return null
        return (
          <Node
            key={node.id}
            node={node}
            position={pos}
            onHover={setHoveredNode}
            onClick={handleClick}
            hovered={hoveredNode?.id === node.id}
            selected={selectedNode?.id === node.id}
          />
        )
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={80}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  )
}

export default function Graph3D({ nodes = [], edges = [], onSelectNode = () => {} }) {
  const [selectedNode, setSelectedNode] = useState(null)

  const handleSelect = (node) => {
    setSelectedNode(node)
    onSelectNode(node)
  }

  const stats = useMemo(() => ({
    total: nodes.length,
    convicted: nodes.filter(n => n.convicted).length,
    suspicious_links: edges.filter(e => e.is_suspicious_link).length,
  }), [nodes, edges])

  return (
    <div className="relative w-full h-full">
      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 panel p-3 text-xs mono space-y-1.5">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-enron-dim capitalize">{type.replace('_', ' ')}</span>
          </div>
        ))}
        <div className="border-t border-enron-border pt-1.5 mt-1.5 text-enron-dim">
          <div>{stats.total} nodes · {edges.length} edges</div>
          <div className="text-enron-amber">{stats.suspicious_links} suspicious links</div>
        </div>
      </div>

      {/* Selected node detail */}
      {selectedNode && (
        <div className="absolute top-4 right-4 z-10 panel p-4 w-64">
          <button
            onClick={() => setSelectedNode(null)}
            className="absolute top-2 right-2 text-enron-dim hover:text-white text-xs"
          >✕</button>
          <div className="text-xs mono text-enron-dim mb-1">SELECTED NODE</div>
          <div className="font-semibold" style={{ color: NODE_COLORS[selectedNode.type] }}>
            {selectedNode.convicted_name || selectedNode.label}
          </div>
          <div className="text-xs text-enron-dim mt-1 break-all">{selectedNode.email}</div>
          <div className="mt-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-enron-dim">Emails sent</span>
              <span className="mono">{selectedNode.email_count || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-enron-dim">Suspicious</span>
              <span className="mono text-enron-amber">{selectedNode.suspicious_sent || 0}</span>
            </div>
            {selectedNode.convicted && (
              <div className="mt-2 px-2 py-1 bg-red-950/50 border border-enron-red/30 rounded text-enron-red text-xs">
                ⚠ CONVICTED
              </div>
            )}
          </div>
        </div>
      )}

      <Canvas
        camera={{ position: [0, 0, 40], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <GraphScene
          nodes={nodes}
          edges={edges}
          onSelectNode={handleSelect}
        />
      </Canvas>
    </div>
  )
}
