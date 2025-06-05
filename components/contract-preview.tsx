"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"

interface ContractPreviewProps {
  signature?: string | null
  signatureType?: "text" | "upload" | "draw" | null
  interpreterName?: string
}

export default function ContractPreview({ signature, signatureType, interpreterName }: ContractPreviewProps) {
  return (
    <Card className="w-full max-w-3xl mx-auto bg-white shadow-lg">
      <CardContent className="p-0">
        <div className="relative">
          {/* Header with green background */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 h-16 relative">
            <div className="absolute inset-0 bg-green-600 opacity-90"></div>
          </div>

          {/* Main content */}
          <div className="p-8 relative">
            {/* Logo and company info */}
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full p-2 shadow-md">
                  <Image
                    src="/logo.jpeg"
                    alt="CGSD Logistics Logo"
                    width={60}
                    height={60}
                    className="rounded-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">CGSD LOGISTICS</h2>
                  <p className="text-sm text-gray-600">Allow us to be your voice</p>
                </div>
              </div>

              <div className="text-right text-sm text-gray-600">
                <p>CGSDLOGISTICS@GMAIL.COM</p>
                <p>(774) 564-8187</p>
                <p>https://cgsdlogistics.com</p>
              </div>
            </div>

            {/* Contract Title */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">INTERPRETER CONTRACT</h1>
              <p className="text-gray-600">Medical Interpreter Position Offer</p>
            </div>

            {/* Contract Content */}
            <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
              <p className="font-medium">Dear Interpreter,</p>

              <p>
                It is with great pleasure that we extend to you the offer for the contract position of Medical
                Interpreter at CGSD LOGISTICS. You will be reporting directly to Jasme, the Scheduling Manager at CGSD
                LOGISTICS. We are confident that your skills and experience align excellently with the needs of our
                company.
              </p>

              <p>
                Our mission is to offer professional guidelines for translation and interpretation, thereby equipping
                individuals with limited English proficiency with the necessary tools to communicate effectively,
                enhance their lives, and achieve their goals.
              </p>

              <p>
                The hourly remuneration for this position is set at $30, contingent upon the duration of the
                appointment. The minimum appointment time is two hours. Should a patient fail to attend their scheduled
                appointment, this will be classified as a "no-show." The interpreter shall still receive compensation
                for their time; however, it is imperative that they remain at the appointment location for a minimum of
                45 to 60 minutes, should the patient arrive. Furthermore, please note that compensation for all
                interpretation services will be processed 30 to 40 days following the appointment. Please confirm your
                acceptance of this offer by signing and returning this letter.
              </p>

              <p>
                We are thrilled to welcome you to our team! If you have any questions, please don't hesitate to reach
                out at any time.
              </p>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p>*Portuguese: $35 per hour</p>
                  <p>*Haitian Creole: $30 per hour</p>
                  <p>*French: $35 per hour</p>
                  <p>*Cantonese: $30 per hour</p>
                </div>
                <div>
                  <p>*Spanish: $30 per hour</p>
                  <p>*Cape Verdean: $30 per hour</p>
                  <p>*Mandarin: $40 per hour</p>
                  <p>*Rare Languages: $45 per hour</p>
                </div>
              </div>

              <p className="mt-4">
                Sincerely,
                <br />
                CGSD Logistics
              </p>
            </div>

            {/* Signature Section */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex flex-col md:flex-row justify-between gap-8">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">Chief Executive Officer/President</h3>
                  <div className="mb-4">
                    <Image
                      src="/ceo-signature.png"
                      alt="CEO Signature"
                      width={150}
                      height={60}
                      className="object-contain"
                    />
                  </div>
                  <div className="border-t border-gray-400 pt-2 w-48">
                    <p className="text-sm text-gray-600">Cassy Delice</p>
                    <p className="text-sm text-gray-600">CEO, CGSD Logistics</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">Interpreter Signature</h3>
                  {signature ? (
                    <div className="mb-4">
                      {signatureType === "text" && (
                        <div className="text-2xl font-script text-gray-800" style={{ fontFamily: "cursive" }}>
                          {signature}
                        </div>
                      )}
                      {signatureType === "upload" && (
                        <img
                          src={signature || "/placeholder.svg"}
                          alt="Signature"
                          className="max-w-48 max-h-16 object-contain"
                        />
                      )}
                      {signatureType === "draw" && (
                        <img
                          src={signature || "/placeholder.svg"}
                          alt="Signature"
                          className="max-w-48 max-h-16 object-contain"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="w-48 h-16 border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
                      <span className="text-gray-400 text-sm">Signature required</span>
                    </div>
                  )}
                  <div className="border-t border-gray-400 pt-2 w-48">
                    <p className="text-sm text-gray-600">
                      Interpreter Name (Printed): {interpreterName || "_______________"}
                    </p>
                    <p className="text-sm text-gray-600">Date Signed: {new Date().toLocaleDateString("en-US")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-16 text-center">
              <div className="inline-block bg-green-600 text-white px-4 py-2 rounded">
                <p className="text-sm font-medium">www.cgsdlogistics.com</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
