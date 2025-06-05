// app/api/dashboard/stats/route.ts
import { NextResponse } from "next/server"
import { query } from "@/lib/mysql"

export async function GET() {
  try {
    // Statistiques générales
    const [totalLinksResult] = await query("SELECT COUNT(*) as count FROM secure_links") as any[]
    const [activeLinksResult] = await query(
      "SELECT COUNT(*) as count FROM secure_links WHERE expires_at > NOW() AND used = FALSE"
    ) as any[]
    const [signedContractsResult] = await query("SELECT COUNT(*) as count FROM signed_contracts") as any[]
    const [todayActivityResult] = await query(
      "SELECT COUNT(*) as count FROM audit_logs WHERE DATE(created_at) = CURDATE()"
    ) as any[]

    // Types de signatures
    const signatureTypesResult = await query(
      "SELECT signature_type, COUNT(*) as count FROM signed_contracts GROUP BY signature_type"
    ) as any[]

    const signatureTypes = signatureTypesResult.reduce((acc, row) => {
      acc[row.signature_type] = row.count
      return acc
    }, {})

    const stats = {
      totalLinks: totalLinksResult.count,
      activeLinks: activeLinksResult.count,
      signedContracts: signedContractsResult.count,
      todayActivity: todayActivityResult.count,
      signatureTypes
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}