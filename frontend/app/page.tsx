"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Scale, ShieldCheck, Sparkles, Zap, Database, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"

const splashDuration = 950
const introSeenKey = "antraa-intro-seen"

const features = [
  {
    title: "Privacy-First Synthesis",
    description:
      "Generate statistically faithful synthetic data with differential privacy controls. Preserve distributions while eliminating re-identification risk.",
    icon: ShieldCheck,
    gradient: "linear-gradient(135deg, #0f4c75 0%, #1b6ca8 50%, #0081A7 100%)",
    glassColor: "rgba(0, 129, 167, 0.12)",
    borderColor: "rgba(0, 175, 185, 0.4)",
    accentColor: "#00c6d7",
    tag: "01",
  },
  {
    title: "Compliance Intelligence",
    description:
      "Map columns to HIPAA, GDPR, and GLBA requirements automatically through RAG-based policy retrieval. Stay audit-ready at every step.",
    icon: Scale,
    gradient: "linear-gradient(135deg, #005f6b 0%, #008891 50%, #00AFB9 100%)",
    glassColor: "rgba(0, 175, 185, 0.12)",
    borderColor: "rgba(0, 175, 185, 0.4)",
    accentColor: "#00d4e0",
    tag: "02",
  },
  {
    title: "Standalone Bias Audit",
    description:
      "Run fairness diagnostics before or after synthesis with explainable metric reports. Detect disparate impact, demographic parity gaps, and more.",
    icon: Sparkles,
    gradient: "linear-gradient(135deg, #8b2100 0%, #c0392b 50%, #F07167 100%)",
    glassColor: "rgba(240, 113, 103, 0.12)",
    borderColor: "rgba(240, 113, 103, 0.4)",
    accentColor: "#ff8c85",
    tag: "03",
  },
]

const stats = [
  { label: "Privacy Guarantees", value: "ε-DP", icon: Lock },
  { label: "Compliance Rules", value: "400+", icon: Database },
  { label: "Synthesis Speed", value: "<2s", icon: Zap },
]

