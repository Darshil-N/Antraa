"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts"

const API_BASE = "http://localhost:8000/api"

export default function ResultsPage() {
  const params = useParams<{ job_id: string }>()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch(`${API_BASE}/results/${params.job_id}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
  }, [params.job_id])

  if (!data) return <div className="p-8 text-center">Loading results...</div>

  const q = data.quality || {}
  const riskScore = ((q.privacy_risk_score || 0) * 100).toFixed(1)
  const overallQuality = ((q.overall_quality_score || 0) * 100).toFixed(1)
  const correlationSim = ((q.correlation_similarity || 0) * 100).toFixed(1)
  
  const epsSummary = q.epsilon_summary || {}
  const perColEps = epsSummary.per_column || {}

  const ksScores = q.ks_test_scores || {}
  const ksChartData = Object.keys(ksScores).map((col) => ({
    name: col,
    score: ksScores[col] * 100,
  }))

  const metrics = [
    { name: "Overall Quality", value: overallQuality + "%", color: "text-[#4caf50]" },
    { name: "Privacy Risk Score", value: riskScore + "%", color: "text-[#ff9800]" },
    { name: "Correlation Preservation", value: correlationSim + "%", color: "text-[#0081A7]" },
  ]

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Results Dashboard</h1>
          <p className="text-sm text-secondary-foreground">Job ID: {params.job_id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/pattern/${params.job_id}`}>Run Pattern Analysis</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/finetune/${params.job_id}`}>Fine-Tune Model</Link>
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.name}>
            <CardHeader>
              <CardTitle className="text-base text-secondary-foreground">{metric.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-semibold ${metric.color}`}>{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Per-column KS Scores</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {ksChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ksChartData} layout="vertical" margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#444" />
                  <XAxis type="number" domain={[0, 100]} stroke="#888" />
                  <YAxis dataKey="name" type="category" stroke="#888" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#444" }} />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {ksChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.score >= 85 ? "#4caf50" : entry.score >= 65 ? "#ff9800" : "#ff5252"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No KS Scores Available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Column Privacy Profiles</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Epsilon (ε)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.column_summary || []).map((item: any) => (
                  <TableRow key={item.column_name}>
                    <TableCell className="font-medium">{item.column_name}</TableCell>
                    <TableCell>{item.compliance_action}</TableCell>
                    <TableCell>
                      {item.compliance_action === "RETAIN_WITH_NOISE" ? (
                        <span className="rounded bg-amber-500/20 px-2 py-1 text-xs text-amber-500 font-bold">
                          ε = {perColEps[item.column_name] || item.epsilon_budget}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Export Artifacts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {Object.entries(data.downloads || {}).map(([name, url]) => (
            <Button key={name} variant="default" asChild>
              <a href={`http://localhost:8000${url as string}`} target="_blank" rel="noreferrer">{name}</a>
            </Button>
          ))}
          <Button variant="outline" asChild>
            <Link href={`/bias-audit?source_job_id=${params.job_id}`}>Run Bias Audit on This Data</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
