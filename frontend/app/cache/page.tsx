"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Database, ShieldAlert, Award, Download, FileText, Loader2, HardDrive } from "lucide-react"

type FileItem = {
  name: string
  url: string
  size: number
  createdAt: string
}

type CacheData = {
  synthetic_data: FileItem[]
  audit_logs: FileItem[]
  certificates: FileItem[]
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString()
}

export default function CachePage() {
  const [data, setData] = useState<CacheData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/cache')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  const categories = [
    {
      id: 'synthetic_data',
      title: 'Synthetic Data',
      icon: Database,
      description: 'Generated datasets stored locally.',
      color: 'text-[#0081A7]',
      bgColor: 'bg-[#0081A7]/10',
      borderColor: 'border-[#0081A7]/20',
    },
    {
      id: 'audit_logs',
      title: 'Audit Logs',
      icon: ShieldAlert,
      description: 'JSON reports and bias audit logs.',
      color: 'text-[#00AFB9]',
      bgColor: 'bg-[#00AFB9]/10',
      borderColor: 'border-[#00AFB9]/20',
    },
    {
      id: 'certificates',
      title: 'Certificates',
      icon: Award,
      description: 'Compliance and differential privacy certificates.',
      color: 'text-[#F07167]',
      bgColor: 'bg-[#F07167]/10',
      borderColor: 'border-[#F07167]/20',
    }
  ]

  return (
    <main className="min-h-screen pt-24 pb-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="flex items-center gap-3 text-[#0081A7] mb-2">
            <HardDrive className="h-6 w-6" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em]">Local Storage</h2>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[#004a5e]">Cache Directory</h1>
          <p className="mt-3 text-lg text-[#005f7a]/80">
            Access locally generated synthetic data, audit reports, and compliance certificates.
          </p>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-[2rem] border border-white/50 bg-white/40 shadow-[0_4px_16px_rgba(0,129,167,0.08)] backdrop-blur-md">
            <Loader2 className="h-8 w-8 animate-spin text-[#0081A7]" />
            <span className="ml-3 text-[#005f7a] font-medium">Loading cache...</span>
          </div>
        ) : (
          <div className="space-y-10">
            {categories.map((category, index) => {
              const files = data?.[category.id as keyof CacheData] || []
              const Icon = category.icon

              return (
                <motion.section
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="overflow-hidden rounded-[2rem] border border-white/50 bg-white/40 shadow-[0_4px_16px_rgba(0,129,167,0.08)] backdrop-blur-md"
                >
                  <div className="border-b border-white/40 px-8 py-6 flex items-center justify-between bg-white/20">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${category.bgColor} ${category.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-[#004a5e]">{category.title}</h3>
                        <p className="text-sm text-[#005f7a]/80">{category.description}</p>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-[#005f7a]/60 bg-white/50 px-3 py-1 rounded-full">
                      {files.length} {files.length === 1 ? 'file' : 'files'}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {files.length === 0 ? (
                      <div className="py-12 text-center text-[#005f7a]/40">
                        <FileText className="mx-auto h-8 w-8 opacity-40 mb-3" />
                        <p>No files found in this directory.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-[#0081A7]/10">
                        {files.map((file) => (
                          <li key={file.name} className="group flex items-center justify-between rounded-2xl px-4 py-4 transition-all hover:bg-white/60">
                            <div className="flex items-center gap-4">
                              <FileText className={`h-5 w-5 ${category.color}`} />
                              <div>
                                <p className="text-sm font-semibold text-[#004a5e]">{file.name}</p>
                                <div className="flex items-center gap-3 text-xs text-[#005f7a]/70 mt-1">
                                  <span>{formatBytes(file.size)}</span>
                                  <span>•</span>
                                  <span>{formatDate(file.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            <a
                              href={file.url}
                              download
                              className={`opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-2 rounded-full bg-white/60 border ${category.borderColor} px-4 py-2 text-sm font-semibold ${category.color} shadow-sm hover:bg-[#FED9B7]/55 hover:-translate-y-0.5`}
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </motion.section>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
