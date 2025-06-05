import { type NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"

// Simulation d'une base de données en mémoire
const secureLinks = new Map()

export async function POST(request: NextRequest) {
  try {
    const { email, expiresIn = 24 } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Générer un ID unique et un OTP
    const linkId = randomBytes(16).toString("hex")
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString()

    const linkData = {
      id: linkId,
      email,
      otp,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString(),
    }

    // Stocker le lien sécurisé
    secureLinks.set(linkId, linkData)

    return NextResponse.json(linkData)
  } catch (error) {
    console.error("Error generating secure link:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
