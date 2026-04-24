import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { FairSynthHeader } from "@/components/fairsynth-header"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" })

export const metadata: Metadata = {
  title: "FairSynth AI",
  description: "Privacy-first synthetic data and bias audit workflow",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetBrainsMono.variable}`}>
        <FairSynthHeader />
        {children}
      </body>
    </html>
  )
}
