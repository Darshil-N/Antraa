"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  Scale,
  ShieldCheck,
  Sparkles,
  Zap,
  Database,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedSphere } from "@/components/animated-sphere"

/* ── Constants ───────────────────────────────────────────── */
const splashDuration = 3000
const introSeenKey   = "antraa-intro-seen"

const features = [
  {
    title: "Privacy-First Synthesis",
    description:
      "Generate statistically faithful synthetic data with differential privacy controls. Preserve distributions while eliminating re-identification risk.",
    icon: ShieldCheck,
    gradient:    "linear-gradient(135deg, #0f4c75 0%, #1b6ca8 50%, #0081A7 100%)",
    glassColor:  "rgba(0, 129, 167, 0.12)",
    borderColor: "rgba(0, 175, 185, 0.4)",
    accentColor: "#00c6d7",
    tag: "01",
  },
  {
    title: "Compliance Intelligence",
    description:
      "Map columns to HIPAA, GDPR, and GLBA requirements automatically through RAG-based policy retrieval. Stay audit-ready at every step.",
    icon: Scale,
    gradient:    "linear-gradient(135deg, #005f6b 0%, #008891 50%, #00AFB9 100%)",
    glassColor:  "rgba(0, 175, 185, 0.12)",
    borderColor: "rgba(0, 175, 185, 0.4)",
    accentColor: "#00d4e0",
    tag: "02",
  },
  {
    title: "Standalone Bias Audit",
    description:
      "Run fairness diagnostics before or after synthesis with explainable metric reports. Detect disparate impact, demographic parity gaps, and more.",
    icon: Sparkles,
    gradient:    "linear-gradient(135deg, #8b2100 0%, #c0392b 50%, #F07167 100%)",
    glassColor:  "rgba(240, 113, 103, 0.12)",
    borderColor: "rgba(240, 113, 103, 0.4)",
    accentColor: "#ff8c85",
    tag: "03",
  },
]

const stats = [
  { label: "Privacy Guarantees", value: "ε-DP",  icon: Lock     },
  { label: "Compliance Rules",   value: "400+",  icon: Database  },
  { label: "Synthesis Speed",    value: "<2s",   icon: Zap       },
]

/* ── Easing presets ─────────────────────────────────────── */
const ease = [0.22, 1, 0.36, 1] as const