export default function Home() {
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") {
      return true
    }
    return window.sessionStorage.getItem(introSeenKey) !== "true"
  })
  const [activeCard, setActiveCard] = useState<string | null>(null)

  useEffect(() => {
    if (!showIntro) {
      setShowIntro(false)
      return
    }
    const timer = window.setTimeout(() => setShowIntro(false), splashDuration)
    window.sessionStorage.setItem(introSeenKey, "true")
    return () => window.clearTimeout(timer)
  }, [showIntro])

  return (
    <main className="relative mx-auto w-full max-w-7xl px-4 py-8 lg:px-8 lg:py-10">
      <AnimatePresence>
        {showIntro ? (
          <motion.div
            key="antraa-intro"
            className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#FDFCDC]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,129,167,0.14),rgba(0,175,185,0.10),rgba(254,217,183,0.18),rgba(240,113,103,0.12))]" />
            <motion.div
              className="relative z-10 flex flex-col items-center justify-center px-6 text-center"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.36, ease: "easeOut" }}
            >
              <motion.div
                className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-[#0081A7]/20 bg-white/70 shadow-[0_22px_60px_rgba(0,129,167,0.18)] backdrop-blur-xl"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 1.1, repeat: 1, ease: "easeInOut" }}
              >
                <Sparkles className="h-10 w-10 text-[#0081A7]" />
              </motion.div>
              <motion.h1
                className="text-6xl font-semibold tracking-[0.18em] text-[#0081A7] md:text-8xl"
                animate={{ letterSpacing: ["0.18em", "0.21em", "0.18em"] }}
                transition={{ duration: 1.1, repeat: 1, ease: "easeOut" }}
              >
                Antraa
              </motion.h1>
              <motion.p
                className="mt-5 text-lg font-medium italic text-[#005f7a] md:text-2xl"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6 }}
              >
                ~ By Bazigaar
              </motion.p>
              <motion.div
                className="mt-10 flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.22 }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#0081A7]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#00AFB9]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#F07167]" />
              </motion.div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={showIntro ? { opacity: 0, y: 18 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* ── Hero Card ── */}
        <section
          className="relative overflow-hidden rounded-[2rem] p-[1px] shadow-[0_32px_80px_rgba(0,129,167,0.18)]"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,175,185,0.6) 0%, rgba(0,129,167,0.3) 40%, rgba(240,113,103,0.4) 100%)",
          }}
        >
          <div
            className="relative overflow-hidden rounded-[calc(2rem-1px)]"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.55) 50%, rgba(254,217,183,0.35) 100%)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
            }}
          >
            {/* Mesh gradient blobs */}
            <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[#00AFB9]/20 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-[#F07167]/15 blur-3xl" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-48 -translate-x-1/2 rounded-full bg-[#0081A7]/10 blur-2xl" />

            <div className="relative z-10 flex flex-col gap-8 p-8 lg:flex-row lg:items-center lg:p-12">
              {/* Left: Text */}
              <div className="flex-1">
                <motion.p
                  className="inline-flex items-center gap-2 rounded-full border border-[#0081A7]/25 bg-[#0081A7]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-[#0081A7]"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#0081A7] animate-pulse" />
                  Antraa Platform
                </motion.p>

                <motion.h1
                  className="mt-5 text-4xl font-bold tracking-tight text-[#004a5e] lg:text-5xl xl:text-6xl"
                  style={{ lineHeight: 1.1 }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.18, duration: 0.55 }}
                >
                  Synthetic Data
                  <span className="block bg-gradient-to-r from-[#0081A7] via-[#00AFB9] to-[#F07167] bg-clip-text text-transparent">
                    Workflow
                  </span>
                  for Regulated Teams
                </motion.h1>

                <motion.p
                  className="mt-5 max-w-xl text-base leading-8 text-[#005f7a]/90 lg:text-lg"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26, duration: 0.5 }}
                >
                  Build compliant, shareable datasets without exposing raw records. Schema profiling,
                  policy mapping, human approval, synthetic generation, validation — all in one pipeline.
                </motion.p>

                <motion.div
                  className="mt-8 flex flex-wrap items-center gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.34, duration: 0.45 }}
                >
                  <Button
                    asChild
                    className="rounded-full px-7 py-5 text-base font-semibold shadow-[0_14px_30px_rgba(0,129,167,0.28)] transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,129,167,0.38)] hover:-translate-y-0.5"
                  >
                    <Link href="/upload">
                      Upload Dataset
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    asChild
                    className="rounded-full border-[#0081A7]/30 bg-white/60 px-7 py-5 text-base font-semibold text-[#0081A7] backdrop-blur-sm hover:bg-[#FED9B7]/55 hover:text-[#005f7a] transition-all duration-300"
                  >
                    <Link href="/bias-audit">Run Bias Audit Only</Link>
                  </Button>
                </motion.div>
              </div>

              {/* Right: Stats */}
              <motion.div
                className="flex flex-row gap-3 lg:flex-col lg:w-56"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                {stats.map((stat, i) => {
                  const Icon = stat.icon
                  return (
                    <div
                      key={stat.label}
                      className="flex flex-1 flex-col items-center gap-2 rounded-2xl border border-white/50 bg-white/40 p-4 text-center backdrop-blur-md lg:flex-none lg:flex-row lg:text-left"
                      style={{
                        boxShadow: "0 4px 16px rgba(0,129,167,0.08)",
                      }}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0081A7]/10">
                        <Icon className="h-4 w-4 text-[#0081A7]" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-[#004a5e]">{stat.value}</p>
                        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#0081A7]/70">
                          {stat.label}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Feature Cards ── */}
        <section className="mt-10">
          <motion.div
            className="mb-6 flex items-end justify-between gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#00AFB9]">Workflow Highlights</p>
              <p className="mt-2 text-sm text-[#005f7a]">Hover a card to explore its capabilities.</p>
            </div>
          </motion.div>

          <div
            className="grid gap-5 lg:grid-cols-3"
            onMouseLeave={() => setActiveCard(null)}
          >
            {features.map((feature, index) => {
              const Icon = feature.icon
              const isActive = activeCard === feature.title
              const isDimmed = activeCard !== null && !isActive

              return (
                <motion.article
                  key={feature.title}
                  onMouseEnter={() => setActiveCard(feature.title)}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 + 0.08 * index, duration: 0.45, ease: "easeOut" }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative overflow-hidden rounded-[1.75rem] p-[1px]"
                  style={{
                    background: isDimmed
                      ? "rgba(200,200,200,0.2)"
                      : `linear-gradient(135deg, ${feature.accentColor}55, transparent 60%, ${feature.accentColor}22)`,
                    opacity: isDimmed ? 0.6 : 1,
                    filter: isDimmed ? "blur(0.8px)" : "none",
                    transform: isDimmed ? "scale(0.97)" : undefined,
                    transition: "all 0.4s cubic-bezier(0.4,0,0.2,1)",
                    boxShadow: isActive
                      ? `0 24px 60px ${feature.glassColor.replace("0.12", "0.35")}, 0 0 0 1px ${feature.borderColor}`
                      : `0 12px 32px ${feature.glassColor.replace("0.12", "0.18")}`,
                  }}
                >
                  {/* Glass inner */}
                  <div
                    className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[calc(1.75rem-1px)] p-7"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                    }}
                  >
                    {/* Gradient background overlay */}
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ background: feature.gradient, opacity: 0.92 }}
                    />

                    {/* Shimmer highlight */}
                    <div
                      className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-2xl"
                      style={{ background: feature.accentColor }}
                    />

                    {/* Content */}
                    <div className="relative z-10">
                      <div className="mb-6 flex items-center justify-between">
                        <div
                          className="flex h-13 w-13 items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur-sm"
                          style={{ width: 52, height: 52 }}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-white/80 backdrop-blur-sm">
                          {feature.tag}
                        </span>
                      </div>

                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
                        Core Feature
                      </p>
                      <h2 className="mt-3 text-2xl font-bold leading-tight text-white">{feature.title}</h2>
                      <p className="mt-4 text-sm leading-7 text-white/85">{feature.description}</p>
                    </div>

                    <Link
                      href="/about"
                      className="relative z-10 mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:scale-105"
                    >
                      Learn more
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </motion.article>
              )
            })}
          </div>
        </section>
      </motion.div>
    </main>
  )
}