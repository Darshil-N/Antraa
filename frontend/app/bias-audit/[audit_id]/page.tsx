"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const API_BASE = "http://localhost:8000/api"
const WS_BASE = "ws://localhost:8000/ws/bias"

const auditPhases = ["PROFILING", "AWAITING_CONFIRMATION", "COMPUTING", "INTERPRETING", "COMPLETE", "FAILED"]

export default function BiasAuditPage() {
  const params = useParams<{ audit_id: string }>()
  const [phase, setPhase] = useState("PROFILING")
  const [logs, setLogs] = useState<{ time: string; msg: string }[]>([])
  
  const [showConfirm, setShowConfirm] = useState(false)
  const [confirmData, setConfirmData] = useState<{protected_attributes: any[], outcome_columns: any[]}>({protected_attributes: [], outcome_columns: []})
  
  const [selectedProtected, setSelectedProtected] = useState<string[]>([])
  const [selectedOutcome, setSelectedOutcome] = useState<string[]>([])
  
  const [findingsData, setFindingsData] = useState<any>(null)
  
  const ws = useRef<WebSocket | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const phaseIndex = auditPhases.indexOf(phase)

  useEffect(() => {
    if (!params.audit_id) return

    ws.current = new WebSocket(`${WS_BASE}/${params.audit_id}`)
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data)
      const time = new Date().toLocaleTimeString()
      
      if (data.type === "PHASE_CHANGE") {
        setPhase(data.payload.phase)
        setLogs((prev) => [...prev, { time, msg: `Phase changed to ${data.payload.phase}` }])
      } else if (data.type === "AGENT_LOG") {
        setLogs((prev) => [...prev, { time, msg: `Agent: ${data.payload.message}` }])
      } else if (data.type === "AWAITING_CONFIRMATION") {
        setLogs((prev) => [...prev, { time, msg: "Waiting for attribute confirmation..." }])
        setConfirmData(data.payload)
        setSelectedProtected(data.payload.protected_attributes.map((a: any) => a.column))
        setSelectedOutcome(data.payload.outcome_columns.map((o: any) => o.column))
        setShowConfirm(true)
      } else if (data.type === "AUDIT_COMPLETE") {
        setLogs((prev) => [...prev, { time, msg: `Audit completed! ${data.payload.total_findings} findings.` }])
        fetchResults()
      } else if (data.type === "PIPELINE_ERROR") {
        setLogs((prev) => [...prev, { time, msg: `CRITICAL ERROR: ${data.payload.error}` }])
      }
    }

    return () => ws.current?.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.audit_id])

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const submitConfirm = async () => {
    if (selectedProtected.length === 0 || selectedOutcome.length === 0) return alert("Select at least one protected attribute and one outcome variable.")
    
    setShowConfirm(false)
    setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), msg: "Confirmation submitted, computing metrics..." }])
    
    try {
      await fetch(`${API_BASE}/bias-audit/confirm/${params.audit_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protected_attributes: selectedProtected, outcome_columns: selectedOutcome })
      })
    } catch (e) {
      console.error(e)
    }
  }

  const fetchResults = async () => {
    try {
      const res = await fetch(`${API_BASE}/bias-audit/results/${params.audit_id}`)
      const data = await res.json()
      setFindingsData(data)
    } catch (e) {
      console.error(e)
    }
  }

  const sortedFindings = useMemo(() => {
    if (!findingsData || !findingsData.findings) return []
    return [...findingsData.findings].sort((a: any, b: any) => 
      ["CRITICAL", "HIGH", "MEDIUM", "LOW"].indexOf(a.severity) - ["CRITICAL", "HIGH", "MEDIUM", "LOW"].indexOf(b.severity)
    )
  }, [findingsData])

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bias Audit Monitor</h1>
          <p className="text-sm text-secondary-foreground">Audit ID: {params.audit_id}</p>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audit Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {auditPhases.map((p, index) => (
                <div key={p} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                  <span className={`h-3 w-3 rounded-full ${index < phaseIndex ? "bg-primary" : index === phaseIndex ? "bg-secondary-foreground" : "bg-muted"}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{p}</p>
                    <p className="text-xs text-muted-foreground">{index < phaseIndex ? "Completed" : index === phaseIndex ? "Running" : "Waiting"}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Live Auditor Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] space-y-2 overflow-auto rounded-md border border-border bg-secondary/35 p-4">
                {logs.map((log, index) => (
                  <p key={index} className="font-mono text-xs text-secondary-foreground">
                    {log.time} - {log.msg}
                  </p>
                ))}
                <div ref={logsEndRef} />
              </div>
            </CardContent>
          </Card>

          {findingsData && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Interpretations & Findings</CardTitle>
                  <div className="flex gap-2">
                    {Object.entries(findingsData.downloads || {}).map(([name, url]) => (
                      <Button key={name} variant="outline" size="sm" asChild>
                        <a href={`http://localhost:8000${url as string}`} target="_blank" rel="noreferrer">{name}</a>
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedFindings.map((item: any, index: number) => {
                  let colorClass = "bg-primary text-primary-foreground border-primary"
                  if (item.severity === "CRITICAL") colorClass = "bg-red-500/20 text-red-500 border-red-500/50"
                  if (item.severity === "HIGH") colorClass = "bg-orange-500/20 text-orange-500 border-orange-500/50"
                  
                  return (
                    <div key={index} className={`rounded-md border bg-secondary/35 p-4 ${item.severity === "CRITICAL" ? "border-red-500/30" : "border-border"}`}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-1 text-xs font-semibold border ${colorClass}`}>{item.severity}</span>
                        <span className="text-sm font-semibold text-foreground">
                          {item.protected_attribute_column} ➔ {item.outcome_column}
                        </span>
                      </div>
                      <p className="text-sm text-secondary-foreground mb-2">
                        {item.metric_name}: <span className="font-semibold text-foreground">{item.metric_value?.toFixed(4) || item.metric_value}</span>
                      </p>
                      <div className="mt-2 text-sm leading-6 text-secondary-foreground bg-[#1e1e1e] p-3 rounded border border-border/50">
                        {item.interpreter_narration}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl border-secondary shadow-lg">
            <CardHeader>
              <CardTitle className="text-secondary">Protected Attribute Confirmation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-secondary-foreground mb-4">
                The Profiler Agent has analyzed the dataset and identified the following potential protected attributes and outcome variables. Review and confirm before metrics are calculated.
              </p>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-medium text-sm mb-2 text-foreground">Protected Attributes</h4>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {confirmData.protected_attributes.map((attr) => (
                      <label key={attr.column} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          checked={selectedProtected.includes(attr.column)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedProtected([...selectedProtected, attr.column])
                            else setSelectedProtected(selectedProtected.filter(a => a !== attr.column))
                          }}
                        />
                        <span className="text-sm">{attr.column} <span className="text-xs text-muted-foreground">(Conf: {attr.confidence})</span></span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2 text-foreground">Outcome Variables</h4>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {confirmData.outcome_columns.map((outcome) => (
                      <label key={outcome.column} className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          checked={selectedOutcome.includes(outcome.column)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedOutcome([...selectedOutcome, outcome.column])
                            else setSelectedOutcome(selectedOutcome.filter(a => a !== outcome.column))
                          }}
                        />
                        <span className="text-sm">{outcome.column} <span className="text-xs text-muted-foreground">(Conf: {outcome.confidence})</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <Button onClick={submitConfirm} className="bg-secondary text-black hover:bg-secondary/90">Confirm and Compute Metrics</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
