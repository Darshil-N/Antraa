import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { qualityMetrics, ksScores, sampleColumns } from "@/lib/fairsynth-mock"

export default function ResultsPage({ params }: { params: { job_id: string } }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Results Dashboard</h1>
        <p className="text-sm text-secondary-foreground">Job ID: {params.job_id}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {qualityMetrics.map((metric) => (
          <Card key={metric.name}>
            <CardHeader>
              <CardTitle className="text-base text-secondary-foreground">{metric.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold text-foreground">{Math.round(metric.value * 100)}%</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Per-column KS Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ksScores.map((item) => (
                  <TableRow key={item.column}>
                    <TableCell>{item.column}</TableCell>
                    <TableCell>{item.score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Privacy Budget Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead>Epsilon Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sampleColumns.map((item) => (
                  <TableRow key={item.column}>
                    <TableCell>{item.column}</TableCell>
                    <TableCell>{item.epsilon}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Download Panel</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button>Download synthetic CSV</Button>
          <Button variant="outline">Download audit JSON</Button>
          <Button variant="outline">Download certificate PDF</Button>
          <Button variant="outline" asChild>
            <Link href="/bias-audit/demo-audit">Run Bias Audit on This Data</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
