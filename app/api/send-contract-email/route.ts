// app/api/send-contract-email/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import nodemailer from "nodemailer"
import { SecureLink, AuditLog } from "@/lib/mysql"

export async function POST(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  try {
    const { email, subject, message, expiresIn = 24 } = await request.json()

    if (!email) {
      await AuditLog.create({
        action: 'EMAIL_SEND_FAILED',
        details: { reason: 'missing_email' },
        ipAddress: clientIP,
        userAgent
      })
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Générer un ID unique et un OTP
    const linkId = randomBytes(16).toString("hex")
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000)

    // Stocker le lien sécurisé dans MySQL
    const linkData = await SecureLink.create({
      id: linkId,
      email,
      otp,
      expiresAt
    })

    // Log de création du lien
    await AuditLog.create({
      linkId,
      action: 'SECURE_LINK_CREATED',
      details: { email, expiresIn },
      ipAddress: clientIP,
      userAgent
    })

    // Configuration du transporteur email
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS || "vmwa dbks phrc wfnk",
      },
    })

    // Créer le lien sécurisé
    const secureLink = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/contract/${linkId}`

    // Contenu de l'email
    const emailContent = `
${message}

Secure Link: ${secureLink}
OTP Code: ${otp}

This link will expire on: ${new Date(expiresAt).toLocaleString()}

Important: Keep this OTP code secure and do not share it with anyone.

Best regards,
CGSD Logistics Team
    `

    // Envoyer l'email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      text: emailContent,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">CGSD Logistics</h1>
            <p style="color: white; margin: 5px 0;">Allow us to be your voice</p>
          </div>
          
          <div style="padding: 30px; background: #f9f9f9;">
            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="color: #333; line-height: 1.6;">${message.replace(/\n/g, "<br>")}</p>
              
              <div style="margin: 30px 0; padding: 20px; background: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
                <h3 style="color: #16a34a; margin: 0 0 10px 0;">Secure Access Information</h3>
                <p style="margin: 10px 0;"><strong>Secure Link:</strong><br>
                <a href="${secureLink}" style="color: #16a34a; text-decoration: none;">${secureLink}</a></p>
                <p style="margin: 10px 0;"><strong>OTP Code:</strong> <span style="background: #e5e7eb; padding: 5px 10px; border-radius: 4px; font-family: monospace; font-size: 18px; font-weight: bold;">${otp}</span></p>
                <p style="margin: 10px 0; color: #dc2626;"><strong>Expires:</strong> ${new Date(expiresAt).toLocaleString()}</p>
              </div>
              
              <div style="margin: 20px 0; padding: 15px; background: #fef3c7; border-radius: 4px;">
                <p style="margin: 0; color: #92400e;"><strong>Security Notice:</strong> Keep this OTP code secure and do not share it with anyone. This link is unique to you and will expire after use or at the specified time.</p>
              </div>
            </div>
          </div>
          
          <div style="background: #22c55e; padding: 15px; text-align: center;">
            <p style="color: white; margin: 0;">Best regards, CGSD Logistics Team</p>
            <p style="color: white; margin: 5px 0; font-size: 14px;">www.cgsdlogistics.com</p>
          </div>
        </div>
      `,
    })

    // Log d'envoi réussi
    await AuditLog.create({
      linkId,
      action: 'EMAIL_SENT',
      details: { email, subject },
      ipAddress: clientIP,
      userAgent
    })

    console.log("✅ Email envoyé avec succès:", email)
    console.log("🔗 Lien créé:", linkId)

    return NextResponse.json({ success: true, linkData })
  } catch (error) {
    console.error("Error sending email:", error)
    
    await AuditLog.create({
      action: 'EMAIL_SEND_ERROR',
      details: { error: error.message },
      ipAddress: clientIP,
      userAgent
    })
    
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}