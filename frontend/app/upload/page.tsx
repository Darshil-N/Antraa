"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const sensitiveHints = ["ssn", "dob", "email", "phone", "account", "address", "gender", "race"]
const API_BASE = "http://localhost:8000/api"

/* ── Animated Folder SVG ── */
function FolderIcon({ hovered }: { hovered: boolean }) {
  return (
    <svg fill="none" viewBox="0 0 24 24" className="h-full w-full">
      {/* Folder top */}
      <motion.path
        d="M4 7V17C4 18.1046 4.89543 19 6 19H18C19.1046 19 20 18.1046 20 17V9C20 7.89543 19.1046 7 18 7H11L9 5H6C4.89543 5 4 5.89543 4 7Z"
        stroke="#3b82f6"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animate={{ translateY: hovered ? -5 : 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
      />
      {/* Folder front */}
      <motion.path
        d="M2 11C2 10.4477 2.44772 10 3 10H21C21.5523 10 22 10.4477 22 11V17C22 18.1046 21.1046 19 20 19H4C2.89543 19 2 18.1046 2 17V11Z"
        stroke="#3b82f6"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(59,130,246,0.07)"
        animate={{ translateY: hovered ? 4 : 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 24 }}
      />
    </svg>
  )
}

export default function UploadPage() {
  const router = useRouter()
  
  // File status
  const [fileName, setFileName] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // UI status
  const [folderHovered, setFolderHovered] = useState(false)
  const [datasetName, setDatasetName] = useState("")
  const [dataType, setDataType] = useState("CSV (Tabular)")
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(selectedFile: File | undefined) {
    if (!selectedFile) return
    setFileName(selectedFile.name)
    setFile(selectedFile)
    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", selectedFile)

    try {
      const res = await fetch(`${API_BASE}/upload-dataset`, { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Upload failed")
      
      setJobId(data.job_id)
      setColumns(data.columns)
      setPreviewRows(data.preview)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      {/* ── Animated Upload Card ── */}
      <div className="flex justify-center">
        <motion.div
          className="w-full max-w-2xl overflow-hidden rounded-3xl p-[1px]"
          style={{
            background:
              "linear-gradient(135deg, rgba(59,130,246,0.5) 0%, rgba(0,175,185,0.35) 50%, rgba(59,130,246,0.2) 100%)",
            boxShadow: "0 24px 64px rgba(59,130,246,0.14)",
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div
            className="relative overflow-hidden rounded-[calc(1.5rem-1px)] p-8"
            style={{
              background:
                "linear-gradient(145deg, rgba(255,255,255,0.92) 0%, rgba(248,251,255,0.88) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
          >
            {/* Ambient blobs */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-blue-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-8 -bottom-8 h-40 w-40 rounded-full bg-[#00AFB9]/8 blur-2xl" />

            {/* Header */}
            <div className="relative mb-7">
              <h1 className="text-2xl font-bold text-[#1e293b]">Upload Dataset</h1>
              <p className="mt-1.5 text-sm text-[#64748b]">
                Ready to process your data? Drop it here — accepted formats: CSV &amp; Parquet (max 500 MB).
              </p>
            </div>

            {/* Drop Zone */}
            <div
              className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-400 ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
              style={{
                borderColor: dragging ? "#3b82f6" : "#e2e8f0",
                background: dragging ? "rgba(59,130,246,0.07)" : "rgba(248,251,255,0.9)",
              }}
              onMouseEnter={() => setFolderHovered(true)}
              onMouseLeave={() => setFolderHovered(false)}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              {/* Hover border glow */}
              <div
                className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-400"
                style={{
                  background: "linear-gradient(135deg, rgba(59,130,246,0.06), transparent)",
                  opacity: folderHovered ? 1 : 0,
                }}
              />

              <input
                ref={inputRef}
                type="file"
                accept=".csv,.parquet"
                className="sr-only"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              <div className="relative flex flex-col items-center">
                <div className="mb-4 h-16 w-16">
                  <FolderIcon hovered={folderHovered || dragging} />
                </div>
                <h3 className="text-lg font-semibold text-[#334155]">
                  {fileName ? (isUploading ? `Uploading: ${fileName}...` : fileName) : "Drag & Drop files here"}
                </h3>
                <p className="mt-1 text-sm text-[#94a3b8]">
                  {isUploading ? "Please wait..." : (
                    <>
                      or{" "}
                      <span className="font-semibold text-blue-500 underline underline-offset-2">
                        Browse Local Files
                      </span>
                    </>
                  )}
                </p>
                {!fileName && !isUploading && (
                  <p className="mt-3 text-[11px] text-[#cbd5e1] uppercase tracking-widest">
                    CSV · Parquet · up to 500 MB
                  </p>
                )}
                {error && <p className="mt-4 text-sm font-semibold text-red-500">Error: {error}</p>}
              </div>
            </div>

            {/* Input Grid */}
            <div className={`mt-7 grid grid-cols-2 gap-5 ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]">
                  Dataset Name
                </label>
                <input
                  type="text"
                  placeholder="Sales_Report_Q1"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-[#1e293b] outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]">
                  Data Type
                </label>
                <select
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                  className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-3 text-sm text-[#1e293b] outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 appearance-none"
                >
                  <option>CSV (Tabular)</option>
                  <option>JSON (Unstructured)</option>
                  <option>Parquet</option>
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="mt-8 flex items-center justify-end gap-3">
              <Link
                href="/"
                className="rounded-xl px-5 py-3 text-sm font-semibold text-[#64748b] transition-colors hover:bg-[#f1f5f9]"
              >
                Cancel
              </Link>
              <Link
                href="/bias-audit"
                className="rounded-xl px-5 py-3 text-sm font-semibold text-[#3b82f6] border border-[#3b82f6]/20 transition-colors hover:bg-[#3b82f6]/5"
              >
                Run Bias Audit Only
              </Link>
              <motion.button
                disabled={!jobId || isUploading}
                className={`rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition-all ${
                  !jobId || isUploading
                    ? "opacity-50 cursor-not-allowed bg-gray-400"
                    : ""
                }`}
                style={jobId && !isUploading ? { background: "linear-gradient(135deg, #3b82f6 0%, #0081A7 100%)" } : {}}
                whileHover={jobId && !isUploading ? { y: -2, boxShadow: "0 10px 28px rgba(59,130,246,0.42)" } : {}}
                whileTap={jobId && !isUploading ? { scale: 0.97 } : {}}
                onClick={() => router.push(`/pipeline/${jobId}`)}
              >
                Start Analysis →
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Preview Table ── */}
      <motion.div
        className="mt-10 overflow-hidden rounded-3xl p-[1px]"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,129,167,0.25) 0%, rgba(0,175,185,0.15) 100%)",
          boxShadow: "0 12px 40px rgba(0,129,167,0.1)",
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div
          className="rounded-[calc(1.5rem-1px)] p-6"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <h2 className="mb-4 text-lg font-bold text-[#004a5e]">Preview (first rows)</h2>
          <div className="overflow-x-auto min-h-[150px]">
            {columns.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => {
                      const sensitive = sensitiveHints.some((hint) => column.toLowerCase().includes(hint))
                      return (
                        <TableHead key={column}>
                          <span
                            className={
                              sensitive
                                ? "rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-500"
                                : "text-[#005f7a]"
                            }
                          >
                            {column}
                          </span>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {columns.map((column) => (
                        <TableCell key={`${rowIndex}-${column}`} className="text-sm text-[#334155]">
                          {String((row as Record<string, unknown>)[column])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-[150px] items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">Upload a file to see preview.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </main>
  )
}
