// app/api/migrate-to-mysql/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { SecureLink, AuditLog, migrationUtils } from "@/lib/mysql"

declare global {
  var secureLinks: Map<string, any>
}

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification admin
    const adminKey = request.headers.get("x-admin-key")
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: "Unauthorized - Invalid admin key" }, { status: 401 })
    }

    let migratedCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Vérifier s'il y a des données en mémoire
    const memoryData = await migrationUtils.checkMemoryData()
    
    if (!memoryData.hasMemoryData) {
      return NextResponse.json({
        success: true,
        message: "No data to migrate - memory is empty",
        migratedCount: 0,
        errorCount: 0
      })
    }

    console.log(`🚀 Début de migration: ${memoryData.memoryCount} liens en mémoire`)

    // Migrer chaque lien de la mémoire vers MySQL
    for (const [linkId, linkData] of memoryData.memoryLinks) {
      try {
        // Vérifier si le lien existe déjà en base
        const existingLink = await SecureLink.exists(linkId)
        
        if (existingLink) {
          console.log(`⏭️ Lien ${linkId} déjà existant en base, ignoré`)
          continue
        }

        // Créer le lien en base de données
        await SecureLink.create({
          id: linkId,
          email: linkData.email,
          otp: linkData.otp,
          expiresAt: new Date(linkData.expiresAt)
        })

        // Logger la migration
        await AuditLog.create({
          linkId,
          action: 'DATA_MIGRATED_TO_MYSQL',
          details: {
            source: 'memory',
            email: linkData.email,
            used: linkData.used,
            createdAt: linkData.createdAt,
            migratedAt: new Date().toISOString()
          }
        })

        migratedCount++
        console.log(`✅ Migré: ${linkId} (${linkData.email})`)

      } catch (error) {
        errorCount++
        const errorMsg = `Failed to migrate ${linkId}: ${error.message}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    // Vider la mémoire après migration réussie
    if (migratedCount > 0 && errorCount === 0) {
      if (global.secureLinks) {
        global.secureLinks.clear()
        console.log("🧹 Mémoire vidée après migration complète")
      }
    }

    // Log final de migration
    await AuditLog.create({
      action: 'MIGRATION_COMPLETED',
      details: {
        migratedCount,
        errorCount,
        totalProcessed: migratedCount + errorCount,
        memoryCleared: errorCount === 0,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
      migratedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
      memoryCleared: errorCount === 0
    })

  } catch (error) {
    console.error("❌ Erreur lors de la migration:", error)
    
    // Log de l'erreur de migration
    try {
      await AuditLog.create({
        action: 'MIGRATION_ERROR',
        details: {
          error: error.message,
          timestamp: new Date().toISOString()
        }
      })
    } catch (logError) {
      console.error("❌ Erreur lors du logging:", logError)
    }
    
    return NextResponse.json({ 
      error: "Migration failed", 
      details: error.message 
    }, { status: 500 })
  }
}

// Route GET pour vérifier l'état de migration
export async function GET() {
  try {
    const migrationStatus = await migrationUtils.getMigrationStatus()
    
    return NextResponse.json({
      success: true,
      ...migrationStatus,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ 
      error: "Failed to check migration status",
      details: error.message 
    }, { status: 500 })
  }
}