import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const sections = [
  {
    title: "Core Pipeline",
    body: "Schema profiling, compliance rule mapping, human approval, synthetic generation, statistical validation, and certificate packaging.",
  },
  {
    title: "Bias Audit Module",
    body: "Standalone fairness checks with protected attribute detection, outcome analysis, metric scoring, and severity interpretation.",
  },
  {
    title: "Privacy and Compliance",
    body: "Local-first operation, differential privacy controls, policy traceability, and auditable file lifecycle management.",
  },
]

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      <section className="rounded-xl border border-border bg-card p-7 shadow-sm">
        <h1 className="text-3xl font-semibold text-foreground">Methodology</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-foreground">
          This frontend mirrors the documented Antraa workflow: a compliance-centric synthetic data pipeline with an
          optional standalone bias audit path. The UI is structured for regulated teams that need transparency at every
          decision point.
        </p>
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="text-xl">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-foreground">{section.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </main>
  )
}
