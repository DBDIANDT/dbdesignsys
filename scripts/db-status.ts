// scripts/db-status.ts
import { config } from 'dotenv'
import { testConnection, query, SecureLink, SignedContract, AuditLog } from '../lib/mysql'

// Charger les variables d'environnement
config({ path: '.env.local' })

async function checkDatabaseStatus() {
  console.log('🔍 CGSD Logistics - Statut de la base de données')
  console.log('===============================================\n')

  try {
    // Test de connexion
    console.log('📡 Test de connexion...')
    const isConnected = await testConnection()
    
    if (!isConnected) {
      console.error('❌ Impossible de se connecter à la base de données')
      process.exit(1)
    }
    
    console.log('✅ Connexion à MySQL réussie\n')

    // Vérifier l'existence des tables
    console.log('📋 Vérification des tables...')
    const tables = ['secure_links', 'signed_contracts', 'audit_logs']
    
    for (const tableName of tables) {
      try {
        const [result] = await query(`SELECT COUNT(*) as count FROM ${tableName}`) as any[]
        const count = result.count
        console.log(`✅ ${tableName}: ${count} enregistrements`)
      } catch (error) {
        console.log(`❌ ${tableName}: Table non trouvée ou inaccessible`)
      }
    }

    // Statistiques détaillées
    console.log('\n📊 Statistiques détaillées:')
    
    // Stats des liens sécurisés
    try {
      const linkStats = await SecureLink.getStats()
      console.log('🔗 Liens sécurisés:')
      console.log(`  - Total: ${linkStats.total}`)
      console.log(`  - Utilisés: ${linkStats.used}`)
      console.log(`  - Expirés: ${linkStats.expired}`)
      console.log(`  - Créés aujourd'hui: ${linkStats.today}`)
    } catch (error) {
      console.log('❌ Impossible de récupérer les stats des liens')
    }

    // Stats des contrats signés
    try {
      const contractStats = await SignedContract.getStats()
      console.log('\n📝 Contrats signés:')
      
      let totalContracts = 0
      let todayContracts = 0
      let weekContracts = 0
      const signatureTypes: Record<string, number> = {}

      contractStats.forEach((stat: any) => {
        if (stat.signature_type === 'total') {
          totalContracts = stat.total
          todayContracts = stat.today
          weekContracts = stat.this_week
        } else {
          signatureTypes[stat.signature_type] = stat.type_count
        }
      })

      console.log(`  - Total: ${totalContracts}`)
      console.log(`  - Signés aujourd'hui: ${todayContracts}`)
      console.log(`  - Signés cette semaine: ${weekContracts}`)
      
      console.log('  - Types de signatures:')
      Object.entries(signatureTypes).forEach(([type, count]) => {
        console.log(`    • ${type}: ${count}`)
      })
    } catch (error) {
      console.log('❌ Impossible de récupérer les stats des contrats')
    }

    // Logs d'audit récents
    try {
      const recentLogs = await AuditLog.getRecent(10)
      console.log(`\n📜 Logs d'audit récents (${recentLogs.length} derniers):`)
      
      if (recentLogs.length === 0) {
        console.log('  Aucun log trouvé')
      } else {
        recentLogs.forEach((log: any, index: number) => {
          const date = new Date(log.created_at).toLocaleString('fr-FR')
          console.log(`  ${index + 1}. [${date}] ${log.action} ${log.email ? `(${log.email})` : ''}`)
        })
      }
    } catch (error) {
      console.log('❌ Impossible de récupérer les logs d\'audit')
    }

    // Vérification de l'intégrité
    console.log('\n🔍 Vérification de l\'intégrité:')
    
    try {
      // Vérifier les liens orphelins
      const [orphanContracts] = await query(`
        SELECT COUNT(*) as count 
        FROM signed_contracts sc 
        LEFT JOIN secure_links sl ON sc.link_id = sl.id 
        WHERE sl.id IS NULL
      `) as any[]
      
      if (orphanContracts.count > 0) {
        console.log(`⚠️  ${orphanContracts.count} contrats orphelins (liens supprimés)`)
      } else {
        console.log('✅ Aucun contrat orphelin')
      }

      // Vérifier les liens expirés non nettoyés
      const [expiredLinks] = await query(`
        SELECT COUNT(*) as count 
        FROM secure_links 
        WHERE expires_at < NOW() AND expires_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `) as any[]
      
      if (expiredLinks.count > 0) {
        console.log(`⚠️  ${expiredLinks.count} liens expirés à nettoyer`)
      } else {
        console.log('✅ Pas de liens expirés à nettoyer')
      }

    } catch (error) {
      console.log('❌ Erreur lors de la vérification d\'intégrité:', error.message)
    }

    // Recommandations
    console.log('\n💡 Recommandations:')
    console.log('  - Exécutez `npm run db:cleanup` régulièrement pour nettoyer les données expirées')
    console.log('  - Surveillez la taille de la table audit_logs qui peut grossir rapidement')
    console.log('  - Sauvegardez régulièrement votre base de données')

    console.log('\n✅ Vérification terminée avec succès!')

  } catch (error) {
    console.error('\n💥 Erreur lors de la vérification:', error)
    process.exit(1)
  }
}

// Exécuter si le script est appelé directement
if (require.main === module) {
  checkDatabaseStatus()
}