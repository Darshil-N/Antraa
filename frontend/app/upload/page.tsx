"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShieldCheck, Zap, FileCheck, ArrowRight, Lock, CheckCircle2 } from "lucide-react"

const sensitiveHints = ["ssn", "dob", "email", "phone", "account", "address", "gender", "race"]
const API_BASE = "http://localhost:8000/api"

const ease = [0.22, 1, 0.36, 1] as const

/* ── Pipeline steps shown in the right panel ── */
const STEPS = [
  { n: "01", label: "Upload",      sub: "CSV or Parquet file",       done: false },
  { n: "02", label: "Schema",      sub: "Auto-detect & tag columns", done: false },
  { n: "03", label: "Policy Map",  sub: "HIPAA / GDPR / GLBA",       done: false },
  { n: "04", label: "Synthesise",  sub: "ε-DP generation",           done: false },
  { n: "05", label: "Validate",    sub: "Bias & fidelity checks",    done: false },
]

/* ── Animated folder ── */
function FolderIcon({ active }: { active: boolean }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" className="h-full w-full">
      <motion.path
        d="M4 7V17C4 18.1046 4.89543 19 6 19H18C19.1046 19 20 18.1046 20 17V9C20 7.89543 19.1046 7 18 7H11L9 5H6C4.89543 5 4 5.89543 4 7Z"
        stroke="#0081A7" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none"
        animate={{ translateY: active ? -4 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      />
      <motion.path
        d="M2 11C2 10.4477 2.44772 10 3 10H21C21.5523 10 22 10.4477 22 11V17C22 18.1046 21.1046 19 20 19H4C2.89543 19 2 18.1046 2 17V11Z"
        stroke="#0081A7" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
        fill="rgba(0,129,167,0.08)"
        animate={{ translateY: active ? 3 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
      />
    </svg>
  )
}

export default function UploadPage() {
  const router = useRouter()

  const [fileName, setFileName]         = useState("")
  const [columns, setColumns]           = useState<string[]>([])
  const [previewRows, setPreviewRows]   = useState<any[]>([])
  const [jobId, setJobId]               = useState<string | null>(null)
  const [isUploading, setIsUploading]   = useState(false)
  const [uploadDone, setUploadDone]     = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const [folderHovered, setFolderHovered] = useState(false)
  const [datasetName, setDatasetName]     = useState("")
  const [dataType, setDataType]           = useState("CSV (Tabular)")
  const [dragging, setDragging]           = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(selectedFile: File | undefined) {
    if (!selectedFile) return
    setFileName(selectedFile.name)
    setIsUploading(true)
    setUploadDone(false)
    setError(null)

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const res  = await fetch(`${API_BASE}/upload-dataset`, { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Upload failed")
      setJobId(data.job_id)
      setColumns(data.columns)
      setPreviewRows(data.preview)
      setUploadDone(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const canAnalyse = !!jobId && !isUploading

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-12">

      {/* ── Page header ── */}
      <motion.div
        className="mb-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Link href="/" className="text-xs font-medium text-[#0081A7]/60 hover:text-[#0081A7] transition-colors">
            Home
          </Link>
          <span className="text-[#0081A7]/30 text-xs">›</span>
          <span className="text-xs font-medium text-[#003d4f]">Upload Dataset</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-[#003d4f] lg:text-4xl flex items-center gap-4">
          Upload Dataset
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F07167]/20 bg-[#F07167]/8 px-3 py-1 text-xs font-semibold text-[#F07167]">
            <Zap className="h-3 w-3" />
            &lt;2s synthesis
          </span>
        </h1>
        <p className="mt-2 text-sm text-[#005f7a]/65 max-w-lg">
          Drop your CSV or Parquet file to begin the compliance pipeline. We’ll profile, map, and synthesise — all in one flow.
        </p>
      </motion.div>

      {/* ── Two-column layout ── */}
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

        {/* ════ LEFT: Form ════ */}
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.6, ease }}
        >
          {/* ── Drop Zone ── */}
          <div
            role="button"
            tabIndex={0}
            aria-label="File drop zone"
            className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed px-8 py-16 text-center
              transition-all duration-300 outline-none
              focus-visible:ring-2 focus-visible:ring-[#0081A7]/40
              ${isUploading ? "pointer-events-none opacity-60" : ""}`}
            style={{
              borderColor: dragging ? "#0081A7" : uploadDone ? "#00AFB9" : "rgba(0,129,167,0.28)",
              background:  dragging
                ? "rgba(0,129,167,0.06)"
                : uploadDone
                  ? "rgba(0,175,185,0.04)"
                  : "rgba(255,255,255,0.45)",
              backdropFilter: "blur(10px)",
            }}
            onMouseEnter={() => setFolderHovered(true)}
            onMouseLeave={() => setFolderHovered(false)}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          >
            {/* animated border glow */}
            <div
              className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-500"
              style={{
                background: "radial-gradient(ellipse at 60% 40%, rgba(0,175,185,0.10), transparent 70%)",
                opacity: folderHovered || dragging ? 1 : 0,
              }}
            />

            <input
              ref={inputRef} type="file" accept=".csv,.parquet"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />

            <div className="relative flex flex-col items-center gap-3">
              <AnimatePresence mode="wait">
                {uploadDone ? (
                  <motion.div
                    key="done"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00AFB9]/15"
                  >
                    <CheckCircle2 className="h-8 w-8 text-[#00AFB9]" />
                  </motion.div>
                ) : (
                  <motion.div key="folder" className="h-14 w-14">
                    <FolderIcon active={folderHovered || dragging} />
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <p className="text-base font-semibold text-[#003d4f]">
                  {isUploading
                    ? `Uploading ${fileName}…`
                    : uploadDone
                      ? fileName
                      : "Drag & drop your file here"}
                </p>
                <p className="mt-1 text-sm text-[#94a3b8]">
                  {isUploading ? "Please wait…"
                    : uploadDone ? (
                      <span className="text-[#00AFB9] font-medium">File ready ✓ — click to replace</span>
                    ) : (
                      <>or <span className="font-semibold text-[#0081A7] underline underline-offset-2">browse local files</span></>
                    )}
                </p>
                {!fileName && !isUploading && (
                  <p className="mt-3 text-[10px] uppercase tracking-[0.22em] text-[#cbd5e1]">
                    CSV · Parquet · up to 500 MB
                  </p>
                )}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-red-50 px-4 py-2 text-xs font-semibold text-red-500"
                >
                  ⚠ {error}
                </motion.p>
              )}
            </div>
          </div>

          {/* ── Input row ── */}
          <div className={`grid grid-cols-2 gap-4 ${isUploading ? "pointer-events-none opacity-50" : ""}`}>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                Dataset Name
              </label>
              <input
                type="text"
                placeholder="e.g. Sales_Report_Q1"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="rounded-xl border border-[#e2e8f0] bg-white/65 px-4 py-3 text-sm text-[#1e293b]
                  placeholder:text-[#cbd5e1] outline-none backdrop-blur-sm
                  transition-all duration-200
                  focus:border-[#0081A7] focus:bg-white focus:ring-2 focus:ring-[#0081A7]/15"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
                Data Type
              </label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                className="rounded-xl border border-[#e2e8f0] bg-white/65 px-4 py-3 text-sm text-[#1e293b]
                  outline-none backdrop-blur-sm appearance-none cursor-pointer
                  transition-all duration-200
                  focus:border-[#0081A7] focus:bg-white focus:ring-2 focus:ring-[#0081A7]/15"
              >
                <option>CSV (Tabular)</option>
                <option>JSON (Unstructured)</option>
                <option>Parquet</option>
              </select>
            </div>
          </div>

          {/* ── Action row ── */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-[#64748b]
                  transition-all duration-200 hover:bg-white/60 hover:text-[#334155]"
              >
                Cancel
              </Link>
              <Link
                href="/bias-audit"
                className="rounded-xl border border-[#0081A7]/20 bg-white/40 px-5 py-2.5
                  text-sm font-semibold text-[#0081A7] backdrop-blur-sm
                  transition-all duration-200 hover:bg-[#0081A7]/8 hover:border-[#0081A7]/40"
              >
                Bias Audit Only
              </Link>
            </div>

            {/* Start Analysis — always clearly visible */}
            <motion.button
              id="start-analysis-btn"
              disabled={!canAnalyse}
              onClick={() => canAnalyse && router.push(`/pipeline/${jobId}`)}
              className={`group relative flex items-center gap-2.5 overflow-hidden rounded-xl
                px-7 py-3 text-sm font-bold tracking-wide transition-all duration-300
                ${canAnalyse
                  ? "text-white shadow-[0_8px_28px_rgba(0,129,167,0.32)] hover:shadow-[0_14px_36px_rgba(0,129,167,0.48)] hover:-translate-y-0.5"
                  : "cursor-not-allowed text-[#94a3b8] bg-[#f1f5f9] border border-[#e2e8f0]"
                }`}
              style={canAnalyse ? {
                background: "linear-gradient(135deg, #0081A7 0%, #00AFB9 100%)",
              } : {}}
              whileHover={canAnalyse ? { scale: 1.02 } : {}}
              whileTap={canAnalyse ? { scale: 0.97 } : {}}
            >
              {/* shine sweep on hover */}
              {canAnalyse && (
                <span
                  className="pointer-events-none absolute inset-0 translate-x-[-100%] skew-x-[-20deg]
                    bg-white/20 transition-transform duration-500 group-hover:translate-x-[130%]"
                />
              )}
              Start Analysis
              <ArrowRight className={`h-4 w-4 transition-transform duration-200 ${canAnalyse ? "group-hover:translate-x-1" : ""}`} />
            </motion.button>
          </div>

          {/* ── Upload progress hint ── */}
          <AnimatePresence>
            {isUploading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 rounded-xl bg-[#0081A7]/6 px-4 py-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0081A7]/15">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#0081A7] to-[#00AFB9]"
                      initial={{ width: "0%" }}
                      animate={{ width: "85%" }}
                      transition={{ duration: 2.5, ease: "easeOut" }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[#0081A7]">Uploading…</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Preview Table ── inline, no gap */}
          <div className="overflow-x-auto rounded-2xl border border-[#0081A7]/12 bg-white/55 backdrop-blur-sm min-h-[140px]">
            {columns.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-[#0081A7]/8">
                    {columns.map((col) => {
                      const sensitive = sensitiveHints.some((h) => col.toLowerCase().includes(h))
                      return (
                        <TableHead key={col} className="text-[#005f7a] font-semibold">
                          {sensitive
                            ? <span className="rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-500">{col}</span>
                            : col}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, ri) => (
                    <TableRow key={ri} className="border-[#0081A7]/5 transition-colors hover:bg-[#0081A7]/3">
                      {columns.map((col) => (
                        <TableCell key={`${ri}-${col}`} className="text-sm text-[#334155]">
                          {String((row as Record<string, unknown>)[col])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-[140px] flex-col items-center justify-center gap-1.5">
                <p className="text-sm text-[#94a3b8]">Upload a file to see a preview.</p>
                <p className="text-xs text-[#cbd5e1]">Sensitive columns are highlighted in red.</p>
              </div>
            )}
          </div>

        </motion.div>

        {/* ════ RIGHT: Info Panel ════ */}
        <motion.aside
          className="flex flex-col gap-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.18, duration: 0.65, ease }}
        >
          {/* Pipeline steps */}
          <div className="rounded-2xl border border-[#0081A7]/12 bg-white/45 p-6 backdrop-blur-sm">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.28em] text-[#00AFB9]">
              Pipeline Steps
            </p>
            <div className="flex flex-col gap-0">
              {STEPS.map((step, i) => (
                <div key={step.n} className="flex items-start gap-3">
                  {/* connector line */}
                  <div className="flex flex-col items-center">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold
                      ${i === 0
                        ? "bg-[#0081A7] text-white shadow-[0_4px_12px_rgba(0,129,167,0.35)]"
                        : "border border-[#0081A7]/20 bg-white/60 text-[#0081A7]/50"}`}
                    >
                      {i === 0 ? "→" : step.n}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="my-1 h-6 w-px bg-[#0081A7]/12" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`text-sm font-semibold ${i === 0 ? "text-[#003d4f]" : "text-[#64748b]"}`}>
                      {step.label}
                    </p>
                    <p className="text-xs text-[#94a3b8]">{step.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy badge */}
          <div className="rounded-2xl border border-[#00AFB9]/20 bg-gradient-to-br from-[#0081A7]/6 to-[#00AFB9]/4 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0081A7]/12">
                <Lock className="h-4 w-4 text-[#0081A7]" />
              </div>
              <p className="text-sm font-bold text-[#003d4f]">Privacy Guaranteed</p>
            </div>
            <ul className="space-y-2">
              {[
                "ε-Differential privacy enforced",
                "Raw data never stored",
                "HIPAA · GDPR · GLBA ready",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-[#005f7a]/80">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#00AFB9]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Format support */}
          <div className="rounded-2xl border border-[#0081A7]/10 bg-white/40 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-[#0081A7]/70" />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0081A7]/70">
                Supported Formats
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["CSV", "Parquet", "Up to 500 MB"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#0081A7]/18 bg-[#0081A7]/6 px-3 py-1 text-[11px] font-semibold text-[#0081A7]/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </main>
  )
}
