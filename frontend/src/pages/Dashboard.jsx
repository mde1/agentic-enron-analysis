import { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useApi } from '../hooks/useApi'
import Graph3D from '../components/Graph3D'
import ConvictedCards from '../components/ConvictedCards'
import EmailTable from '../components/EmailTable'
import PipelineStatus from '../components/PipelineStatus'
import StatsBar from '../components/StatsBar'

const TABS = [
  { id: 'graph', label: '3D Network', icon: '◉' },
  { id: 'convicted', label: 'Convicted', icon: '⚖' },
  { id: 'emails', label: 'Emails', icon: '✉' },
  { id: 'pipeline', label: 'Pipeline', icon: '▶' },
]

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-enron-panel rounded border border-enron-border">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded text-sm mono transition-all
            ${active === tab.id
              ? 'bg-enron-muted text-white border border-enron-border'
              : 'text-enron-dim hover:text-enron-text'
            }
          `}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="text-enron-red font-display text-4xl mb-2 animate-pulse">ENRON</div>
        <div className="text-enron-dim text-sm mono">Loading data...</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('graph')
  const [graphKey, setGraphKey] = useState(0)

  const { data: summary, loading: summaryLoading } = useApi('/summary')
  const { data: convicted } = useApi('/convicted')
  const { data: graphData } = useApi('/graph')

  return (
    <div className="min-h-screen hero-bg scanlines">
      {/* Header */}
      <header className="border-b border-enron-border/50 backdrop-blur-sm sticky top-0 z-50 bg-enron-dark/80">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="font-display text-3xl text-enron-red leading-none tracking-wider">
                ENRON INVESTIGATOR
              </div>
              <div className="text-xs mono text-enron-dim mt-0.5">
                AI-Powered Fraud Analysis · LangGraph Pipeline
              </div>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-3 text-xs mono text-enron-dim">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              API Connected
            </div>
            {summary && (
              <div className="hidden md:block px-3 py-1.5 panel">
                {summary.email_count?.toLocaleString()} emails analyzed
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* Stats */}
        {!summaryLoading && summary && <StatsBar summary={summary} />}

        {/* Tabs */}
        <TabBar active={activeTab} onChange={setActiveTab} />

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'graph' && (
            <div
              className="panel overflow-hidden"
              style={{ height: 'calc(100vh - 320px)', minHeight: '500px' }}
            >
              {graphData ? (
                <Suspense fallback={<LoadingScreen />}>
                  <Graph3D
                    nodes={graphData.nodes || []}
                    edges={graphData.edges || []}
                  />
                </Suspense>
              ) : (
                <LoadingScreen />
              )}
            </div>
          )}

          {activeTab === 'convicted' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {convicted ? (
                <ConvictedCards persons={convicted} />
              ) : (
                <LoadingScreen />
              )}
            </div>
          )}

          {activeTab === 'emails' && (
            <div style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
              <EmailTable />
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="max-w-2xl">
              <PipelineStatus onComplete={() => setGraphKey(k => k + 1)} />

              <div className="mt-6 panel p-5">
                <div className="text-xs mono text-enron-dim uppercase tracking-wider mb-3">
                  Architecture
                </div>
                <div className="space-y-2 font-mono text-xs text-enron-dim">
                  {[
                    ['Agent 1', 'Email intake & normalization', '#4fc3f7'],
                    ['Agent 2', 'LLM: Research convicted persons', '#a78bfa'],
                    ['Agent 3', 'Label convicted senders in dataset', '#f4a261'],
                    ['Agent 4', 'LLM: Review suspicious email flags', '#f4a261'],
                    ['Agent 5', 'Build communication knowledge graph', '#4fc3f7'],
                  ].map(([agent, desc, color]) => (
                    <div key={agent} className="flex items-center gap-3">
                      <span className="w-16 flex-shrink-0 font-bold" style={{ color }}>
                        {agent}
                      </span>
                      <span className="text-enron-border">→</span>
                      <span>{desc}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-enron-border text-xs text-enron-dim">
                  Powered by <span className="text-white">LangGraph</span> + <span className="text-white">LangChain</span> + <span className="text-white">FastAPI</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  )
}
