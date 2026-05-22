import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || '/api'

const AGENTS = [
  { id: 1, name: 'Email Intake', desc: 'Parse & normalize email dataset' },
  { id: 2, name: 'Convict Research', desc: 'Identify convicted individuals' },
  { id: 3, name: 'Label Dataset', desc: 'Tag convicted senders in emails' },
  { id: 4, name: 'Suspicious Review', desc: 'LLM assessment of flagged emails' },
  { id: 5, name: 'Build Graph', desc: 'Construct communication network' },
]

function AgentStep({ agent, status, isActive }) {
  const isDone = status === 'complete' || status === 'done'
  const isFailed = status === 'failed'

  return (
    <div className={`flex items-start gap-3 p-3 rounded transition-all ${
      isActive ? 'bg-enron-muted/50 border border-enron-border' : ''
    }`}>
      <div className={`
        w-7 h-7 flex-shrink-0 rounded flex items-center justify-center text-xs mono font-bold
        ${isDone ? 'bg-green-900/60 text-green-400 border border-green-400/30' :
          isFailed ? 'bg-red-950/60 text-enron-red border border-enron-red/30' :
          isActive ? 'bg-enron-amber/20 text-enron-amber border border-enron-amber/40' :
          'bg-enron-muted/40 text-enron-dim border border-enron-border'}
      `}>
        {isDone ? '✓' : isFailed ? '✕' : isActive ? '▶' : agent.id}
      </div>
      <div>
        <div className={`text-sm font-medium ${isActive ? 'text-white' : 'text-enron-dim'}`}>
          {agent.name}
        </div>
        <div className="text-xs text-enron-dim mt-0.5">{agent.desc}</div>
      </div>
      {isActive && (
        <div className="ml-auto flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-1 h-1 rounded-full bg-enron-amber"
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function PipelineStatus({ onComplete }) {
  const [status, setStatus] = useState(null)
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    const poll = () => {
      axios.get(`${BASE}/status`).then(r => {
        setStatus(r.data)
        if (r.data.status === 'complete' && onComplete) onComplete()
      }).catch(() => {})
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [])

  const trigger = async () => {
    setTriggering(true)
    try {
      await axios.post(`${BASE}/run`, {})
    } catch (e) {
      console.error(e)
    }
    setTriggering(false)
  }

  const currentAgent = status?.status?.match(/agent(\d)/)
    ? parseInt(status.status.match(/agent(\d)/)[1])
    : 0

  const isRunning = status?.running
  const isDone = status?.status === 'complete'

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs mono text-enron-dim uppercase tracking-wider mb-1">
            Agent Pipeline
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isRunning ? 'bg-enron-amber animate-pulse' :
              isDone ? 'bg-green-400' : 'bg-enron-dim'
            }`} />
            <span className="text-sm mono text-enron-text">
              {isRunning ? 'Running...' : isDone ? 'Complete' : 'Idle'}
            </span>
          </div>
        </div>
        <button
          onClick={trigger}
          disabled={isRunning || triggering}
          className={`
            px-4 py-2 rounded text-sm mono font-medium transition-all
            ${isRunning || triggering
              ? 'bg-enron-muted text-enron-dim cursor-not-allowed'
              : 'bg-enron-red hover:bg-red-700 text-white glow-red'
            }
          `}
        >
          {isRunning ? 'Running...' : triggering ? 'Starting...' : '▶ Run Pipeline'}
        </button>
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="mb-4 h-1 bg-enron-muted rounded overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-enron-red to-enron-amber rounded"
            animate={{ width: `${status?.progress || 0}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      {/* Agent steps */}
      <div className="space-y-1">
        {AGENTS.map(agent => {
          const agentStatus = isDone ? 'complete' :
            currentAgent > agent.id ? 'complete' :
            currentAgent === agent.id ? 'active' : 'pending'
          return (
            <AgentStep
              key={agent.id}
              agent={agent}
              status={agentStatus}
              isActive={currentAgent === agent.id && isRunning}
            />
          )
        })}
      </div>

      {/* Errors */}
      {status?.errors?.length > 0 && (
        <div className="mt-4 p-3 bg-red-950/30 border border-enron-red/20 rounded">
          <div className="text-xs mono text-enron-red uppercase mb-1">Errors</div>
          {status.errors.map((e, i) => (
            <div key={i} className="text-xs text-enron-dim">{e}</div>
          ))}
        </div>
      )}
    </div>
  )
}
