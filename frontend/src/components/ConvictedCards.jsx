import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const SEVERITY_COLORS = {
  'CEO': '#e63946',
  'CFO': '#e63946',
  'Chairman': '#e63946',
  'Treasurer': '#f4a261',
  'Managing Director': '#f4a261',
  'default': '#64748b',
}

function getRoleColor(role = '') {
  for (const [key, color] of Object.entries(SEVERITY_COLORS)) {
    if (role.includes(key)) return color
  }
  return SEVERITY_COLORS.default
}

function ConvictCard({ person, isExpanded, onToggle }) {
  const roleColor = getRoleColor(person.role)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`panel cursor-pointer transition-all duration-200 hover:border-enron-muted ${
        isExpanded ? 'glow-red border-enron-red/40' : ''
      }`}
      onClick={onToggle}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div
              className="text-xs mono mb-1 uppercase tracking-widest"
              style={{ color: roleColor }}
            >
              {person.role}
            </div>
            <div className="font-display text-xl text-white leading-tight">
              {person.name}
            </div>
          </div>
          <div className={`
            w-6 h-6 flex-shrink-0 flex items-center justify-center rounded
            border border-enron-border text-enron-dim text-xs transition-transform
            ${isExpanded ? 'rotate-180' : ''}
          `}>
            ▾
          </div>
        </div>

        {/* Charge preview */}
        <div className="mt-3 text-xs text-enron-dim line-clamp-2">
          {person.charges}
        </div>

        {/* Sentence badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded
          bg-red-950/40 border border-enron-red/20 text-enron-red text-xs mono">
          ⚖ {person.sentence?.split(' ').slice(0, 4).join(' ')}...
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-enron-border/50 mt-0 space-y-3">
              <div className="pt-3">
                <div className="text-xs text-enron-dim mono uppercase tracking-wider mb-1.5">
                  Summary
                </div>
                <p className="text-sm text-enron-text leading-relaxed">
                  {person.summary}
                </p>
              </div>

              <div>
                <div className="text-xs text-enron-dim mono uppercase tracking-wider mb-1.5">
                  Full Charges
                </div>
                <p className="text-sm text-enron-amber">
                  {person.charges}
                </p>
              </div>

              <div>
                <div className="text-xs text-enron-dim mono uppercase tracking-wider mb-1.5">
                  Sentence
                </div>
                <p className="text-sm text-enron-red font-medium">
                  {person.sentence}
                </p>
              </div>

              {person.email_patterns && person.email_patterns.length > 0 && (
                <div>
                  <div className="text-xs text-enron-dim mono uppercase tracking-wider mb-1.5">
                    Email Patterns
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {person.email_patterns.map(p => (
                      <span key={p} className="px-2 py-0.5 rounded text-xs mono
                        bg-enron-muted text-enron-dim border border-enron-border">
                        {p}@enron.com
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function ConvictedCards({ persons = [] }) {
  const [expanded, setExpanded] = useState(null)

  const toggle = (name) => setExpanded(prev => prev === name ? null : name)

  if (!persons.length) {
    return (
      <div className="panel p-8 text-center text-enron-dim">
        <div className="text-2xl mb-2">⚖</div>
        <div>No convicted persons data loaded</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {persons.map(person => (
        <ConvictCard
          key={person.name}
          person={person}
          isExpanded={expanded === person.name}
          onToggle={() => toggle(person.name)}
        />
      ))}
    </div>
  )
}
