// app/api/save-signed-contract/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { SignedContract, AuditLog } from "@/lib/mysql"

export async function POST(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  try {
    const { 
      linkId, 
      interpreterName, 
      signatureType, 
      signatureData, 
      pdfBase64 
    } = await request.json()

    // Validation des données requises
    if (!linkId || !interpreterName || !signatureType || !signatureData || !pdfBase64) {
      await AuditLog.create({
        linkId,
        action: 'CONTRACT_SAVE_FAILED',
        details: { reason: 'missing_required_fields' },
        ipAddress: clientIP,
        userAgent
      })
      
      return NextResponse.json({ 
        error: "Missing required fields" 
      }, { status: 400 })
    }

    // Vérifier que le contrat n'a pas déjà été signé
    const existingContract = await SignedContract.findByLinkId(linkId)
    if (existingContract) {
      await AuditLog.create({
        linkId,
        action: 'CONTRACT_SAVE_FAILED',
        details: { reason: 'already_signed' },
        ipAddress: clientIP,
        userAgent
      })
      
      return NextResponse.json({ 
        error: "Contract already signed for this link" 
      }, { status: 409 })
    }

    // Sauvegarder le contrat signé
    await SignedContract.create({
      linkId,
      interpreterName,
      signatureType: signatureType as 'text' | 'upload' | 'draw',
      signatureData,
      pdfContent: pdfBase64
    })

    // Log de sauvegarde réussie
    await AuditLog.create({
      linkId,
      action: 'CONTRACT_SIGNED_SAVED',
      details: { 
        interpreterName, 
        signatureType,
        pdfSize: pdfBase64.length
      },
      ipAddress: clientIP,
      userAgent
    })

    console.log("✅ Contrat signé sauvegardé:", {
      linkId,
      interpreterName,
      signatureType,
      pdfSize: `${Math.round(pdfBase64.length / 1024)} KB`
    })

    return NextResponse.json({ 
      success: true,
      message: "Contract saved successfully"
    })

  } catch (error) {
    console.error("💥 Erreur lors de la sauvegarde du contrat:", error)
    
    await AuditLog.create({
      action: 'CONTRACT_SAVE_ERROR',
      details: { error: error.message },
      ipAddress: clientIP,
      userAgent
    })
    
    return NextResponse.json({ 
      error: "Failed to save contract" 
    }, { status: 500 })
  }
}

// Route GET pour récupérer un contrat signé
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('linkId')

    if (!linkId) {
      return NextResponse.json({ 
        error: "LinkId parameter required" 
      }, { status: 400 })
    }

    const contract = await SignedContract.findByLinkId(linkId)
    
    if (!contract) {
      return NextResponse.json({ 
        error: "Contract not found" 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      contract: {
        id: contract.id,
        linkId: contract.link_id,
        interpreterName: contract.interpreter_name,
        signatureType: contract.signature_type,
        signedAt: contract.signed_at,
        // Ne pas renvoyer le PDF par défaut (trop volumineux)
        hasPdf: !!contract.pdf_content
      }
    })

  } catch (error) {
    console.error("💥 Erreur lors de la récupération du contrat:", error)
    return NextResponse.json({ 
      error: "Failed to retrieve contract" 
    }, { status: 500 })
  }
}