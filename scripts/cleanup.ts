// scripts/cleanup.ts
import { config } from 'dotenv'
import { testConnection, SecureLink, AuditLog } from '../lib/mysql'

// Charger les variables d'environnement
config({ path: '.env.local' })

interface CleanupOptions {
  dryRun?: boolean
  keepAuditDays?: number
  verbose?: boolean
}

async function cleanupDatabase(options: CleanupOptions = {}) {
  const {
    dryRun = false,
    keepAuditDays = 90,
    verbose = true
  } = options

  console.log('🧹 CGSD Logistics - Nettoyage de la base de données')
  console.log('=================================================\n')

  if (dryRun) {
    console.log('🔍 MODE DRY RUN - Aucune suppression ne sera effectuée\n')
  }

  try {
    // Test de connexion
    const isConnected = await testConnection()
    if (!isConnected) {
      console.error('❌ Impossible de se connecter à la base de données')
      process.exit(1)
    }

    if (verbose) {
      console.log('✅ Connexion à MySQL réussie\n')
    }

    let totalCleaned = 0

    // 1. Nettoyer les liens sécurisés expirés
    console.log('🔗 Nettoyage des liens sécurisés expirés...')
    
    if (!dryRun) {
      const expiredLinksDeleted = await SecureLink.cleanup()
      totalCleaned += expiredLinksDeleted
      
      if (expiredLinksDeleted > 0) {
        console.log(`✅ ${expiredLinksDeleted} liens expirés supprimés`)
      } else {
        console.log('ℹ️  Aucun lien expiré à supprimer')
      }
    } else {
      // Mode dry run - compter seulement
      const { query } = await import('../lib/mysql')
      const [result] = await query(`
        SELECT COUNT(*) as count 
        FROM secure_links 
        WHERE expires_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)
      `) as any[]
      
      console.log(`🔍 ${result.count} liens expirés seraient supprimés`)
    }

    // 2. Nettoyer les logs d'audit anciens
    console.log(`\n📜 Nettoyage des logs d'audit (> ${keepAuditDays} jours)...`)
    
    if (!dryRun) {
      const auditLogsDeleted = await AuditLog.cleanup(keepAuditDays)
      totalCleaned += auditLogsDeleted
      
      if (auditLogsDeleted > 0) {
        console.log(`✅ ${auditLogsDeleted} logs d'audit supprimés`)
      } else {
        console.log('ℹ️  Aucun log d\'audit ancien à supprimer')
      }
    } else {
      // Mode dry run - compter seulement
      const { query } = await import('../lib/mysql')
      const [result] = await query(`
        SELECT COUNT(*) as count 
        FROM audit_logs 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [keepAuditDays]) as any[]
      
      console.log(`🔍 ${result.count} logs d'audit seraient supprimés`)
    }

    // 3. Optimiser les tables
    if (!dryRun) {
      console.log('\n⚡ Optimisation des tables...')
      
      const { query } = await import('../lib/mysql')
      const tables = ['secure_links', 'signed_contracts', 'audit_logs']
      
      for (const table of tables) {
        try {
          await query(`OPTIMIZE TABLE ${table}`)
          if (verbose) {
            console.log(`✅ Table ${table} optimisée`)
          }
        } catch (error) {
          console.log(`⚠️  Erreur lors de l'optimisation de ${table}: ${error.message}`)
        }
      }
    }

    // 4. Statistiques post-nettoyage
    if (verbose) {
      console.log('\n📊 Statistiques après nettoyage:')
      
      const { query } = await import('../lib/mysql')
      
      // Compter les enregistrements restants
      const tables = [
        { name: 'secure_links', label: 'Liens sécurisés' },
        { name: 'signed_contracts', label: 'Contrats signés' },
        { name: 'audit_logs', label: 'Logs d\'audit' }
      ]
      
      for (const table of tables) {
        try {
          const [result] = await query(`SELECT COUNT(*) as count FROM ${table.name}`) as any[]
          console.log(`  - ${table.label}: ${result.count} enregistrements`)
        } catch (error) {
          console.log(`  - ${table.label}: Erreur lors du comptage`)
        }
      }

      // Taille de la base de données
      try {
        const [result] = await query(`
          SELECT 
            ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
          FROM information_schema.tables 
          WHERE table_schema = DATABASE()
        `) as any[]
        
        console.log(`\n💾 Taille de la base de données: ${result[0].size_mb} MB`)
      } catch (error) {
        console.log('\n💾 Impossible de calculer la taille de la base de données')
      }
    }

    // Résumé
    console.log('\n🎉 Nettoyage terminé!')
    
    if (!dryRun) {
      console.log(`📈 Total d'enregistrements supprimés: ${totalCleaned}`)
      
      if (totalCleaned > 0) {
        console.log('💡 Conseil: La base de données a été nettoyée et optimisée')
      } else {
        console.log('💡 Conseil: La base de données était déjà propre')
      }
    } else {
      console.log('💡 Conseil: Exécutez sans --dry-run pour effectuer le nettoyage')
    }

    // Recommandations
    console.log('\n📝 Recommandations:')
    console.log('  - Exécutez ce nettoyage chaque semaine')
    console.log('  - Surveillez la croissance des logs d\'audit')
    console.log('  - Effectuez des sauvegardes régulières avant le nettoyage')
    console.log('  - Ajustez la période de rétention des logs selon vos besoins')

  } catch (error) {
    console.error('\n💥 Erreur lors du nettoyage:', error)
    process.exit(1)
  }
}

// Gestion des arguments de ligne de commande
function parseArgs() {
  const args = process.argv.slice(2)
  const options: CleanupOptions = {}

  args.forEach(arg => {
    if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true
    } else if (arg === '--quiet' || arg === '-q') {
      options.verbose = false
    } else if (arg.startsWith('--keep-audit-days=')) {
      options.keepAuditDays = parseInt(arg.split('=')[1]) || 90
    }
  })

  return options
}

// Fonction principale
async function main() {
  const options = parseArgs()
  
  // Afficher l'aide si demandée
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: npm run db:cleanup [options]

Options:
  --dry-run, -d              Mode simulation (aucune suppression)
  --quiet, -q                Mode silencieux
  --keep-audit-days=N        Garder les logs d'audit N jours (défaut: 90)
  --help, -h                 Afficher cette aide

Examples:
  npm run db:cleanup                    # Nettoyage normal
  npm run db:cleanup -- --dry-run       # Simulation
  npm run db:cleanup -- --keep-audit-days=30  # Garder logs 30 jours
`)
    return
  }

  await cleanupDatabase(options)
}

// Exécuter si le script est appelé directement
if (require.main === module) {
  main()
}

export { cleanupDatabase }