/* ─────────────────────────────────────────────────────────
   Component
───────────────────────────────────────────────────────── */
export default function Home() {
  const [showIntro, setShowIntro]   = useState(true)
  const [activeCard, setActiveCard] = useState<string | null>(null)

  useEffect(() => {
    const seen = window.sessionStorage.getItem(introSeenKey) === "true"
    if (seen) { setShowIntro(false); return }
    const t = window.setTimeout(() => setShowIntro(false), splashDuration)
    window.sessionStorage.setItem(introSeenKey, "true")
    return () => window.clearTimeout(t)
  }, [])

  return (
    <>
      {/* ══ Global background sphere (fixed, behind everything) ══ */}
      <AnimatedSphere />

      {/* ══ Splash screen ══ */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="intro"
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#FDFCDC]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.01 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,129,167,0.14),rgba(0,175,185,0.10),rgba(254,217,183,0.18),rgba(240,113,103,0.12))]" />
            <motion.div
              className="relative z-10 flex flex-col items-center text-center px-6"
              initial={{ opacity: 0, y: 18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <motion.div
                className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-[#0081A7]/20 bg-white/70 shadow-[0_22px_60px_rgba(0,129,167,0.18)] backdrop-blur-xl overflow-hidden p-3"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.2, repeat: 1, ease: "easeInOut" }}
              >
                <img src="/logo.png" alt="Antraa" className="w-full h-full object-contain" />
              </motion.div>
              <motion.h1
                className="text-6xl font-semibold tracking-[0.18em] text-[#0081A7] md:text-8xl"
                animate={{ letterSpacing: ["0.18em", "0.22em", "0.18em"] }}
                transition={{ duration: 1.2, repeat: 1, ease: "easeOut" }}
              >
                Antraa
              </motion.h1>
              <motion.p
                className="mt-4 text-lg font-medium italic text-[#005f7a] md:text-2xl"
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
                transition={{ delay: 0.25, duration: 0.3 }}
              >
                {["#0081A7", "#00AFB9", "#F07167"].map((c) => (
                  <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Page content ══ */}
      <motion.main
        className="relative z-10 w-full"
        initial={{ opacity: 0 }}
        animate={showIntro ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      >
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            HERO — full viewport height, text over the sphere
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="relative flex min-h-[100svh] items-center">
          {/* Gradient shield — keeps text legible as sphere orbits behind it */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, hsl(58 90% 95% / 0.92) 0%, hsl(58 90% 95% / 0.82) 38%, hsl(58 90% 95% / 0.30) 62%, transparent 100%)",
            }}
          />

          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 py-28 lg:px-14">
            <div className="max-w-[600px]">



              {/* ── Headline ── */}
              <motion.h1
                className="text-[3.8rem] font-bold leading-[1.06] tracking-tight text-[#003d4f] lg:text-[5rem] xl:text-[5.6rem]"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.14, duration: 0.75, ease }}
              >
                Safe&nbsp;data.
                <br />
                <span className="bg-gradient-to-r from-[#0081A7] via-[#00AFB9] to-[#0081A7] bg-clip-text text-transparent">
                  Unbiased&nbsp;future.
                </span>
              </motion.h1>

              {/* ── Underline accent ── */}
              <motion.div
                className="mt-5 h-[2px] w-20 rounded-full bg-gradient-to-r from-[#0081A7] to-[#00AFB9]"
                initial={{ scaleX: 0, originX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.52, duration: 0.6, ease }}
              />

              {/* ── Subtitle ── */}
              <motion.p
                className="mt-6 max-w-md text-[1.05rem] leading-[1.85] text-[#005f7a]/80"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28, duration: 0.65, ease }}
              >
                Build compliant, shareable datasets without exposing raw
                records. Schema profiling, policy mapping, human approval,
                synthetic generation, validation — all in one pipeline.
              </motion.p>

              {/* ── CTAs ── */}
              <motion.div
                className="mt-10 flex flex-wrap items-center gap-4"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6, ease }}
              >
                <Button
                  asChild
                  className="rounded-full px-8 py-5 text-[0.95rem] font-semibold shadow-[0_14px_36px_rgba(0,129,167,0.30)] transition-all duration-500 hover:shadow-[0_22px_52px_rgba(0,129,167,0.44)] hover:-translate-y-1"
                >
                  <Link href="/upload">
                    Upload Dataset
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  variant="outline"
                  asChild
                  className="rounded-full border-[#0081A7]/30 bg-white/50 px-8 py-5 text-[0.95rem] font-semibold text-[#0081A7] backdrop-blur-sm transition-all duration-500 hover:bg-[#FED9B7]/40 hover:text-[#005f7a] hover:-translate-y-1"
                >
                  <Link href="/bias-audit">Watch demo</Link>
                </Button>

                <Button
                  variant="outline"
                  asChild
                  className="rounded-full border-[#00AFB9]/35 bg-white/50 px-8 py-5 text-[0.95rem] font-semibold text-[#00AFB9] backdrop-blur-sm transition-all duration-500 hover:bg-[#00AFB9]/10 hover:text-[#005f7a] hover:-translate-y-1 gap-2"
                >
                  <Link href="/cache">
                    <Database className="h-4 w-4" />
                    Browse Cache
                  </Link>
                </Button>
              </motion.div>

              {/* ── Stats ── */}
              <motion.div
                className="mt-16 flex flex-wrap gap-12"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58, duration: 0.6, ease }}
              >
                {stats.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <p className="text-[1.75rem] font-bold leading-none text-[#003d4f]">
                      {value}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Icon className="h-3 w-3 text-[#0081A7]/55" />
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[#0081A7]/60">
                        {label}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>

            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            FEATURE CARDS
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <section className="mx-auto w-full max-w-7xl px-6 pb-24 lg:px-14">

          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, ease }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#00AFB9]">
              Workflow Highlights
            </p>
            <p className="mt-2 text-sm text-[#005f7a]/70">
              Hover a card to explore its capabilities.
            </p>
          </motion.div>

          <div
            className="grid gap-5 lg:grid-cols-3"
            onMouseLeave={() => setActiveCard(null)}
          >
            {features.map((feature, i) => {
              const Icon      = feature.icon
              const isActive  = activeCard === feature.title
              const isDimmed  = activeCard !== null && !isActive

              return (
                <motion.article
                  key={feature.title}
                  onMouseEnter={() => setActiveCard(feature.title)}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ delay: 0.08 * i, duration: 0.6, ease }}
                  whileHover={{ y: -10, scale: 1.025 }}
                  className="group relative overflow-hidden rounded-[1.75rem] p-[1px]"
                  style={{
                    background: isDimmed
                      ? "rgba(200,200,200,0.18)"
                      : `linear-gradient(135deg, ${feature.accentColor}55, transparent 60%, ${feature.accentColor}22)`,
                    opacity:    isDimmed ? 0.55 : 1,
                    filter:     isDimmed ? "blur(0.6px)" : "none",
                    transition: "all 0.45s cubic-bezier(0.22,1,0.36,1)",
                    boxShadow: isActive
                      ? `0 28px 64px ${feature.glassColor.replace("0.12","0.38")}, 0 0 0 1px ${feature.borderColor}`
                      : `0 12px 36px ${feature.glassColor.replace("0.12","0.16")}`,
                  }}
                >
                  {/* glass inner */}
                  <div
                    className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-[calc(1.75rem-1px)] p-7"
                    style={{
                      background:         "rgba(255,255,255,0.07)",
                      backdropFilter:     "blur(22px)",
                      WebkitBackdropFilter: "blur(22px)",
                    }}
                  >
                    {/* colour overlay */}
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{ background: feature.gradient, opacity: 0.93 }}
                    />
                    {/* shimmer */}
                    <div
                      className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-20 blur-2xl"
                      style={{ background: feature.accentColor }}
                    />

                    {/* content */}
                    <div className="relative z-10">
                      <div className="mb-6 flex items-center justify-between">
                        <div
                          className="flex items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur-sm"
                          style={{ width: 52, height: 52 }}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.25em] text-white/80 backdrop-blur-sm">
                          {feature.tag}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/55">
                        Core Feature
                      </p>
                      <h2 className="mt-3 text-2xl font-bold leading-tight text-white">
                        {feature.title}
                      </h2>
                      <p className="mt-4 text-sm leading-7 text-white/85">
                        {feature.description}
                      </p>
                    </div>

                    <Link
                      href="/about"
                      className="relative z-10 mt-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/22 hover:scale-105"
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
      </motion.main>
    </>
  )
}