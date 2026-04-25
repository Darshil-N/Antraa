"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Database, ShieldCheck, Sparkles, Download, Trash2,
  RefreshCw, Clock, FileText, BarChart3, ExternalLink, SearchX,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const API = "http://localhost:8000"

interface CacheItem {
  cache_id: string
  job_id: string
  job_type: "SYNTHESIS" | "BIAS_AUDIT"
  label: string
  source_file: string
  cached_at: string
  overall_quality_score: number
  privacy_risk_score: number
  correlation_similarity: number
  rows: number
  columns: number
  downloads: Record<string, string>
}

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-white/60 px-3 py-2 shadow-sm backdrop-blur-sm border border-white/40 min-w-[72px]">
      <span className={`text-base font-bold ${color}`}>{value}</span>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-tight text-center">{label}</span>
    </div>
  )
}

function QualityBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value * 100, 100)}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </div>
  )
}

export default function CachePage() {
  const [items, setItems] = useState<CacheItem[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filter, setFilter] = useState<"ALL" | "SYNTHESIS" | "BIAS_AUDIT">("ALL")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/cache/list`)
      const json = await res.json()
      setItems(json.items || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (cacheId: string) => {
    setDeleting(cacheId)
    try {
      await fetch(`${API}/api/cache/${cacheId}`, { method: "DELETE" })
      setItems(prev => prev.filter(i => i.cache_id !== cacheId))
    } finally {
      setDeleting(null)
    }
  }

  const filtered = items.filter(i => filter === "ALL" || i.job_type === filter)

  const synthesisCount = items.filter(i => i.job_type === "SYNTHESIS").length
  const biasCount = items.filter(i => i.job_type === "BIAS_AUDIT").length
  const avgQuality = items.length
    ? items.reduce((s, i) => s + (i.overall_quality_score || 0), 0) / items.length
    : 0

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0081A7]/25 bg-[#0081A7]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-[#0081A7] mb-3">
            <Database className="h-3.5 w-3.5" />
            Result Cache
          </div>
          <h1 className="text-3xl font-bold text-foreground">Cached Results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every completed synthesis or bias audit is automatically preserved here.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/upload">
              New Run
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <motion.div
        className="mb-8 grid gap-4 sm:grid-cols-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {[
          {
            label: "Synthesis Runs", value: synthesisCount, icon: ShieldCheck,
            gradient: "from-[#0081A7]/10 to-[#00AFB9]/5", border: "border-[#0081A7]/20", accent: "#0081A7",
          },
          {
            label: "Bias Audits", value: biasCount, icon: Sparkles,
            gradient: "from-[#F07167]/10 to-[#F07167]/5", border: "border-[#F07167]/20", accent: "#F07167",
          },
          {
            label: "Avg. Quality", value: `${(avgQuality * 100).toFixed(1)}%`, icon: BarChart3,
            gradient: "from-[#4caf50]/10 to-[#4caf50]/5", border: "border-[#4caf50]/20", accent: "#4caf50",
          },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className={`bg-gradient-to-br ${stat.gradient} border ${stat.border} shadow-none`}>
              <CardContent className="pt-4 pb-4 px-5 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${stat.accent}18` }}>
                  <Icon className="h-5 w-5" style={{ color: stat.accent }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </motion.div>

      {/* ── Filter Pills ── */}
      <div className="mb-6 flex gap-2">
        {(["ALL", "SYNTHESIS", "BIAS_AUDIT"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
              filter === f
                ? "bg-[#0081A7] text-white shadow-[0_4px_14px_rgba(0,129,167,0.3)]"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f === "ALL" ? "All" : f === "SYNTHESIS" ? "Synthesis" : "Bias Audits"}
          </button>
        ))}
      </div>

      {/* ── Card Grid ── */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-7 w-7 animate-spin text-[#0081A7]" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-muted py-20"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <SearchX className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No cached results yet. Run a pipeline to see results here.</p>
          <Button asChild size="sm">
            <Link href="/upload">Upload & Run</Link>
          </Button>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item, idx) => {
              const isSynth = item.job_type === "SYNTHESIS"
              const accentColor = isSynth ? "#0081A7" : "#F07167"
              const badgeBg = isSynth ? "bg-[#0081A7]/10 text-[#0081A7] border-[#0081A7]/25" : "bg-[#F07167]/10 text-[#F07167] border-[#F07167]/25"
              const gradientFrom = isSynth ? "rgba(0,129,167,0.06)" : "rgba(240,113,103,0.06)"

              return (
                <motion.div
                  key={item.cache_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.04, duration: 0.35 }}
                  className="group relative flex flex-col rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-shadow duration-300"
                  style={{ background: `linear-gradient(160deg, ${gradientFrom}, transparent 60%)` }}
                >
                  {/* Accent top stripe */}
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />

                  <div className="flex flex-1 flex-col p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1 min-w-0">
                        <Badge className={`mb-2 text-[10px] font-semibold uppercase tracking-wider rounded-full px-2.5 py-0.5 border ${badgeBg}`}>
                          {isSynth ? "Synthesis" : "Bias Audit"}
                        </Badge>
                        <h2 className="text-sm font-semibold text-foreground leading-snug truncate" title={item.label}>
                          {item.label}
                        </h2>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">{item.source_file}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(item.cache_id)}
                        disabled={deleting === item.cache_id}
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Delete from cache"
                      >
                        {deleting === item.cache_id
                          ? <RefreshCw className="h-4 w-4 animate-spin" />
                          : <Trash2 className="h-4 w-4" />
                        }
                      </button>
                    </div>

                    {/* Metrics */}
                    {isSynth && (
                      <div className="mb-4 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Overall Quality</span>
                          <span className="font-semibold text-[#4caf50]">{(item.overall_quality_score * 100).toFixed(1)}%</span>
                        </div>
                        <QualityBar value={item.overall_quality_score} color="bg-[#4caf50]" />

                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted-foreground">Privacy Risk</span>
                          <span className="font-semibold text-[#ff9800]">{(item.privacy_risk_score * 100).toFixed(1)}%</span>
                        </div>
                        <QualityBar value={item.privacy_risk_score} color="bg-[#ff9800]" />

                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted-foreground">Correlation Sim.</span>
                          <span className="font-semibold text-[#0081A7]">{(item.correlation_similarity * 100).toFixed(1)}%</span>
                        </div>
                        <QualityBar value={item.correlation_similarity} color="bg-[#0081A7]" />
                      </div>
                    )}

                    {!isSynth && (
                      <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#F07167]/8 px-3 py-2 border border-[#F07167]/15">
                        <Sparkles className="h-4 w-4 text-[#F07167] shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{item.rows}</span> bias findings recorded
                        </span>
                      </div>
                    )}

                    {/* Footer: timestamp + stats */}
                    <div className="mt-auto flex items-center gap-2 text-[11px] text-muted-foreground mb-4">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{new Date(item.cached_at).toLocaleString()}</span>
                      {isSynth && (
                        <>
                          <span className="mx-1">·</span>
                          <span>{item.rows.toLocaleString()} rows</span>
                          <span className="mx-1">·</span>
                          <span>{item.columns} cols</span>
                        </>
                      )}
                    </div>

                    {/* Action row */}
                    <div className="flex flex-wrap gap-2">
                      {isSynth && (
                        <Button variant="outline" size="sm" asChild className="flex-1 gap-1.5 text-xs h-8">
                          <Link href={`/results/${item.job_id}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Results
                          </Link>
                        </Button>
                      )}
                      {Object.entries(item.downloads).slice(0, 2).map(([label, url]) => (
                        <Button key={label} size="sm" variant="default" asChild className="flex-1 gap-1.5 text-xs h-8">
                          <a href={`${API}${url}`} target="_blank" rel="noreferrer">
                            <Download className="h-3.5 w-3.5" />
                            {label.split(" ")[0]}
                          </a>
                        </Button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}
    </main>
  )
}
