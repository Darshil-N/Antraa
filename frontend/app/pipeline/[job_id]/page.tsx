"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const API_BASE = "http://localhost:8000/api"
const WS_BASE = "ws://localhost:8000/ws"
const pipelinePhases = ["UPLOADED", "PROFILING", "COMPLIANCE", "AWAITING_APPROVAL", "GENERATING", "VALIDATING", "COMPLETE", "FAILED"]

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
    () => pipelinePhases.slice(1, 7).map((p, index) => {
      const idx = pipelinePhases.indexOf(p)
      return { phase: p, done: idx < phaseIndex, active: idx === phaseIndex }
    }),
    [phaseIndex]
  )

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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pipeline Monitor</h1>
          <p className="text-sm text-secondary-foreground">Job ID: {params.job_id}</p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Progress Rail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {phaseStatus.map((item) => (
              <div key={item.phase} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                <span
                  className={`h-3 w-3 rounded-full ${item.done ? "bg-primary" : item.active ? "bg-secondary-foreground" : "bg-muted"}`}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.phase}</p>
                  <p className="text-xs text-muted-foreground">{item.done ? "Completed" : item.active ? "Running" : "Waiting"}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Live Agent Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[420px] space-y-2 overflow-auto rounded-md border border-border bg-secondary/35 p-4">
              {logs.map((log, index) => (
                <p key={index} className="font-mono text-xs text-secondary-foreground">
                  {log.time} - {log.msg}
                </p>
              ))}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>
      </section>

      {approvalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 p-4">
          <Card className="w-full max-w-5xl">
            <CardHeader>
              <CardTitle>Approval Interface</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-secondary-foreground">
                Review classification decisions and privacy budget before synthetic generation starts.
              </p>
              <div className="mb-4">
                <label className="text-sm font-medium">Rows to synthesize:</label>
                <input 
                  type="number" 
                  value={targetRows} 
                  onChange={(e) => setTargetRows(parseInt(e.target.value) || 1000)}
                  className="ml-2 rounded border bg-card px-2 py-1 text-sm text-foreground"
                />
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Sensitivity</TableHead>
                    <TableHead>Suggested Action</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead>Epsilon (ε)</TableHead>
                    <TableHead>Approve</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columnsData.map((item) => {
                    const action = decisions[item.column_name]?.override_action || item.compliance_action
                    return (
                      <TableRow key={item.column_name}>
                        <TableCell className="font-medium">{item.column_name}</TableCell>
                        <TableCell>{item.inferred_type || "-"}</TableCell>
                        <TableCell>
                          <span className={`rounded px-2 py-1 text-xs font-bold ${item.sensitivity_class === "SAFE" ? "bg-green-500/20 text-green-500" : "bg-amber-500/20 text-amber-500"}`}>
                            {item.sensitivity_class}
                          </span>
                        </TableCell>
                        <TableCell>{item.compliance_action}</TableCell>
                        <TableCell>
                          <select 
                            className="bg-card text-foreground rounded border px-2 py-1 text-sm"
                            value={decisions[item.column_name]?.override_action || ""}
                            onChange={(e) => setDecisions({...decisions, [item.column_name]: {...decisions[item.column_name], override_action: e.target.value}})}
                          >
                            <option value="">(Suggested)</option>
                            <option value="RETAIN">RETAIN</option>
                            <option value="RETAIN_WITH_NOISE">RETAIN_WITH_NOISE</option>
                            <option value="GENERALIZE">GENERALIZE</option>
                            <option value="PSEUDONYMIZE">PSEUDONYMIZE</option>
                            <option value="SUPPRESS">SUPPRESS</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <input 
                            type="number" 
                            step="0.1" 
                            disabled={action !== "RETAIN_WITH_NOISE"}
                            value={decisions[item.column_name]?.epsilon_budget || 1.0}
                            onChange={(e) => setDecisions({...decisions, [item.column_name]: {...decisions[item.column_name], epsilon_budget: parseFloat(e.target.value)}})}
                            className="w-16 rounded border bg-card px-2 py-1 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <input 
                            type="checkbox" 
                            checked={decisions[item.column_name]?.approved || false}
                            onChange={(e) => setDecisions({...decisions, [item.column_name]: {...decisions[item.column_name], approved: e.target.checked}})}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <Button onClick={submitApproval}>Approve and Generate</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
