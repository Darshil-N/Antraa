"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const API_BASE = "http://localhost:8000/api"

export default function PatternAnalysisPage() {
  const params = useParams<{ job_id: string }>()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!params.job_id) return
    
    const runAnalysis = async () => {
      try {
        const res = await fetch(`${API_BASE}/analyze-pattern/${params.job_id}`, { method: 'POST' })
        const json = await res.json()
        if (!res.ok) throw new Error(json.detail || 'Analysis failed')
        setData(json)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    
    runAnalysis()
  }, [params.job_id])

  if (loading) return <div className="p-8 text-center text-foreground">Running blind pattern analysis (this may take a minute)...</div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>
  if (!data) return null

  const score = data.preservation_score
  const scoreColor = score >= 0.85 ? '#4caf50' : score >= 0.65 ? '#ff9800' : '#ff5252'

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pattern Analysis Report</h1>
          <p className="text-sm text-secondary-foreground">Job ID: {params.job_id}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Back to Results</Button>
      </div>

      <Card className="mb-6" style={{ borderLeft: `5px solid ${scoreColor}` }}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-4xl font-bold" style={{ color: scoreColor }}>
                {score !== null ? (score * 100).toFixed(1) + '%' : 'N/A'}
              </div>
              <div className="text-sm text-secondary-foreground">Preservation Score</div>
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: scoreColor }}>{data.verdict} PRESERVATION</div>
              <div className="text-sm text-secondary-foreground">
                Original: {data.original_shape?.rows} rows × {data.original_shape?.columns} cols
                {" "}→{" "}
                Synthetic: {data.synthetic_shape?.rows} rows × {data.synthetic_shape?.columns} cols
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-secondary">Original Dataset Narrative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p><b>Overview:</b> {data.original_narrative?.overall_summary}</p>
            <p><b>Correlations:</b> {data.original_narrative?.correlation_highlights}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-secondary">Synthetic Dataset Narrative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p><b>Overview:</b> {data.synthetic_narrative?.overall_summary}</p>
            <p><b>Correlations:</b> {data.synthetic_narrative?.correlation_highlights}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 border-secondary">
        <CardContent className="pt-6 bg-[#1a2f1a] rounded border border-[#4caf50]">
          <h4 className="text-lg font-semibold text-[#4caf50] mb-2">{data.comparison_narrative?.headline}</h4>
          <p className="mb-1"><b>✅ Preserved:</b> {data.comparison_narrative?.preserved_patterns?.join(' | ')}</p>
          <p className="mb-1"><b>⚠️ Drifted:</b> {data.comparison_narrative?.drifted_patterns?.join(' | ')}</p>
          <p className="mt-2 text-sm italic text-[#4caf50] opacity-80">Auditor Conclusion: {data.comparison_narrative?.auditor_conclusion}</p>
        </CardContent>
      </Card>

      {data.numeric_drift && Object.keys(data.numeric_drift).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Per-Column Numeric Drift</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead>Mean Drift %</TableHead>
                  <TableHead>Median Drift %</TableHead>
                  <TableHead>Preservation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(data.numeric_drift).map(([col, d]: [string, any]) => {
                  const pc = (d.preservation_score * 100).toFixed(1)
                  const color = d.preservation_score >= 0.85 ? '#4caf50' : d.preservation_score >= 0.65 ? '#ff9800' : '#ff5252'
                  return (
                    <TableRow key={col}>
                      <TableCell className="font-medium">{col}</TableCell>
                      <TableCell>{d.mean_drift_pct?.toFixed(2)}%</TableCell>
                      <TableCell>{d.median_drift_pct?.toFixed(2)}%</TableCell>
                      <TableCell style={{ color, fontWeight: 'bold' }}>{pc}%</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
