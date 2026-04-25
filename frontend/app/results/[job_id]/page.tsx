"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Legend, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, ComposedChart, Line } from "recharts"

const API_BASE = "http://localhost:8000/api"

export default function ResultsPage() {
  const params = useParams<{ job_id: string }>()
  const [data, setData] = useState<any>(null)
  const [auditData, setAuditData] = useState<any>(null)

  useEffect(() => {
    fetch(`${API_BASE}/results/${params.job_id}`)
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
  }, [params.job_id])

  useEffect(() => {
    if (data?.downloads?.audit_trail) {
      fetch(`http://localhost:8000${data.downloads.audit_trail}`)
        .then(res => res.json())
        .then(setAuditData)
        .catch(console.error)
    }
  }, [data])

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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];
  const epsChartData = (data.column_summary || [])
    .filter((c: any) => c.compliance_action === "RETAIN_WITH_NOISE" || perColEps[c.column_name])
    .map((c: any) => ({
      name: c.column_name,
      value: Number(perColEps[c.column_name] || c.epsilon_budget || 0),
    }))

  const auditGraphData = auditData?.quality?.ks_test_scores ? 
    Object.keys(auditData.quality.ks_test_scores).map(col => ({
      column: col,
      quality: auditData.quality.ks_test_scores[col] * 100,
      epsilon: auditData.quality.epsilon_summary?.per_column?.[col] || 0
    })) : []

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Results Dashboard</h1>
          <p className="text-sm text-secondary-foreground">Job ID: {params.job_id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/cache">📦 View Cache</Link>
          </Button>
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
              <CardTitle className="text-base text-[#0081A7]">{metric.name}</CardTitle>
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
                <AreaChart data={ksChartData} margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#444" />
                  <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 12 }} />
                  <YAxis type="number" domain={[0, 100]} stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#444" }} />
                  <Area type="monotone" dataKey="score" stroke="#0081A7" fill="#0081A7" fillOpacity={0.3} dot={{ r: 4, strokeWidth: 2, fill: "#1e1e1e" }} activeDot={{ r: 6, fill: "#0081A7" }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No KS Scores Available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Privacy Budget Distribution (ε)</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <div className="grid grid-cols-2 h-full gap-4">
              {epsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={epsChartData} 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={60} 
                      outerRadius={80} 
                      paddingAngle={5} 
                      dataKey="value"
                    >
                      {epsChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#444" }} itemStyle={{ color: '#fff' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                 <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No budget data</div>
              )}
              
              <div className="overflow-auto border-l border-border pl-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data.column_summary || []).map((item: any) => (
                      <TableRow key={item.column_name}>
                        <TableCell className="font-medium">{item.column_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {auditGraphData.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Live Audit Trail: Privacy vs Utility Trade-off</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={auditGraphData} margin={{ left: 0, right: 20, top: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#444" />
                <XAxis dataKey="column" stroke="#888" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" type="number" domain={[0, 100]} stroke="#888" label={{ value: 'Data Quality (KS %)', angle: -90, position: 'insideLeft', fill: '#888' }} />
                <YAxis yAxisId="right" orientation="right" type="number" stroke="#00C49F" label={{ value: 'Epsilon Budget (ε)', angle: 90, position: 'insideRight', fill: '#00C49F' }} />
                <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#444" }} />
                <Legend />
                <Bar yAxisId="left" dataKey="quality" name="KS Score (%)" fill="#0081A7" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="epsilon" name="Epsilon (ε)" stroke="#00C49F" strokeWidth={3} dot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

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
