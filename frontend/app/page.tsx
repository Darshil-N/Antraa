"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, Scale, ShieldCheck, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const splashDuration = 950
const introSeenKey = "antraa-intro-seen"

const features = [
  {
    title: "Privacy-First Synthesis",
    description: "Generate statistically faithful synthetic data with differential privacy controls.",
    icon: ShieldCheck,
    color: "#0081A7",
    accent: "#FED9B7",
  },
  {
    title: "Compliance Intelligence",
    description: "Map columns to HIPAA, GDPR, and GLBA requirements through policy retrieval.",
    icon: Scale,
    color: "#00AFB9",
    accent: "#FDFCDC",
  },
  {
    title: "Standalone Bias Audit",
    description: "Run fairness diagnostics before or after synthesis with explainable metric reports.",
    icon: Sparkles,
    color: "#F07167",
    accent: "#0081A7",
  },
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
        <section className="relative overflow-hidden rounded-[2rem] border border-[#00AFB9]/20 bg-white/70 p-7 shadow-[0_24px_80px_rgba(0,129,167,0.10)] backdrop-blur-xl lg:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,129,167,0.05),transparent_35%,rgba(0,175,185,0.04),transparent_65%,rgba(240,113,103,0.05))]" />

          <div className="relative z-10 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#0081A7]">Antraa Platform</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#005f7a] lg:text-5xl">
              Synthetic Data Workflow for Regulated Teams
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#006f86] lg:text-lg">
              Build compliant, shareable datasets without exposing raw records. The workflow combines schema profiling,
              policy mapping, human approval, synthetic generation, validation, and optional bias audit reporting.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild className="rounded-full px-6 shadow-[0_14px_30px_rgba(0,129,167,0.22)]">
                <Link href="/upload">
                  Upload Dataset
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                asChild
                className="rounded-full border-[#0081A7]/20 bg-white/80 px-6 text-[#0081A7] hover:bg-[#FED9B7]/55 hover:text-[#005f7a]"
              >
                <Link href="/bias-audit">Run Bias Audit Only</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#00AFB9]">Workflow Highlights</p>
              <p className="mt-2 text-sm text-[#005f7a]">Hover a card to expand it and soften the others.</p>
            </div>
          </div>

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
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * index, duration: 0.32, ease: "easeOut" }}
                  className={`antraa-card-blur overflow-hidden rounded-[1.75rem] border border-white/60 shadow-[0_16px_40px_rgba(0,129,167,0.12)] ${
                    isDimmed ? "blur-[1.2px] opacity-70 scale-[0.96]" : "opacity-100"
                  }`}
                  style={{ backgroundColor: feature.color }}
                  whileHover={{ y: -6, scale: 1.02 }}
                >
                  <div className="flex min-h-[300px] flex-col justify-between p-6 text-white">
                    <div>
                      <div className="mb-6 flex items-center justify-between">
                        <span
                          className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/20"
                          style={{ backgroundColor: feature.accent, color: feature.color }}
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90">
                          0{index + 1}
                        </span>
                      </div>

                      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/80">Hover Me</p>
                      <p className="tip mt-3 text-2xl font-semibold leading-tight text-white">{feature.title}</p>
                      <p className="second-text mt-4 max-w-sm text-sm leading-7 text-white/90">{feature.description}</p>
                    </div>

                    <Link
                      href="/about"
                      className="mt-8 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-transform duration-300 hover:scale-105"
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