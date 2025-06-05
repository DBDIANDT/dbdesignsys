// app/api/dashboard/analytics/route.ts
import { NextResponse } from "next/server"
import { query } from "@/lib/mysql"

export async function GET() {
  try {
    // Activité par jour (derniers 7 jours)
    const dailyActivity = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM audit_logs 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `) as any[]

    // Contrats signés par mois (derniers 6 mois)
    const monthlyContracts = await query(`
      SELECT 
        DATE_FORMAT(signed_at, '%Y-%m') as month,
        COUNT(*) as count
      FROM signed_contracts 
      WHERE signed_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(signed_at, '%Y-%m')
      ORDER BY month DESC
    `) as any[]

    // Top interprètes (plus actifs)
    const topInterpreters = await query(`
      SELECT 
        interpreter_name,
        COUNT(*) as contract_count,
        MAX(signed_at) as last_signed
      FROM signed_contracts 
      GROUP BY interpreter_name
      ORDER BY contract_count DESC
      LIMIT 10
    `) as any[]

    const analytics = {
      dailyActivity,
      monthlyContracts,
      topInterpreters
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Error fetching analytics:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}