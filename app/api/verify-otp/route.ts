// app/api/verify-otp/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { SecureLink, AuditLog } from "@/lib/mysql"

export async function POST(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  console.log("🚀 POST /api/verify-otp - Route appelée")
  
  try {
    const body = await request.json()
    console.log("📦 Body reçu:", body)
    
    const { linkId, otp } = body

    if (!linkId || !otp) {
      await AuditLog.create({
        linkId,
        action: 'OTP_VERIFY_FAILED',
        details: { reason: 'missing_params', linkId: !!linkId, otp: !!otp },
        ipAddress: clientIP,
        userAgent
      })
      
      console.log("❌ LinkId ou OTP manquant")
      return NextResponse.json({ error: "Link ID and OTP are required" }, { status: 400 })
    }

    // Récupérer les données du lien depuis MySQL
    const linkData = await SecureLink.findById(linkId)
    console.log("🔗 LinkData depuis MySQL:", linkData)

    if (!linkData) {
      await AuditLog.create({
        linkId,
        action: 'OTP_VERIFY_FAILED',
        details: { reason: 'link_not_found' },
        ipAddress: clientIP,
        userAgent
      })
      
      console.log("❌ Lien non trouvé")
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 })
    }

    // Vérifier si le lien a expiré
    if (new Date(linkData.expires_at) < new Date()) {
      await AuditLog.create({
        linkId,
        action: 'OTP_VERIFY_FAILED',
        details: { reason: 'link_expired', expires_at: linkData.expires_at },
        ipAddress: clientIP,
        userAgent
      })
      
      console.log("⏰ Lien expiré")
      return NextResponse.json({ error: "Link has expired" }, { status: 410 })
    }

    // Vérifier si le lien a déjà été utilisé
    if (linkData.used) {
      await AuditLog.create({
        linkId,
        action: 'OTP_VERIFY_FAILED',
        details: { reason: 'link_already_used' },
        ipAddress: clientIP,
        userAgent
      })
      
      console.log("🚫 Lien déjà utilisé")
      return NextResponse.json({ error: "Link has already been used" }, { status: 410 })
    }

    // Vérifier l'OTP
    console.log("🆚 Comparaison OTP:")
    console.log("  - Stocké:", linkData.otp)
    console.log("  - Reçu:", otp.trim())
    console.log("  - Match:", linkData.otp === otp.trim())
    
    if (linkData.otp !== otp.trim()) {
      await AuditLog.create({
        linkId,
        action: 'OTP_VERIFY_FAILED',
        details: { reason: 'invalid_otp' },
        ipAddress: clientIP,
        userAgent
      })
      
      console.log("❌ OTP invalide")
      return NextResponse.json({ error: "Invalid OTP code" }, { status: 401 })
    }

    // Marquer le lien comme utilisé
    await SecureLink.markAsUsed(linkId)
    
    // Log de vérification réussie
    await AuditLog.create({
      linkId,
      action: 'OTP_VERIFIED_SUCCESS',
      details: { email: linkData.email },
      ipAddress: clientIP,
      userAgent
    })

    console.log("✅ OTP vérifié avec succès")
    
    return NextResponse.json({ 
      success: true, 
      linkData: {
        id: linkData.id,
        email: linkData.email,
        createdAt: linkData.created_at
      }
    })
  } catch (error) {
    console.error("💥 Erreur dans verify-otp:", error)
    
    await AuditLog.create({
      action: 'OTP_VERIFY_ERROR',
      details: { error: error.message },
      ipAddress: clientIP,
      userAgent
    })
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Route GET pour tester la connexion
export async function GET() {
  console.log("🚀 GET /api/verify-otp - Route de test appelée")
  try {
    // Test de connexion MySQL
    const testLink = await SecureLink.findById('test')
    return NextResponse.json({ 
      message: "Route verify-otp fonctionne avec MySQL", 
      timestamp: new Date().toISOString(),
      mysql_connected: true
    })
  } catch (error) {
    return NextResponse.json({ 
      message: "Route verify-otp fonctionne mais problème MySQL", 
      timestamp: new Date().toISOString(),
      mysql_connected: false,
      error: error.message
    })
  }
}