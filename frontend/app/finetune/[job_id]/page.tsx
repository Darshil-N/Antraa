"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"


const API_BASE = "http://localhost:8000/api"

const GlowingCard = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="glowing-card">
      <div className="glowing-bg">{children}</div>
      <div className="glowing-blob" />
      <style jsx>{`
        .glowing-card {
          position: relative;
          width: 100%;
          min-height: 400px;
          border-radius: 14px;
          z-index: 10;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 20px 20px 60px rgba(0,0,0,0.1), -20px -20px 60px rgba(255,255,255,0.05);
        }
        .glowing-bg {
          position: absolute;
          top: 5px;
          left: 5px;
          right: 5px;
          bottom: 5px;
          z-index: 2;
          background: var(--card);
          backdrop-filter: blur(24px);
          border-radius: 10px;
          overflow-y: auto;
          outline: 1px solid var(--border);
          padding: 1.5rem;
        }
        .glowing-blob {
          position: absolute;
          z-index: 1;
          top: 50%;
          left: 50%;
          width: 250px;
          height: 250px;
          border-radius: 50%;
          background-color: #0081A7;
          opacity: 0.8;
          filter: blur(40px);
          animation: blob-bounce 8s infinite ease;
        }
        @keyframes blob-bounce {
          0% { transform: translate(-100%, -100%) translate3d(0, 0, 0); }
          25% { transform: translate(-100%, -100%) translate3d(100%, 0, 0); }
          50% { transform: translate(-100%, -100%) translate3d(100%, 100%, 0); }
          75% { transform: translate(-100%, -100%) translate3d(0, 100%, 0); }
          100% { transform: translate(-100%, -100%) translate3d(0, 0, 0); }
        }
      `}</style>
    </div>
  )
}


