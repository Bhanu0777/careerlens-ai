import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  BarChart3, TrendingUp, TrendingDown, Minus, ArrowUpRight,
  Info, ChevronRight, Loader2, Database, Globe
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Card, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { fetchMarketSkillsFromDB, fetchMarketStatistics, type MarketSkillRow, type MarketStatisticRow } from '../lib/supabaseData'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass rounded-xl p-3 text-xs border border-indigo-500/20">
        <p className="font-bold text-white mb-1">{label}</p>
        <p className="text-indigo-300">{payload[0].value}% demand</p>
      </div>
    )
  }
  return null
}

export default function MarketIntelligence() {
  const navigate = useNavigate()
  const [skills, setSkills] = useState<MarketSkillRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<string | null>(null)
  const [dataFreshness, setDataFreshness] = useState<string | null>(null)
  const [selectedSkillSources, setSelectedSkillSources] = useState<MarketStatisticRow[]>([])

  useEffect(() => {
    async function loadData() {
      const rows = await fetchMarketSkillsFromDB()
      setSkills(rows)
      setLoading(false)
      
      if (rows.length > 0) {
        const stats = await fetchMarketStatistics(rows[0].skill)
        if (stats.length > 0) {
          setDataSource(stats[0].source)
          const period_end = stats[0].period_end
          if (period_end) {
            setDataFreshness(`Period: ${stats[0].period_start} to ${period_end}`)
          }
        }
      }
    }
    loadData()
  }, [])

  const handleSkillClick = async (skill: string) => {
    const sources = await fetchMarketStatistics(skill)
    setSelectedSkillSources(sources)
  }

  // Split by trend
  const risingSkills = skills.filter(s => s.trend === 'rising' || s.trend === 'emerging')
  const stableSkills = skills.filter(s => s.trend === 'stable')
  
  // Chart data
  const chartData = skills.length > 0 
    ? skills.slice(0, 10).map(s => ({ name: s.skill, demand: s.demand_score, jobs: s.job_count, trend: s.trend }))
    : []

  return (
    <motion.div className="p-4 md:p-6 max-w-6xl space-y-6"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Market Intelligence</h1>
          <p className="text-slate-400 text-sm">
            {skills.length > 0
              ? `Tracking demand for ${skills.length} skills across the India tech market`
              : 'No market data available — job collection has not been run yet.'}
          </p>
          {dataFreshness && (
            <p className="text-slate-500 text-xs mt-1">{dataFreshness}</p>
          )}
        </div>
        {dataSource && (
          <Badge variant="cyan" size="sm">
            <Database size={10} /> Source: {dataSource}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="h-72 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : skills.length === 0 ? (
        <Card className="p-10 text-center">
          <Database size={48} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Market Data Yet</h3>
          <p className="text-slate-400 text-sm mb-4">
            Market statistics are calculated from collected job postings.
            Run the job collection pipeline to populate market data.
          </p>
          <Button variant="secondary" size="sm" onClick={() => navigate('/jobs')}>
            Go to Jobs → Run Collection
          </Button>
        </Card>
      ) : (
        <>
          {/* Chart */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-5">
              <CardTitle>Skill Demand — {skills.length} skills tracked</CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Info size={12} />
                <span>Click a skill to see source details</span>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                  <Bar dataKey="demand" radius={[0, 6, 6, 0]} maxBarSize={20}
                    onClick={(data: any) => data?.name && handleSkillClick(data.name)}
                  >
                    {chartData.map((entry, i) => (
                      <Cell key={i} 
                        fill={entry.trend === 'rising' || entry.trend === 'emerging' ? '#6366f1' : '#334155'} 
                        className="cursor-pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-500" /> Rising / Emerging</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-slate-600" /> Stable</div>
            </div>
          </Card>

          {/* Rising Skills */}
          <div className="grid md:grid-cols-3 gap-5">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-emerald-400" />
                <CardTitle>Rising / Emerging Skills</CardTitle>
              </div>
              <div className="space-y-3">
                {risingSkills.slice(0, 8).map(s => (
                  <div key={s.skill} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/4 transition-colors cursor-pointer"
                    onClick={() => handleSkillClick(s.skill)}>
                    <div>
                      <p className="text-sm font-medium text-white">{s.skill}</p>
                      <p className="text-[11px] text-slate-500">{s.job_count} jobs</p>
                      {s.category && <p className="text-[10px] text-slate-600">{s.category}</p>}
                    </div>
                    <Badge variant="emerald" size="sm">{s.demand_score}%</Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Stable Skills */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Minus size={16} className="text-slate-400" />
                <CardTitle>Stable Skills</CardTitle>
              </div>
              <div className="space-y-3">
                {stableSkills.slice(0, 8).map(s => (
                  <div key={s.skill} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/4 transition-colors cursor-pointer"
                    onClick={() => handleSkillClick(s.skill)}>
                    <div>
                      <p className="text-sm font-medium text-white">{s.skill}</p>
                      <p className="text-[11px] text-slate-500">{s.job_count} jobs</p>
                      {s.category && <p className="text-[10px] text-slate-600">{s.category}</p>}
                    </div>
                    <Badge variant="slate" size="sm">{s.demand_score}%</Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* Source Attribution */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={16} className="text-indigo-400" />
                <CardTitle>Data Sources</CardTitle>
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-slate-300">Each statistic retains its source and timeframe.</p>
                <p className="text-slate-400">Click a skill to see all sources for that demand figure.</p>
                {selectedSkillSources.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <p className="font-medium text-white">{selectedSkillSources[0].skill}</p>
                    {selectedSkillSources.map((s, i) => (
                      <div key={i} className="text-xs text-slate-400 p-2 rounded bg-white/3">
                        <p>{s.source}</p>
                        <p>{s.job_count}/{s.total_jobs_analyzed} jobs ({s.demand_pct ?? '—'}%)</p>
                        <p>Period: {s.period_start} to {s.period_end}</p>
                        {s.source_url && <a href={s.source_url} target="_blank" rel="noopener" className="text-indigo-400">View source →</a>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </motion.div>
  )
}