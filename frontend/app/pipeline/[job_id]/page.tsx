"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { pipelinePhases, sampleColumns, sampleLogs } from "@/lib/fairsynth-mock"

export default function PipelinePage() {
  const params = useParams<{ job_id: string }>()
  const [approvalOpen, setApprovalOpen] = useState(true)
  const [phaseIndex, setPhaseIndex] = useState(2)

  const phaseStatus = useMemo(
    () => pipelinePhases.map((phase, index) => ({ phase, done: index < phaseIndex, active: index === phaseIndex })),
    [phaseIndex],
  )

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pipeline Monitor</h1>
          <p className="text-sm text-secondary-foreground">Job ID: {params.job_id}</p>
        </div>
        <Button onClick={() => setPhaseIndex((index) => Math.min(index + 1, pipelinePhases.length - 1))}>Advance Phase</Button>
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
              {sampleLogs.map((log, index) => (
                <p key={index} className="font-mono text-xs text-secondary-foreground">
                  {new Date(Date.now() - index * 12000).toLocaleTimeString()} - {log}
                </p>
              ))}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Column</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Sensitivity</TableHead>
                    <TableHead>Compliance Action</TableHead>
                    <TableHead>Privacy Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleColumns.map((item) => (
                    <TableRow key={item.column}>
                      <TableCell className="font-medium">{item.column}</TableCell>
                      <TableCell>{item.detectedType}</TableCell>
                      <TableCell>{item.sensitivity}</TableCell>
                      <TableCell>{item.action}</TableCell>
                      <TableCell>{item.epsilon}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-5 flex flex-wrap justify-end gap-3">
                <Button variant="outline" onClick={() => setApprovalOpen(false)}>
                  Continue Later
                </Button>
                <Button
                  onClick={() => {
                    setApprovalOpen(false)
                    setPhaseIndex(3)
                  }}
                >
                  Approve and Generate
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/results/${params.job_id}`}>Go to Results</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
