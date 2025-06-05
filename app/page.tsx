"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, PenTool, Download } from "lucide-react"
import ContractPreview from "@/components/contract-preview"
import SignatureModal from "@/components/signature-modal"

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<"preview" | "sign" | "complete">("preview")
  const [signature, setSignature] = useState<string | null>(null)
  const [signatureType, setSignatureType] = useState<"text" | "upload" | "draw" | null>(null)
  const [interpreterName, setInterpreterName] = useState("")

  const handleSignatureComplete = (sig: string, type: "text" | "upload" | "draw", name: string) => {
    setSignature(sig)
    setSignatureType(type)
    setInterpreterName(name)
    setCurrentStep("complete")
  }

  const steps = [
    { id: "preview", label: "Preview", icon: FileText },
    { id: "sign", label: "Signature", icon: PenTool },
    { id: "complete", label: "Download", icon: Download },
  ]

  const generatePDF = async (
    jsPDF: any,
    signature: string | null,
    signatureType: "text" | "upload" | "draw" | null,
  ) => {
    const doc = new jsPDF()

    // Configuration
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20

    // Fonction pour convertir une image en base64
    const getImageBase64 = (src: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          canvas.width = img.width
          canvas.height = img.height
          ctx?.drawImage(img, 0, 0)
          resolve(canvas.toDataURL("image/png"))
        }
        img.onerror = reject
        img.src = src
      })
    }

    try {
      // Header avec couleur verte
      doc.setFillColor(34, 197, 94) // green-500
      doc.rect(0, 0, pageWidth, 30, "F")

      // Ajouter le logo
      try {
        const logoBase64 = await getImageBase64("/logo.jpeg")
        doc.addImage(logoBase64, "JPEG", margin, 35, 20, 20)
      } catch (error) {
        console.log("Erreur lors du chargement du logo:", error)
      }

      // Logo et titre
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(20)
      doc.setFont("helvetica", "bold")
      doc.text("CGSD LOGISTICS", margin + 25, 45)

      doc.setTextColor(34, 197, 94)
      doc.setFontSize(12)
      doc.text("Allow us to be your voice", margin + 25, 52)

      // Informations de contact
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.text("CGSDLOGISTICS@GMAIL.COM", pageWidth - margin - 60, 40)
      doc.text("(774) 564-8187", pageWidth - margin - 60, 45)
      doc.text("https://cgsdlogistics.com", pageWidth - margin - 60, 50)

      // Titre du contrat
      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(0, 0, 0)
      doc.text("INTERPRETER CONTRACT", margin, 70)

      doc.setFontSize(12)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 100, 100)
      doc.text("Medical Interpreter Position Offer", margin, 80)

      // Contenu du contrat
      let yPosition = 90
      doc.setTextColor(0, 0, 0)

      // Dear Interpreter
      doc.setFont("helvetica", "bold")
      doc.text("Dear Interpreter,", margin, yPosition)
      yPosition += 10

      doc.setFont("helvetica", "normal")
      const paragraph1 =
        "It is with great pleasure that we extend to you the offer for the contract position of Medical Interpreter at CGSD LOGISTICS. You will be reporting directly to Jasme, the Scheduling Manager at CGSD LOGISTICS. We are confident that your skills and experience align excellently with the needs of our company."
      const splitParagraph1 = doc.splitTextToSize(paragraph1, pageWidth - 2 * margin)
      doc.text(splitParagraph1, margin, yPosition)
      yPosition += splitParagraph1.length * 5 + 5

      const paragraph2 =
        "Our mission is to offer professional guidelines for translation and interpretation, thereby equipping individuals with limited English proficiency with the necessary tools to communicate effectively, enhance their lives, and achieve their goals."
      const splitParagraph2 = doc.splitTextToSize(paragraph2, pageWidth - 2 * margin)
      doc.text(splitParagraph2, margin, yPosition)
      yPosition += splitParagraph2.length * 5 + 5

      const paragraph3 =
        'The hourly remuneration for this position is set at $30, contingent upon the duration of the appointment. The minimum appointment time is two hours. Should a patient fail to attend their scheduled appointment, this will be classified as a "no-show." The interpreter shall still receive compensation for their time; however, it is imperative that they remain at the appointment location for a minimum of 45 to 60 minutes, should the patient arrive. Furthermore, please note that compensation for all interpretation services will be processed 30 to 40 days following the appointment. Please confirm your acceptance of this offer by signing and returning this letter.'
      const splitParagraph3 = doc.splitTextToSize(paragraph3, pageWidth - 2 * margin)
      doc.text(splitParagraph3, margin, yPosition)
      yPosition += splitParagraph3.length * 5 + 5

      const paragraph4 =
        "We are thrilled to welcome you to our team! If you have any questions, please don't hesitate to reach out at any time."
      const splitParagraph4 = doc.splitTextToSize(paragraph4, pageWidth - 2 * margin)
      doc.text(splitParagraph4, margin, yPosition)
      yPosition += splitParagraph4.length * 5 + 10

      // Rates table
      const col1X = margin
      const col2X = pageWidth / 2

      doc.text("*Portuguese: $35 per hour", col1X, yPosition)
      doc.text("*Spanish: $30 per hour", col2X, yPosition)
      yPosition += 5

      doc.text("*Haitian Creole: $30 per hour", col1X, yPosition)
      doc.text("*Cape Verdean: $30 per hour", col2X, yPosition)
      yPosition += 5

      doc.text("*French: $35 per hour", col1X, yPosition)
      doc.text("*Mandarin: $40 per hour", col2X, yPosition)
      yPosition += 5

      doc.text("*Cantonese: $30 per hour", col1X, yPosition)
      doc.text("*Rare Languages: $45 per hour", col2X, yPosition)
      yPosition += 15

      doc.text("Sincerely,", margin, yPosition)
      yPosition += 5
      doc.text("CGSD Logistics", margin, yPosition)
      yPosition += 20

      // Signatures - Assurez-vous qu'il y a assez d'espace
      // Si on est trop bas sur la page, créer une nouvelle page
      if (yPosition > pageHeight - 80) {
        doc.addPage()
        yPosition = 40
      }

      // Signature de l'entreprise
      doc.setFont("helvetica", "bold")
      doc.text("Chief Executive Officer/President", margin, yPosition)
      yPosition += 10

      // Ajouter la signature du CEO
      try {
        const ceoSignatureBase64 = await getImageBase64("/ceo-signature.png")
        doc.addImage(ceoSignatureBase64, "PNG", margin, yPosition, 60, 20)
        yPosition += 25
      } catch (error) {
        console.log("Erreur lors du chargement de la signature CEO:", error)
        doc.text("_________________________", margin, yPosition + 10)
        yPosition += 15
      }

      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text("Cassy Delice", margin, yPosition)
      doc.text("CEO, CGSD Logistics", margin, yPosition + 5)

      // Signature du client
      const clientSignatureX = pageWidth - margin - 80
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("Interpreter Signature", clientSignatureX, yPosition - 35)

      if (signature && signatureType) {
        if (signatureType === "text") {
          doc.setFont("helvetica", "italic")
          doc.setFontSize(16)
          doc.text(signature, clientSignatureX, yPosition - 15)
        } else if (signatureType === "upload" || signatureType === "draw") {
          try {
            // Pour les signatures uploadées ou dessinées
            doc.addImage(signature, "PNG", clientSignatureX, yPosition - 25, 60, 20)
          } catch (error) {
            console.log("Erreur lors de l'ajout de la signature:", error)
            doc.setFont("helvetica", "normal")
            doc.text("Digital signature", clientSignatureX, yPosition - 15)
          }
        }
      }

      doc.text("_________________________", clientSignatureX, yPosition - 5)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(10)
      doc.text(`Interpreter Name (Printed): ${interpreterName}`, clientSignatureX, yPosition + 5)
      doc.text(`Date Signed: ${new Date().toLocaleDateString("en-US")}`, clientSignatureX, yPosition + 10)

      // Footer - Assurez-vous qu'il ne couvre pas les signatures
      const footerY = Math.max(yPosition + 30, pageHeight - 20)

      // Si le footer est trop proche des signatures, ajoutez-le sur une nouvelle page
      if (footerY > pageHeight - 10) {
        doc.addPage()
        doc.setFillColor(34, 197, 94)
        doc.rect(0, pageHeight - 20, pageWidth, 20, "F")
      } else {
        doc.setFillColor(34, 197, 94)
        doc.rect(0, footerY, pageWidth, 20, "F")
      }

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.text("www.cgsdlogistics.com", pageWidth / 2 - 30, footerY + 10)

      // Télécharger le PDF
      doc.save("cgsd-interpreter-contract.pdf")
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error)
      // Fallback: générer le PDF sans les images
      doc.save("cgsd-interpreter-contract.pdf")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CGSD Logistics Interpreter Contract</h1>
          <p className="text-gray-600">Preview, read and sign your contract easily</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = step.id === currentStep
              const isCompleted = steps.findIndex((s) => s.id === currentStep) > index

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isActive
                        ? "bg-green-500 border-green-500 text-white"
                        : isCompleted
                          ? "bg-green-100 border-green-500 text-green-500"
                          : "bg-gray-100 border-gray-300 text-gray-400"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`ml-2 text-sm font-medium ${isActive ? "text-green-600" : "text-gray-500"}`}>
                    {step.label}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-4 ${isCompleted ? "bg-green-500" : "bg-gray-300"}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {currentStep === "preview" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Contract Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ContractPreview />
                <div className="flex justify-center mt-6">
                  <Button onClick={() => setCurrentStep("sign")} className="bg-green-600 hover:bg-green-700" size="lg">
                    Proceed to Signature
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === "sign" && (
            <SignatureModal
              onSignatureComplete={handleSignatureComplete}
              onBack={() => setCurrentStep("preview")}
              interpreterName={interpreterName}
              setInterpreterName={setInterpreterName}
            />
          )}

          {currentStep === "complete" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-600" />
                  Signed Contract
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Download className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Contract signed successfully!</h3>
                  <div className="text-gray-600 mb-4">
                    Your contract was signed using:
                    <Badge variant="secondary" className="ml-2">
                      {signatureType === "text"
                        ? "Typography"
                        : signatureType === "upload"
                          ? "Uploaded image"
                          : "Drawing"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <ContractPreview
                    signature={signature}
                    signatureType={signatureType}
                    interpreterName={interpreterName}
                  />

                  <div className="flex gap-4 justify-center">
                    <Button
                      onClick={() => {
                        setCurrentStep("preview")
                        setSignature(null)
                        setSignatureType(null)
                        setInterpreterName("")
                      }}
                      variant="outline"
                    >
                      New Contract
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={async () => {
                        const { default: jsPDF } = await import("jspdf")
                        await generatePDF(jsPDF, signature, signatureType)
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
