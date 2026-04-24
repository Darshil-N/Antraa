"use client"

import { useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { biasFindings } from "@/lib/fairsynth-mock"

const auditPhases = ["PROFILING", "AWAITING_CONFIRMATION", "COMPUTING", "INTERPRETING", "COMPLETE"]

export default function BiasAuditPage() {
  const params = useParams<{ audit_id: string }>()
  const [showConfirm, setShowConfirm] = useState(true)
  const [phaseIndex, setPhaseIndex] = useState(1)

  const findings = useMemo(
    () => [...biasFindings].sort((a, b) => ["CRITICAL", "HIGH", "MEDIUM", "LOW"].indexOf(a.severity) - ["CRITICAL", "HIGH", "MEDIUM", "LOW"].indexOf(b.severity)),
    [],
  )

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bias Audit Monitor</h1>
          <p className="text-sm text-secondary-foreground">Audit ID: {params.audit_id}</p>
        </div>
        <Button onClick={() => setPhaseIndex((index) => Math.min(index + 1, auditPhases.length - 1))}>Advance Audit</Button>
      </div>

      <section className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Bias Progress Rail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditPhases.map((phase, index) => (
              <div key={phase} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
                <span className={`h-3 w-3 rounded-full ${index <= phaseIndex ? "bg-primary" : "bg-muted"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{phase}</p>
                  <p className="text-xs text-muted-foreground">{index < phaseIndex ? "Completed" : index === phaseIndex ? "Running" : "Waiting"}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Findings (severity-sorted)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {findings.map((item, index) => (
              <div key={`${item.attribute}-${index}`} className="rounded-md border border-border bg-secondary/35 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">{item.severity}</span>
                  <span className="text-sm font-semibold text-foreground">
                    {item.attribute} x {item.outcome}
                  </span>
                </div>
                <p className="text-sm text-secondary-foreground">
                  {item.metric}: <span className="font-semibold text-foreground">{item.value}</span>
                </p>
                <p className="mt-2 text-sm leading-6 text-secondary-foreground">{item.interpretation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>Protected Attribute Confirmation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-secondary-foreground">Detected attributes: gender, race, age_bucket. Detected outcome: loan_approved.</p>
              <div className="mt-5 flex justify-end">
                <Button onClick={() => setShowConfirm(false)}>Confirm and Continue</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
