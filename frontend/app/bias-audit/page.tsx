"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const API_BASE = "http://localhost:8000/api"

function BiasAuditEntryContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sourceJobId = searchParams.get("source_job_id")

  const [selectedSource, setSelectedSource] = useState(sourceJobId ? "existing-result" : "new-upload")
  const [file, setFile] = useState<File | null>(null)
  const [jobIdInput, setJobIdInput] = useState(sourceJobId || "")
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startAudit = async () => {
    if (selectedSource === "new-upload" && !file) return setError("Please select a file.")
    if (selectedSource === "existing-result" && !jobIdInput) return setError("Please provide a Job ID.")

    setIsStarting(true)
    setError(null)

    const formData = new FormData()
    if (selectedSource === "new-upload" && file) {
      formData.append("file", file)
    } else if (selectedSource === "existing-result" && jobIdInput) {
      formData.append("source_job_id", jobIdInput)
    }

    try {
      const res = await fetch(`${API_BASE}/bias-audit/start`, { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Failed to start bias audit")
      
      router.push(`/bias-audit/${data.audit_id}`)
    } catch (e: any) {
      setError(e.message)
      setIsStarting(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Bias Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            Run a standalone fairness audit on a new dataset or on previous synthetic output.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="rounded-lg border border-border bg-card p-4 text-sm text-foreground">
              <input
                type="radio"
                name="source"
                className="mr-2"
                checked={selectedSource === "new-upload"}
                onChange={() => setSelectedSource("new-upload")}
              />
              Upload fresh dataset
            </label>
            <label className="rounded-lg border border-border bg-card p-4 text-sm text-foreground">
              <input
                type="radio"
                name="source"
                className="mr-2"
                checked={selectedSource === "existing-result"}
                onChange={() => setSelectedSource("existing-result")}
              />
              Use previous synthesis output
            </label>
          </div>

          <div className="mt-6 rounded-lg border border-border bg-secondary/45 p-6">
            {selectedSource === "new-upload" ? (
              <input
                type="file"
                accept=".csv,.parquet"
                className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-foreground"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            ) : (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Source Job ID</label>
                <input 
                  type="text" 
                  className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
                  placeholder="e.g. 1234-abcd..."
                  value={jobIdInput}
                  onChange={(e) => setJobIdInput(e.target.value)}
                />
              </div>
            )}
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          </div>

          <div className="mt-6">
            <Button disabled={isStarting} onClick={startAudit}>
              {isStarting ? "Starting..." : "Start Bias Audit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

export default function BiasAuditEntryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-slate-500">Loading...</div>}>
      <BiasAuditEntryContent />
    </Suspense>
  )
}
