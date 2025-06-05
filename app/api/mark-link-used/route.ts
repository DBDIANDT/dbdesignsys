import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { linkId } = await request.json()

    if (!linkId) {
      return NextResponse.json({ error: "Link ID is required" }, { status: 400 })
    }

    // Récupérer et marquer le lien comme utilisé
    const linkData = global.secureLinks?.get(linkId)

    if (linkData) {
      linkData.used = true
      global.secureLinks.set(linkId, linkData)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking link as used:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
