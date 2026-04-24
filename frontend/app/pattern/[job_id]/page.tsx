"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend } from "recharts"

const API_BASE = "http://localhost:8000/api"

const Loader = () => {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="loader-wrapper">
        <span className="loader-letter">G</span>
        <span className="loader-letter">e</span>
        <span className="loader-letter">n</span>
        <span className="loader-letter">e</span>
        <span className="loader-letter">r</span>
        <span className="loader-letter">a</span>
        <span className="loader-letter">t</span>
        <span className="loader-letter">i</span>
        <span className="loader-letter">n</span>
        <span className="loader-letter">g</span>
        <div className="loader-overlay" />
      </div>
      <style jsx>{`
        .loader-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 120px;
          width: auto;
          margin: 2rem;
          font-family: "Poppins", sans-serif;
          font-size: 1.6em;
          font-weight: 600;
          user-select: none;
          color: #0081A7;
          scale: 2;
        }

        .loader-overlay {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 100%;
          z-index: 1;
          background-color: transparent;
          mask: repeating-linear-gradient(90deg, transparent 0, transparent 6px, black 7px, black 8px);
          -webkit-mask: repeating-linear-gradient(90deg, transparent 0, transparent 6px, black 7px, black 8px);
        }

        .loader-overlay::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-image: radial-gradient(circle at 50% 50%, #0081A7 0%, transparent 50%),
            radial-gradient(circle at 45% 45%, #00AFB9 0%, transparent 45%),
            radial-gradient(circle at 55% 55%, #FED9B7 0%, transparent 45%),
            radial-gradient(circle at 45% 55%, #F07167 0%, transparent 45%),
            radial-gradient(circle at 55% 45%, #FDFCDC 0%, transparent 45%);
          mask: radial-gradient(circle at 50% 50%, transparent 0%, transparent 10%, black 25%);
          -webkit-mask: radial-gradient(circle at 50% 50%, transparent 0%, transparent 10%, black 25%);
          animation: transform-animation 2s infinite alternate, opacity-animation 4s infinite;
          animation-timing-function: cubic-bezier(0.6, 0.8, 0.5, 1);
        }

        @keyframes transform-animation {
          0% { transform: translate(-55%); }
          100% { transform: translate(55%); }
        }

        @keyframes opacity-animation {
          0%, 100% { opacity: 0; }
          15% { opacity: 1; }
          65% { opacity: 0; }
        }

        .loader-letter {
          display: inline-block;
          opacity: 0;
          animation: loader-letter-anim 4s infinite linear;
          z-index: 2;
        }

        .loader-letter:nth-child(1) { animation-delay: 0.1s; }
        .loader-letter:nth-child(2) { animation-delay: 0.205s; }
        .loader-letter:nth-child(3) { animation-delay: 0.31s; }
        .loader-letter:nth-child(4) { animation-delay: 0.415s; }
        .loader-letter:nth-child(5) { animation-delay: 0.521s; }
        .loader-letter:nth-child(6) { animation-delay: 0.626s; }
        .loader-letter:nth-child(7) { animation-delay: 0.731s; }
        .loader-letter:nth-child(8) { animation-delay: 0.837s; }
        .loader-letter:nth-child(9) { animation-delay: 0.942s; }
        .loader-letter:nth-child(10) { animation-delay: 1.047s; }

        @keyframes loader-letter-anim {
          0% { opacity: 0; }
          5% { opacity: 1; text-shadow: 0 0 4px #0081A7; transform: scale(1.1) translateY(-2px); }
          20% { opacity: 0.2; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

export default function PatternAnalysisPage() {
  const params = useParams<{ job_id: string }>()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [distData, setDistData] = useState<any>(null)

  useEffect(() => {
    if (data) {
      fetch(`${API_BASE}/pattern/distributions/${params.job_id}`)
        .then(r => r.json())
        .then(setDistData)
        .catch(console.error)
    }
  }, [data, params.job_id])

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

  if (loading) return <div className="p-8 w-full"><Loader /></div>
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>
  if (!data) return null

  const score = data.preservation_score
  const scoreColor = score >= 0.85 ? '#4caf50' : score >= 0.65 ? '#ff9800' : '#ff5252'

  const driftChartData = data.numeric_drift ? Object.entries(data.numeric_drift).map(([col, d]: [string, any]) => ({
    name: col,
    score: d.preservation_score * 100,
  })) : []

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
            <CardTitle className="text-lg text-[#0081A7]">Original Dataset Narrative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-800 dark:text-gray-200"><b>Overview:</b> <span className="text-gray-600 dark:text-gray-400">{data.original_narrative?.overall_summary}</span></p>
            <p className="text-gray-800 dark:text-gray-200"><b>Correlations:</b> <span className="text-gray-600 dark:text-gray-400">{data.original_narrative?.correlation_highlights}</span></p>
            {distData && (
              <div className="h-[250px] w-full mt-4 bg-card rounded-xl p-2 border border-border">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="#0081A7" className="text-xl font-bold">{distData.column}</text>
                    <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fill="#888" className="text-xs uppercase tracking-widest font-semibold">Original</text>
                    <Pie data={distData.original} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                      {distData.original.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#0081A7', '#00AFB9', '#FED9B7', '#F07167', '#006A8A', '#4A4A4A'][index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#0081A7", borderRadius: "8px" }} itemStyle={{ color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-[#0081A7]">Synthetic Dataset Narrative</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-800 dark:text-gray-200"><b>Overview:</b> <span className="text-gray-600 dark:text-gray-400">{data.synthetic_narrative?.overall_summary}</span></p>
            <p className="text-gray-800 dark:text-gray-200"><b>Correlations:</b> <span className="text-gray-600 dark:text-gray-400">{data.synthetic_narrative?.correlation_highlights}</span></p>
            {distData && (
              <div className="h-[250px] w-full mt-4 bg-card rounded-xl p-2 border border-border">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" fill="#00AFB9" className="text-xl font-bold">{distData.column}</text>
                    <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" fill="#888" className="text-xs uppercase tracking-widest font-semibold">Synthetic</text>
                    <Pie data={distData.synthetic} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                      {distData.synthetic.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={['#0081A7', '#00AFB9', '#FED9B7', '#F07167', '#006A8A', '#4A4A4A'][index % 6]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#00AFB9", borderRadius: "8px" }} itemStyle={{ color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 border-secondary">
        <CardContent className="pt-6 bg-[#1a2f1a] rounded border border-[#4caf50]">
          <h4 className="text-lg font-semibold text-[#4caf50] mb-2">{data.comparison_narrative?.headline}</h4>
          <p className="mb-1 text-foreground"><b>✅ Preserved:</b> <span className="text-[#a5d6a7]">{data.comparison_narrative?.preserved_patterns?.join(' | ')}</span></p>
          <p className="mb-1 text-foreground"><b>⚠️ Drifted:</b> <span className="text-[#ffcc80]">{data.comparison_narrative?.drifted_patterns?.join(' | ')}</span></p>
          <p className="mt-2 text-sm italic text-[#4caf50] opacity-80">Auditor Conclusion: {data.comparison_narrative?.auditor_conclusion}</p>
        </CardContent>
      </Card>

      {driftChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Numeric Drift Preservation Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={driftChartData} margin={{ left: 0, right: 20, top: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#444" />
                    <XAxis dataKey="name" stroke="#888" tick={{ fontSize: 12 }} />
                    <YAxis type="number" domain={[0, 100]} stroke="#888" />
                    <Tooltip contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#444" }} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {driftChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score >= 85 ? "#4caf50" : entry.score >= 65 ? "#ff9800" : "#ff5252"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-auto max-h-[300px]">
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
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  )
}
