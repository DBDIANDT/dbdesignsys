// app/api/dashboard/cleanup-audit-logs/route.ts
import { NextResponse } from "next/server"
import { query } from "@/lib/mysql"

export async function POST() {
  try {
    console.log("🧹 Début du nettoyage des audit logs...")

    // 1. Trouver tous les logs avec des détails corrompus
    const corruptedLogs = await query(`
      SELECT id, details 
      FROM audit_logs 
      WHERE details = '[object Object]' 
         OR details LIKE '%[object Object]%'
         OR (details IS NOT NULL AND details != '' AND details NOT LIKE '{%' AND details NOT LIKE '[%')
    `) as any[]

    console.log(`📊 Trouvé ${corruptedLogs.length} logs corrompus`)

    // 2. Supprimer ou corriger les logs corrompus
    let correctedCount = 0
    let deletedCount = 0

    for (const log of corruptedLogs) {
      if (log.details === '[object Object]' || log.details?.includes('[object Object]')) {
        // Supprimer complètement ces logs
        await query("DELETE FROM audit_logs WHERE id = ?", [log.id])
        deletedCount++
      } else {
        // Essayer de corriger ou mettre NULL
        await query("UPDATE audit_logs SET details = NULL WHERE id = ?", [log.id])
        correctedCount++
      }
    }

    // 3. Optimiser la table après nettoyage
    await query("OPTIMIZE TABLE audit_logs")

    console.log(`✅ Nettoyage terminé: ${deletedCount} supprimés, ${correctedCount} corrigés`)

    return NextResponse.json({
      success: true,
      message: "Audit logs cleanup completed",
      deletedCount,
      correctedCount,
      totalProcessed: corruptedLogs.length
    })

  } catch (error) {
    console.error("❌ Erreur lors du nettoyage des audit logs:", error)
    return NextResponse.json({ 
      error: "Failed to cleanup audit logs",
      details: error.message 
    }, { status: 500 })
  }
}