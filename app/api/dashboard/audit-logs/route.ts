// app/api/dashboard/audit-logs/route.ts (CORRIGÉ)
import { NextResponse } from "next/server"
import { query } from "@/lib/mysql"

export async function GET() {
  try {
    const logs = await query(`
      SELECT id, link_id, action, details, ip_address, user_agent, created_at
      FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 100
    `) as any[]

    // Parser les détails JSON avec gestion d'erreur
    const parsedLogs = logs.map(log => {
      let parsedDetails = null
      
      if (log.details) {
        try {
          // Vérifier si c'est déjà un objet
          if (typeof log.details === 'object') {
            parsedDetails = log.details
          } else if (typeof log.details === 'string') {
            // Vérifier si c'est du JSON valide
            if (log.details.startsWith('{') || log.details.startsWith('[')) {
              parsedDetails = JSON.parse(log.details)
            } else if (log.details !== '[object Object]') {
              // Si ce n'est pas "[object Object]", garder comme string
              parsedDetails = { message: log.details }
            } else {
              // Si c'est "[object Object]", mettre null
              parsedDetails = null
            }
          }
        } catch (error) {
          console.warn(`Failed to parse details for log ${log.id}:`, log.details)
          // En cas d'erreur de parsing, créer un objet avec le contenu brut
          parsedDetails = { raw: log.details, parseError: true }
        }
      }

      return {
        ...log,
        details: parsedDetails
      }
    })

    return NextResponse.json(parsedLogs)
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 })
  }
}