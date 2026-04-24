"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const sensitiveHints = ["ssn", "dob", "email", "phone", "account", "address", "gender", "race"]
const API_BASE = "http://localhost:8000/api"

export default function UploadPage() {
  const router = useRouter()
  const [fileName, setFileName] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      <section className="rounded-xl border border-border bg-card p-7 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Upload Dataset</h1>
        <p className="mt-2 text-sm text-secondary-foreground">
          Accepted formats: CSV and Parquet. Maximum file size: 500MB. Uploaded files are used for schema analysis and
          policy mapping.
        </p>

        <div className="mt-6 rounded-lg border border-border bg-secondary/45 p-6">
          <label className="block text-sm font-medium text-foreground">Select file</label>
          <input
            type="file"
            accept=".csv,.parquet"
            className="mt-3 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-secondary-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary-foreground"
            onChange={async (event) => {
              const selectedFile = event.target.files?.[0]
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
            }}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            {fileName ? (isUploading ? `Uploading: ${fileName}...` : `Selected: ${fileName}`) : "No file selected."}
          </p>
          {error && <p className="mt-2 text-sm text-red-500">Error: {error}</p>}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button 
            disabled={!jobId || isUploading} 
            onClick={() => router.push(`/pipeline/${jobId}`)}
          >
            Start Analysis
          </Button>
          <Button variant="outline" asChild>
            <Link href="/bias-audit">Run Bias Audit Only</Link>
          </Button>
        </div>
      </section>

      <Card className="mt-7">
        <CardHeader>
          <CardTitle className="text-xl">Preview (first rows)</CardTitle>
        </CardHeader>
        <CardContent>
          {columns.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => {
                      const sensitive = sensitiveHints.some((hint) => column.toLowerCase().includes(hint))
                      return (
                        <TableHead key={column}>
                          <span className={sensitive ? "rounded bg-amber-500/20 px-2 py-1 text-amber-500" : ""}>{column}</span>
                        </TableHead>
                      )
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {columns.map((column) => (
                        <TableCell key={`${rowIndex}-${column}`}>{String((row as Record<string, unknown>)[column])}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Upload a file to see preview.</p>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
