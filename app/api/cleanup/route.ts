// app/api/dashboard/cleanup/route.ts
import { NextResponse } from "next/server"
import { query, AuditLog } from "@/lib/mysql"

export async function POST() {
  try {
    // Supprimer les liens expirés et utilisés (plus anciens que 30 jours)
    const deleteResult = await query(`
      DELETE FROM secure_links 
      WHERE (expires_at < NOW() OR used = TRUE) 
      AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `) as any

    // Supprimer les logs d'audit anciens (plus de 90 jours)
    const deleteLogsResult = await query(`
      DELETE FROM audit_logs 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
    `) as any

    // Log de l'opération de nettoyage
    await AuditLog.create({
      action: 'DATABASE_CLEANUP',
      details: {
        deletedLinks: deleteResult.affectedRows,
        deletedLogs: deleteLogsResult.affectedRows
      }
    })

    return NextResponse.json({
      success: true,
      deletedLinks: deleteResult.affectedRows,
      deletedLogs: deleteLogsResult.affectedRows
    })
  } catch (error) {
    console.error("Error during cleanup:", error)
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 })
  }
}