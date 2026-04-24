"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  ShieldCheck,
  X,
  ChevronDown,
} from "lucide-react"

const API_BASE = "http://localhost:8000/api"
const WS_BASE = "ws://localhost:8000/ws"
const pipelinePhases = [
  "UPLOADED",
  "PROFILING",
  "COMPLIANCE",
  "AWAITING_APPROVAL",
  "GENERATING",
  "VALIDATING",
  "COMPLETE",
  "FAILED"
]

/* ── Animated Custom Checkbox ── */
function ApproveCheckbox({ id, checked, onChange }: { id: string; checked: boolean; onChange: () => void }) {
  const inputId = `chk-${id}`
  return (
    <label htmlFor={inputId} className="inline-flex cursor-pointer items-center justify-center">
      <input
        id={inputId}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 200 200"
        className="h-8 w-8"
      >
        <mask fill="white" id={`mask-${id}`}>
          <rect height={200} width={200} />
        </mask>
        <rect
          mask={`url(#mask-${id})`}
          strokeWidth={40}
          height={200}
          width={200}
          fill="rgba(207,205,205,0.2)"
          stroke="#8c00ff"
          style={{
            strokeDasharray: 800,
            strokeDashoffset: checked ? 0 : 800,
            transition: "stroke-dashoffset 0.5s ease-in",
          }}
        />
        <path
          strokeWidth={15}
          d="M52 111.018L76.9867 136L149 64"
          stroke="#8c00ff"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 172,
            strokeDashoffset: checked ? 0 : 172,
            transition: "stroke-dashoffset 0.5s ease-in",
          }}
        />
      </svg>
    </label>
  )
}

/* ── Phase status icons ── */
function PhaseIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done)
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00AFB9]/20">
        <CheckCircle2 className="h-5 w-5 text-[#00AFB9]" />
      </span>
    )
  if (active)
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0081A7]/15">
        <Loader2 className="h-5 w-5 animate-spin text-[#0081A7]" />
      </span>
    )
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
      <Circle className="h-5 w-5 text-white/30" />
    </span>
  )
}

