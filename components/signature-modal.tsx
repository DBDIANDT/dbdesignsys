"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Type, Upload, PenTool, ArrowLeft, Check } from "lucide-react"

interface SignatureModalProps {
  onSignatureComplete: (signature: string, type: "text" | "upload" | "draw", interpreterName: string) => void
  onBack: () => void
  interpreterName: string
  setInterpreterName: (name: string) => void
}

export default function SignatureModal({
  onSignatureComplete,
  onBack,
  interpreterName,
  setInterpreterName,
}: SignatureModalProps) {
  const [textSignature, setTextSignature] = useState("")
  const [selectedFont, setSelectedFont] = useState("cursive")
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const fonts = [
    { value: "cursive", label: "Cursive", style: "cursive" },
    { value: "serif", label: "Serif", style: "serif" },
    { value: "sans-serif", label: "Sans Serif", style: "sans-serif" },
    { value: "monospace", label: "Monospace", style: "monospace" },
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 2
        ctx.lineCap = "round"
      }
    }
  }, [])

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.beginPath()
        ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top)
      }
    }
  }

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (canvas) {
      const rect = canvas.getBoundingClientRect()
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top)
        ctx.stroke()
      }
    }
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  }

  const handleTextSignature = () => {
    if (textSignature.trim() && interpreterName.trim()) {
      onSignatureComplete(textSignature, "text", interpreterName)
    }
  }

  const handleUploadSignature = () => {
    if (uploadedImage && interpreterName.trim()) {
      onSignatureComplete(uploadedImage, "upload", interpreterName)
    }
  }

  const handleDrawSignature = () => {
    const canvas = canvasRef.current
    if (canvas && interpreterName.trim()) {
      const dataURL = canvas.toDataURL()
      onSignatureComplete(dataURL, "draw", interpreterName)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-green-600" />
            Choose your signature method
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label htmlFor="interpreter-name">Interpreter Name (Required)</Label>
          <Input
            id="interpreter-name"
            placeholder="Enter your full name"
            value={interpreterName}
            onChange={(e) => setInterpreterName(e.target.value)}
            className="mt-2"
          />
        </div>
        <Tabs defaultValue="text" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Typography
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Image
            </TabsTrigger>
            <TabsTrigger value="draw" className="flex items-center gap-2">
              <PenTool className="w-4 h-4" />
              Draw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="signature-text">Type your name</Label>
                <Input
                  id="signature-text"
                  placeholder="Your full name"
                  value={textSignature}
                  onChange={(e) => setTextSignature(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="font-select">Choose a font</Label>
                <Select value={selectedFont} onValueChange={setSelectedFont}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fonts.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.style }}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {textSignature && (
                <div className="p-4 border rounded-lg bg-gray-50">
                  <Label>Signature preview:</Label>
                  <div className="text-3xl mt-2 text-gray-800" style={{ fontFamily: selectedFont }}>
                    {textSignature}
                  </div>
                </div>
              )}

              <Button
                onClick={handleTextSignature}
                disabled={!textSignature.trim() || !interpreterName.trim()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Use this signature
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="signature-upload">Upload your signature (PNG recommended)</Label>
                <Input id="signature-upload" type="file" accept="image/*" onChange={handleImageUpload} />
              </div>

              {uploadedImage && (
                <div className="p-4 border rounded-lg bg-gray-50">
                  <Label>Signature preview:</Label>
                  <div className="mt-2">
                    <img
                      src={uploadedImage || "/placeholder.svg"}
                      alt="Uploaded signature"
                      className="max-w-full max-h-32 object-contain border"
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleUploadSignature}
                disabled={!uploadedImage || !interpreterName.trim()}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Use this signature
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="draw" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Draw your signature</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="border bg-white cursor-crosshair w-full"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={clearCanvas} variant="outline" className="flex-1">
                  Clear
                </Button>
                <Button onClick={handleDrawSignature} className="flex-1 bg-green-600 hover:bg-green-700">
                  <Check className="w-4 h-4 mr-2" />
                  Use this signature
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
