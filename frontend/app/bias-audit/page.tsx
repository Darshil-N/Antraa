"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BiasAuditEntryPage() {
  const router = useRouter()
  const [selectedSource, setSelectedSource] = useState("new-upload")

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Bias Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-secondary-foreground">
            Run a standalone fairness audit on a new dataset or on previous synthetic output.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="rounded-lg border border-border bg-card p-4 text-sm text-secondary-foreground">
              <input
                type="radio"
                name="source"
                className="mr-2"
                checked={selectedSource === "new-upload"}
                onChange={() => setSelectedSource("new-upload")}
              />
              Upload fresh dataset
            </label>
            <label className="rounded-lg border border-border bg-card p-4 text-sm text-secondary-foreground">
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
            <input
              type="file"
              accept=".csv,.parquet"
              className="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-secondary-foreground"
            />
          </div>

          <div className="mt-6">
            <Button onClick={() => router.push("/bias-audit/demo-audit")}>Start Bias Audit</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