/* ── Sensitivity badge ── */
function SensitivityBadge({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${value === "SAFE" ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-amber-500/20 text-amber-500 border-amber-500/30"}`}>
      {value}
    </span>
  )
}

/* ── Override-action mini select ── */
function OverrideSelect({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const options = ["", "SUPPRESS", "GENERALIZE", "RETAIN", "RETAIN_WITH_NOISE", "PSEUDONYMIZE"]
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-lg border border-white/15 bg-white/10 py-1.5 pl-3 pr-8 text-xs text-white/90 backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-[#8c00ff]/60"
      >
        <option value="" className="bg-[#1a1a2e] text-white/60">(Suggested)</option>
        {options.filter(o=>o).map((o) => (
          <option key={o} value={o} className="bg-[#1a1a2e] text-white">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3 w-3 text-white/50" />
    </div>
  )
}

/* ── Genie Modal (macOS-style) ── */
function HumanApprovalModal({
  columnsData,
  decisions,
  setDecisions,
  targetRows,
  setTargetRows,
  onApprove,
  onDismiss,
}: {
  columnsData: any[]
  decisions: any
  setDecisions: (val: any) => void
  targetRows: number
  setTargetRows: (val: number) => void
  onApprove: () => void
  onDismiss: () => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Backdrop blur */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: "rgba(0,10,30,0.55)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
        onClick={onDismiss}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Genie sheet — scales from bottom-center */}
      <motion.div
        className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl p-[1px]"
        style={{
          background: "linear-gradient(135deg, rgba(140,0,255,0.5) 0%, rgba(0,175,185,0.4) 50%, rgba(0,129,167,0.3) 100%)",
          boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
        }}
        initial={{ opacity: 0, scale: 0.55, y: 120, originX: "50%", originY: "100%" }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.6, y: 100 }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 28,
          mass: 0.9,
        }}
      >
        <div
          className="relative overflow-hidden rounded-[calc(1.5rem-1px)]"
          style={{
            background: "linear-gradient(145deg, rgba(18,18,40,0.96) 0%, rgba(10,10,28,0.98) 100%)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
          }}
        >
          {/* Ambient glow blobs */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-[#8c00ff]/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-[#00AFB9]/12 blur-3xl" />

          {/* Header */}
          <div className="relative flex items-center justify-between border-b border-white/8 px-8 py-6">
            <div className="flex items-center gap-4">
              {/* macOS traffic lights */}
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-[#8c00ff]" />
                <h2 className="text-lg font-bold text-white">Human Approval Required</h2>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-white/50 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Subtitle */}
          <div className="px-8 pt-5 pb-3 flex flex-wrap justify-between items-end gap-3">
            <p className="text-sm text-white/55 max-w-xl">
              Review classification decisions and override privacy actions before synthetic generation begins. Approve each column to proceed.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-white/40">Rows to synthesize:</label>
              <input 
                type="number" 
                value={targetRows} 
                onChange={(e) => setTargetRows(parseInt(e.target.value) || 1000)}
                className="w-32 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#8c00ff]/60"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto px-8 pb-6">
            <table className="w-full table-auto border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  {["Column Name", "Type", "Sensitivity", "Suggested Action", "Override", "Epsilon (ε)", "Approve"].map((h) => (
                    <th
                      key={h}
                      className="py-3 pr-4 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40 first:pl-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {columnsData.map((item, i) => {
                  const action = decisions[item.column_name]?.override_action || item.compliance_action
                  return (
                  <motion.tr
                    key={item.column_name}
                    className="border-b border-white/5 transition-colors hover:bg-white/3"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.3 }}
                  >
                    <td className="py-4 pr-4 font-mono text-sm font-medium text-white">{item.column_name}</td>
                    <td className="py-4 pr-4 text-xs text-white/70">{item.inferred_type || "-"}</td>
                    <td className="py-4 pr-4">
                      <SensitivityBadge value={item.sensitivity_class} />
                    </td>
                    <td className="py-4 pr-4 text-xs text-white/60">{item.compliance_action}</td>
                    <td className="py-4 pr-4">
                      <OverrideSelect 
                        value={decisions[item.column_name]?.override_action || ""}
                        onChange={(val) => setDecisions({...decisions, [item.column_name]: {...decisions[item.column_name], override_action: val}})}
                      />
                    </td>
                    <td className="py-4 pr-4">
                      <input 
                        type="number" 
                        step="0.1" 
                        disabled={action !== "RETAIN_WITH_NOISE"}
                        value={decisions[item.column_name]?.epsilon_budget || 1.0}
                        onChange={(e) => setDecisions({...decisions, [item.column_name]: {...decisions[item.column_name], epsilon_budget: parseFloat(e.target.value)}})}
                        className="w-16 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-sm text-white outline-none disabled:opacity-30 focus:border-[#0081A7]"
                      />
                    </td>
                    <td className="py-4">
                      <div className="flex justify-center">
                        <ApproveCheckbox 
                          id={`${item.column_name}-${i}`} 
                          checked={decisions[item.column_name]?.approved || false}
                          onChange={() => setDecisions({...decisions, [item.column_name]: {...decisions[item.column_name], approved: !decisions[item.column_name]?.approved}})}
                        />
                      </div>
                    </td>
                  </motion.tr>
                )})}
              </tbody>
            </table>
          </div>

          {/* Footer actions */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/8 px-8 py-5">
            <button
              onClick={onDismiss}
              className="rounded-xl border border-white/15 bg-white/8 px-5 py-2.5 text-sm font-medium text-white/70 transition-all hover:bg-white/15 hover:text-white"
            >
              Review Later
            </button>
            <button
              onClick={onApprove}
              className="rounded-xl bg-gradient-to-r from-[#8c00ff] to-[#0081A7] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(140,0,255,0.35)] transition-all hover:shadow-[0_12px_32px_rgba(140,0,255,0.5)] hover:-translate-y-0.5"
            >
              Approve & Generate →
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════
   Main Pipeline Page
   ══════════════════════════════════════════════ */
export default function PipelinePage() {
  const params = useParams<{ job_id: string }>()
  const router = useRouter()
  const [phase, setPhase] = useState("UPLOADED")
  const [logs, setLogs] = useState<{ time: string; msg: string }[]>([])
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [columnsData, setColumnsData] = useState<any[]>([])
  const [targetRows, setTargetRows] = useState(1000)
  const [decisions, setDecisions] = useState<any>({})
  const ws = useRef<WebSocket | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const phaseIndex = pipelinePhases.indexOf(phase)

  const phaseStatus = useMemo(
    () => pipelinePhases.slice(1, 7).map((p) => {
      const idx = pipelinePhases.indexOf(p)
      return { phase: p, done: idx < phaseIndex, active: idx === phaseIndex, waiting: idx > phaseIndex }
    }),
    [phaseIndex]
  )

  const phaseLabels: Record<string, string> = {
    UPLOADED: "Uploaded",
    PROFILING: "Schema Profiling",
    COMPLIANCE: "Policy Compliance",
    AWAITING_APPROVAL: "Awaiting Approval",
    GENERATING: "Data Generation",
    VALIDATING: "Validation",
    COMPLETE: "Complete",
    FAILED: "Failed",
  }

  // Effect to fetch and connect websocket
  useEffect(() => {
    if (!params.job_id) return

    // Start pipeline
    fetch(`${API_BASE}/start-pipeline/${params.job_id}`, { method: "POST" }).catch(console.error)

    ws.current = new WebSocket(`${WS_BASE}/${params.job_id}`)
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const time = new Date().toLocaleTimeString()
      
      if (data.type === "PHASE_CHANGE") {
        setPhase(data.payload.phase)
        setLogs((prev) => [...prev, { time, msg: `Phase changed to ${data.payload.phase}` }])
      } else if (data.type === "AGENT_LOG") {
        setLogs((prev) => [...prev, { time, msg: `Agent: ${data.payload.message}` }])
      } else if (data.type === "AWAITING_APPROVAL") {
        setLogs((prev) => [...prev, { time, msg: "Pipeline paused. Waiting for human approval..." }])
        fetchApprovalData()
      } else if (data.type === "PIPELINE_COMPLETE") {
        setLogs((prev) => [...prev, { time, msg: "Pipeline completed successfully!" }])
        router.push(`/results/${params.job_id}`)
      } else if (data.type === "PIPELINE_ERROR") {
        setLogs((prev) => [...prev, { time, msg: `CRITICAL ERROR: ${data.payload.error}` }])
      }
    }

    return () => ws.current?.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.job_id])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const fetchApprovalData = async () => {
    try {
      const res = await fetch(`${API_BASE}/results/${params.job_id}`)
      const data = await res.json()
      setColumnsData(data.column_summary || [])
      
      const initialDecisions: any = {}
      ;(data.column_summary || []).forEach((c: any) => {
        initialDecisions[c.column_name] = {
          approved: true,
          override_action: "",
          epsilon_budget: c.epsilon_budget || 1.0
        }
      })
      setDecisions(initialDecisions)
      setApprovalOpen(true)
    } catch (e) {
      console.error(e)
    }
  }

  const submitApproval = async () => {
    const payload = Object.keys(decisions).map((col) => ({
      column_name: col,
      approved: decisions[col].approved,
      override_action: decisions[col].override_action || null,
      user_override: !!decisions[col].override_action,
      epsilon_budget: decisions[col].epsilon_budget
    }))

    try {
      setApprovalOpen(false)
      setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Approval submitted, resuming..." }])
      await fetch(`${API_BASE}/approve-plan/${params.job_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decisions: payload, synthetic_rows: targetRows })
      })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#004a5e]">Pipeline Monitor</h1>
          <p className="mt-1 text-sm font-medium" style={{ color: "#0081A7" }}>
            Job ID:{" "}
            <span className="rounded-md bg-[#0081A7]/12 px-2 py-0.5 font-mono text-[#005f7a]">
              {params.job_id}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[#00AFB9]/25 bg-white/60 px-4 py-2 backdrop-blur-sm">
          <Clock className="h-4 w-4 text-[#00AFB9]" />
          <span className="text-sm font-medium text-[#005f7a]">Live</span>
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#00AFB9]" />
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        <section className="mb-6 flex flex-col">
          <div className="flex-1 flex flex-col pt-2 pr-4">
            <h2 className="mb-6 px-1 text-sm font-bold uppercase tracking-[0.2em] text-[#0081A7]">
              Progress Rail
            </h2>

            <div className="flex flex-col gap-2">
              <AnimatePresence mode="popLayout">
                {phaseStatus.map((item, index) => {
                  if (item.waiting) return null
                  return (
                    <motion.div
                      key={item.phase}
                      layout
                      initial={{ opacity: 0, y: 40, scale: 0.94 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{
                        type: "spring",
                        stiffness: 320,
                        damping: 30,
                        delay: index * 0.04,
                      }}
                      className="flex items-center gap-4 rounded-xl px-5 py-4 transition-colors"
                      style={{
                        background: item.active
                          ? "rgba(0,129,167,0.08)"
                          : item.done
                          ? "rgba(0,175,185,0.05)"
                          : "transparent",
                        borderLeft: item.active
                          ? "3px solid #0081A7"
                          : item.done
                          ? "3px solid #00AFB9"
                          : "3px solid rgba(0,129,167,0.15)",
                      }}
                    >
                      <PhaseIcon done={item.done} active={item.active} />

                        <div className="flex-1">
                          <p
                            className="text-sm font-bold"
                            style={{
                              color: item.active
                                ? "#0081A7"
                                : item.done
                                ? "#00AFB9"
                                : "#64748b",
                            }}
                          >
                            {phaseLabels[item.phase] ?? item.phase}
                          </p>
                          <p
                            className="mt-0.5 text-xs font-medium"
                            style={{
                              color: item.active
                                ? "#005f7a"
                                : item.done
                                ? "#00AFB9"
                                : "#94a3b8",
                            }}
                          >
                            {item.done ? "Completed" : item.active ? "Running" : "Waiting"}
                          </p>
                        </div>

                        {item.active && (
                          <motion.div
                            className="h-1.5 w-24 overflow-hidden rounded-full bg-[#0081A7]/15"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                          >
                            <motion.div
                              className="h-full rounded-full bg-[#0081A7]"
                              initial={{ width: "0%" }}
                              animate={{ width: "70%" }}
                              transition={{ duration: 1.8, ease: "easeInOut" }}
                            />
                          </motion.div>
                        )}

                        {item.done && (
                          <span className="rounded-full bg-[#00AFB9]/12 px-3 py-1 text-[11px] font-semibold text-[#6ee7ef]">
                            ✓ Done
                          </span>
                        )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {/* Waiting phases — ghost placeholders */}
              {phaseStatus
                .filter((item) => item.waiting)
                .map((item) => (
                  <div
                    key={item.phase}
                    className="flex items-center gap-4 rounded-xl px-5 py-4 opacity-50"
                    style={{ borderLeft: "3px solid transparent" }}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#0081A7]/20">
                      <Circle className="h-4 w-4 text-[#0081A7]/30" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#0081A7]/60">
                        {phaseLabels[item.phase] ?? item.phase}
                      </p>
                      <p className="text-xs text-[#0081A7]/40">Waiting</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

      </div>

      {/* Human Approval Modal — genie effect */}
      <AnimatePresence>
        {approvalOpen && (
          <HumanApprovalModal
            columnsData={columnsData}
            decisions={decisions}
            setDecisions={setDecisions}
            targetRows={targetRows}
            setTargetRows={setTargetRows}
            onApprove={submitApproval}
            onDismiss={() => setApprovalOpen(false)}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
