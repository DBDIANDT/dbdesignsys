// app/api/download-contract-pdf/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { SignedContract, AuditLog } from "@/lib/mysql"

export async function GET(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || 'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  try {
    const { searchParams } = new URL(request.url)
    const linkId = searchParams.get('linkId')

    if (!linkId) {
      return NextResponse.json({ 
        error: "LinkId parameter required" 
      }, { status: 400 })
    }

    // Récupérer le contrat signé
    const contract = await SignedContract.findByLinkId(linkId)
    
    if (!contract || !contract.pdf_content) {
      await AuditLog.create({
        linkId,
        action: 'PDF_DOWNLOAD_FAILED',
        details: { reason: 'contract_not_found' },
        ipAddress: clientIP,
        userAgent
      })
      
      return NextResponse.json({ 
        error: "Contract PDF not found" 
      }, { status: 404 })
    }

    // Log du téléchargement
    await AuditLog.create({
      linkId,
      action: 'PDF_DOWNLOADED',
      details: { interpreterName: contract.interpreter_name },
      ipAddress: clientIP,
      userAgent
    })

    // Convertir le base64 en buffer
    const pdfBuffer = Buffer.from(contract.pdf_content, 'base64')
    
    // Créer un nom de fichier avec la date de signature
    const signedDate = new Date(contract.signed_at).toISOString().split('T')[0]
    const fileName = `cgsd-contract-${contract.interpreter_name.replace(/\s+/g, '-')}-${signedDate}.pdf`

    console.log("📥 Téléchargement PDF:", {
      linkId,
      fileName,
      size: `${Math.round(pdfBuffer.length / 1024)} KB`
    })

    // Retourner le PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })

  } catch (error) {
    console.error("💥 Erreur lors du téléchargement PDF:", error)
    
    await AuditLog.create({
      action: 'PDF_DOWNLOAD_ERROR',
      details: { error: error.message },
      ipAddress: clientIP,
      userAgent
    })
    
    return NextResponse.json({ 
      error: "Failed to download PDF" 
    }, { status: 500 })
  }
}