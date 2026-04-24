"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

const API_BASE = "http://localhost:8000/api"

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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Base Ollama Model</label>
              <select 
                className="mt-1 block w-full rounded border bg-card p-2 text-sm text-foreground"
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
              <label className="text-sm font-medium">Max Context Rows</label>
              <input 
                type="number" 
                value={maxRows}
                onChange={e => setMaxRows(parseInt(e.target.value) || 200)}
                className="mt-1 block w-full rounded border bg-card p-2 text-sm text-foreground"
                disabled={isTraining || !!activeModel}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Custom System Prompt (Optional)</label>
              <textarea 
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                className="mt-1 block w-full rounded border bg-card p-2 text-sm text-foreground h-24"
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
          </CardContent>
        </Card>

        {activeModel && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Chat Interface</CardTitle>
                <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">Active: {activeModel}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] overflow-auto bg-[#1e1e1e] rounded p-4 mb-4 border border-border">
                {chatLog.length === 0 && (
                  <p className="text-sm text-muted-foreground italic text-center mt-20">
                    Model is ready. Ask a question about your dataset.
                  </p>
                )}
                {chatLog.map((log, i) => (
                  <div key={i} className={`mb-3 ${log.role === 'You' ? 'text-primary' : log.role === 'Error' ? 'text-red-500' : 'text-green-400'}`}>
                    <span className="font-bold opacity-80">[{log.role}]</span> {log.msg}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Ask a question..."
                  className="flex-1 rounded border bg-card px-3 py-2 text-sm text-foreground"
                />
                <Button onClick={sendChat}>Send</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
