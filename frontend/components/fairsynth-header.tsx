"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  House,
  Upload,
  Route,
  ChartColumnBig,
  ShieldAlert,
  Info,
  Sparkles,
} from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const links = [
  { href: "/", label: "Home", icon: House },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/pipeline/demo-job", label: "Pipeline", icon: Route },
  { href: "/results/demo-job", label: "Results", icon: ChartColumnBig },
  { href: "/bias-audit", label: "Bias Audit", icon: ShieldAlert },
  { href: "/finetune/demo-job", label: "Fine-Tune", icon: Sparkles },
  { href: "/about", label: "About", icon: Info },
]

export function FairSynthHeader() {
  const pathname = usePathname()

  return (
    <header className="pointer-events-none fixed left-1/2 bottom-8 z-40 w-full -translate-x-1/2 px-4 drop-shadow-lg">
      <nav className="pointer-events-auto mx-auto flex w-fit items-center gap-1 rounded-full border border-[#FED9B7]/80 bg-white/80 px-2 py-2 shadow-[0_8px_32px_rgba(0,129,167,0.20)] backdrop-blur-xl">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={link.label}
                className={cn(
                  "group relative flex h-11 w-11 items-center justify-center rounded-full text-[#0081A7] transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0081A7]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFCDC]",
                  active ? "bg-[#0081A7] text-[#FDFCDC] shadow-[0_10px_24px_rgba(0,129,167,0.22)]" : "hover:bg-[#FED9B7]/65",
                )}
              >
                <motion.span
                  whileHover={{ scale: 1.18, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center justify-center"
                >
                  <Icon className="h-5 w-5" />
                </motion.span>
                <span className="pointer-events-none absolute bottom-full mb-3 translate-y-2 rounded-full bg-[#0081A7] px-3 py-1 text-[11px] font-semibold text-[#FDFCDC] opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  {link.label}
                </span>
              </Link>
            )
          })}
      </nav>
    </header>
  )
}
