// app/api/dashboard/signed-contracts/route.ts
import { NextResponse } from "next/server"
import { query } from "@/lib/mysql"

export async function GET() {
  try {
    const contracts = await query(`
      SELECT 
        sc.id,
        sc.link_id,
        sc.interpreter_name,
        sc.signature_type,
        sc.signed_at,
        sl.email
      FROM signed_contracts sc
      JOIN secure_links sl ON sc.link_id = sl.id
      ORDER BY sc.signed_at DESC
      LIMIT 50
    `) as any[]

    return NextResponse.json(contracts)
  } catch (error) {
    console.error("Error fetching signed contracts:", error)
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 })
  }
}
