import { motion } from 'framer-motion'

function StatCard({ label, value, sub, color = 'white', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="panel p-4"
    >
      <div className="text-xs mono text-enron-dim uppercase tracking-wider mb-1">{label}</div>
      <div className="font-display text-3xl" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : (value || '—')}
      </div>
      {sub && <div className="text-xs text-enron-dim mt-1">{sub}</div>}
    </motion.div>
  )
}

export default function StatsBar({ summary }) {
  if (!summary) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Total Emails"
        value={summary.email_count}
        sub={summary.intake_summary?.split('.')[0]}
        color="#e2e8f0"
        delay={0}
      />
      <StatCard
        label="Convicted Emails"
        value={summary.convicted_email_count}
        sub="Sent by convicted persons"
        color="#e63946"
        delay={0.1}
      />
      <StatCard
        label="Suspicious"
        value={summary.suspicious_count}
        sub={`${summary.assessed_count || 0} agent-reviewed`}
        color="#f4a261"
        delay={0.2}
      />
      <StatCard
        label="Reviewed"
        value={summary.assessed_count}
        sub="LLM assessments written"
        color="#4fc3f7"
        delay={0.3}
      />
    </div>
  )
}
