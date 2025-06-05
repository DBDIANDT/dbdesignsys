// app/api/dashboard/secure-links/route.ts
import { NextResponse } from "next/server"
import { query } from "@/lib/mysql"

export async function GET() {
  try {
    const links = await query(`
      SELECT id, email, otp, expires_at, used, created_at 
      FROM secure_links 
      ORDER BY created_at DESC 
      LIMIT 50
    `) as any[]

    return NextResponse.json(links)
  } catch (error) {
    console.error("Error fetching secure links:", error)
    return NextResponse.json({ error: "Failed to fetch links" }, { status: 500 })
  }
}