export default function FineTunePage() {
  const params = useParams<{ job_id: string }>()
  const router = useRouter()
  
  const [models, setModels] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const [maxRows, setMaxRows] = useState(200)
  const [systemPrompt, setSystemPrompt] = useState("")
  
  const [isTraining, setIsTraining] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [activeModel, setActiveModel] = useState<string | null>(null)
  
  const [chatLog, setChatLog] = useState<{role: string, msg: string}[]>([])
  const [chatInput, setChatInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API_BASE}/finetune/models`)
      .then(r => r.json())
      .then(data => {
        setModels(data.models || [])
        if (data.models?.length > 0) setSelectedModel(data.models[0].name)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatLog])

  const startFinetune = async () => {
    if (!selectedModel) return alert("Select a base model first.")
    
    setIsTraining(true)
    setStatus("Starting training...")
    
    try {
      const res = await fetch(`${API_BASE}/finetune/start/${params.job_id}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ base_model: selectedModel, max_context_rows: maxRows, system_prompt: systemPrompt || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || "Start failed")
      
      setStatus("Training in progress...")
      
      const poll = setInterval(async () => {
        try {
          const sRes = await fetch(`${API_BASE}/finetune/status/${params.job_id}`)
          const sData = await sRes.json()
          
          if (sData.status === 'COMPLETE') {
            clearInterval(poll)
            setIsTraining(false)
            setStatus("Ready!")
            setActiveModel(data.model_name)
          } else if (sData.status === 'FAILED') {
            clearInterval(poll)
            setIsTraining(false)
            setStatus(`Failed: ${sData.error}`)
          }
        } catch(e) {}
      }, 3000)
    } catch(e: any) {
      setIsTraining(false)
      setStatus(`Error: ${e.message}`)
    }
  }

  const sendChat = async () => {
    if (!chatInput.trim()) return
    const msg = chatInput.trim()
    setChatLog(prev => [...prev, {role: "You", msg}])
    setChatInput("")
    
    try {
      const res = await fetch(`${API_BASE}/finetune/chat/${params.job_id}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Chat error')
      
      setChatLog(prev => [...prev, {role: "Model", msg: data.response}])
    } catch(e: any) {
      setChatLog(prev => [...prev, {role: "Error", msg: e.message}])
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Local Model Fine-Tuning</h1>
          <p className="text-sm text-secondary-foreground">Job ID: {params.job_id}</p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>Back to Results</Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlowingCard>
          <div className="mb-4">
            <h3 className="font-semibold leading-none tracking-tight text-lg text-foreground mb-4">Model Configuration</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Select Base Ollama Model</label>
              <select 
                className="mt-1 block w-full rounded border border-border bg-card p-2 text-sm text-foreground"
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                disabled={isTraining || !!activeModel}
              >
                {models.length === 0 && <option value="">No models found - check Ollama</option>}
                {models.map(m => (
                  <option key={m.name} value={m.name}>{m.name} ({m.size})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground">Max Context Rows</label>
              <input 
                type="number" 
                value={maxRows}
                onChange={e => setMaxRows(parseInt(e.target.value) || 200)}
                className="mt-1 block w-full rounded border border-border bg-card p-2 text-sm text-foreground"
                disabled={isTraining || !!activeModel}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground">Custom System Prompt (Optional)</label>
              <textarea 
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                className="mt-1 block w-full rounded border border-border bg-card p-2 text-sm text-foreground h-24"
                disabled={isTraining || !!activeModel}
                placeholder="Instruct the model how to behave..."
              />
            </div>

            <Button 
              className="w-full bg-secondary text-black hover:bg-secondary/90" 
              onClick={startFinetune}
              disabled={isTraining || !!activeModel || models.length === 0}
            >
              {isTraining ? "Training..." : activeModel ? "Trained" : "Start Fine-Tuning"}
            </Button>
            
            {status && <p className="text-sm text-secondary text-center font-medium">{status}</p>}
          </div>
        </GlowingCard>

        {activeModel && (
          <Card className="border-[#0081A7]/30 shadow-lg shadow-[#0081A7]/10 bg-gradient-to-b from-card to-[#0a151a]">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-[#0081A7] to-[#00AFB9] bg-clip-text text-transparent">
                  Chat Interface
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0081A7] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00AFB9]"></span>
                  </span>
                  <span className="text-xs bg-[#0081A7]/10 border border-[#0081A7]/30 text-[#00AFB9] px-3 py-1 rounded-full font-medium shadow-inner shadow-[#0081A7]/20">
                    Active: {activeModel}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[400px] overflow-auto bg-[#0d1317]/80 rounded-xl p-6 mb-5 border border-white/5 shadow-inner relative custom-scrollbar">
                {chatLog.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-70">
                    <div className="w-16 h-16 mb-4 rounded-full bg-[#0081A7]/10 flex items-center justify-center border border-[#0081A7]/20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0081A7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                    </div>
                    <p className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#0081A7] to-[#00AFB9]">
                      Model is ready. Ask a question about your dataset.
                    </p>
                  </div>
                )}
                {chatLog.map((log, i) => (
                  <div key={i} className={`flex w-full mb-6 ${log.role === 'You' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-md backdrop-blur-sm ${
                      log.role === 'You' 
                        ? 'bg-gradient-to-br from-[#0081A7] to-[#006A8A] text-white rounded-br-none border border-[#00AFB9]/30' 
                        : log.role === 'Error'
                        ? 'bg-red-500/10 text-red-200 border border-red-500/30 rounded-bl-none'
                        : 'bg-[#1a2327] border border-white/10 text-gray-200 rounded-bl-none shadow-black/40'
                    }`}>
                      <div className="flex items-center gap-2 mb-1.5 opacity-70">
                        <span className="text-[11px] font-bold uppercase tracking-wider">{log.role}</span>
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{log.msg}</div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-3 relative">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Ask a question about your dataset..."
                  className="flex-1 rounded-full border border-white/10 bg-[#0d1317] px-6 py-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#0081A7]/50 shadow-inner transition-all"
                />
                <Button 
                  onClick={sendChat} 
                  className="rounded-full px-8 bg-gradient-to-r from-[#0081A7] to-[#00AFB9] hover:from-[#006A8A] hover:to-[#0081A7] text-white shadow-lg shadow-[#0081A7]/25 transition-all font-semibold border border-[#00AFB9]/30"
                >
                  Send
                </Button>
              </div>
              <div className="mt-5 rounded-xl border border-white/5 bg-[#0d1317]/50 p-4 shadow-inner">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#00AFB9]">API Endpoint Integration</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-[10px] bg-white/5 hover:bg-white/10 text-white rounded border border-white/10"
                    onClick={() => navigator.clipboard.writeText(`curl -X POST http://localhost:8000/api/finetune/chat/${params.job_id} \\\n  -H "Content-Type: application/json" \\\n  -d '{"message": "Your question here"}'`)}
                  >
                    Copy cURL
                  </Button>
                </div>
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg bg-[#05080a] p-3 text-xs text-[#00AFB9] font-mono border border-white/5 custom-scrollbar">
                    {`curl -X POST http://localhost:8000/api/finetune/chat/${params.job_id} \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Your question here"}'`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
