// scripts/migrate.ts
import mysql from 'mysql2/promise'
import { config } from 'dotenv'

// Charger les variables d'environnement
config({ path: '.env.local' })

const MYSQL_URL = process.env.MYSQL_URL || process.env.DATABASE_URL

if (!MYSQL_URL) {
  console.error('❌ MYSQL_URL ou DATABASE_URL non trouvée dans les variables d\'environnement')
  console.error('Ajoutez MYSQL_URL=mysql://user:password@host:port/database dans votre .env.local')
  process.exit(1)
}

// Requêtes SQL pour créer les tables et migrations
const migrations = [
  {
    name: 'create_secure_links_table',
    description: 'Création de la table des liens sécurisés',
    sql: `
      CREATE TABLE IF NOT EXISTS secure_links (
        id VARCHAR(32) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_email (email),
        INDEX idx_expires_at (expires_at),
        INDEX idx_used (used),
        INDEX idx_created_at (created_at),
        INDEX idx_otp (otp),
        INDEX idx_active_links (used, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'create_signed_contracts_table',
    description: 'Création de la table des contrats signés',
    sql: `
      CREATE TABLE IF NOT EXISTS signed_contracts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        link_id VARCHAR(32) NOT NULL,
        interpreter_name VARCHAR(255) NOT NULL,
        signature_type ENUM('text', 'upload', 'draw') NOT NULL,
        signature_data LONGTEXT NOT NULL,
        pdf_content LONGTEXT NOT NULL,
        signed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_link_id (link_id),
        INDEX idx_signed_at (signed_at),
        INDEX idx_interpreter_name (interpreter_name),
        INDEX idx_signature_type (signature_type),
        INDEX idx_recent_contracts (signed_at DESC),
        
        FOREIGN KEY (link_id) REFERENCES secure_links(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'create_audit_logs_table',
    description: 'Création de la table des logs d\'audit',
    sql: `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        link_id VARCHAR(32),
        action VARCHAR(100) NOT NULL,
        details JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_link_id (link_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at),
        INDEX idx_recent_logs (created_at DESC),
        INDEX idx_ip_address (ip_address)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'add_email_tracking_table',
    description: 'Création de la table pour tracker les emails envoyés',
    sql: `
      CREATE TABLE IF NOT EXISTS email_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        link_id VARCHAR(32) NOT NULL,
        email_to VARCHAR(255) NOT NULL,
        subject VARCHAR(500) NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        delivery_status ENUM('sent', 'delivered', 'failed', 'bounced') DEFAULT 'sent',
        provider VARCHAR(50) DEFAULT 'nodemailer',
        message_id VARCHAR(255),
        
        INDEX idx_link_id (link_id),
        INDEX idx_email_to (email_to),
        INDEX idx_sent_at (sent_at),
        INDEX idx_delivery_status (delivery_status),
        
        FOREIGN KEY (link_id) REFERENCES secure_links(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'add_system_stats_table',
    description: 'Création de la table pour les statistiques système',
    sql: `
      CREATE TABLE IF NOT EXISTS system_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        stat_date DATE NOT NULL,
        total_links INT DEFAULT 0,
        active_links INT DEFAULT 0,
        used_links INT DEFAULT 0,
        expired_links INT DEFAULT 0,
        signed_contracts INT DEFAULT 0,
        emails_sent INT DEFAULT 0,
        unique_visitors INT DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        UNIQUE KEY unique_date (stat_date),
        INDEX idx_stat_date (stat_date),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'add_user_sessions_table',
    description: 'Création de la table pour tracker les sessions utilisateurs',
    sql: `
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL,
        link_id VARCHAR(32),
        ip_address VARCHAR(45),
        user_agent TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed BOOLEAN DEFAULT FALSE,
        step_reached ENUM('otp', 'preview', 'sign', 'complete') DEFAULT 'otp',
        
        INDEX idx_session_id (session_id),
        INDEX idx_link_id (link_id),
        INDEX idx_started_at (started_at),
        INDEX idx_completed (completed),
        INDEX idx_step_reached (step_reached)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'create_performance_views',
    description: 'Création des vues pour les performances et statistiques',
    sql: `
      CREATE OR REPLACE VIEW contract_performance AS
      SELECT 
        DATE(sl.created_at) as date,
        COUNT(sl.id) as links_created,
        COUNT(sc.id) as contracts_signed,
        ROUND(COUNT(sc.id) / COUNT(sl.id) * 100, 2) as conversion_rate,
        AVG(TIMESTAMPDIFF(MINUTE, sl.created_at, sc.signed_at)) as avg_completion_time_minutes
      FROM secure_links sl
      LEFT JOIN signed_contracts sc ON sl.id = sc.link_id
      WHERE sl.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(sl.created_at)
      ORDER BY date DESC;
    `
  },
  {
    name: 'create_active_links_view',
    description: 'Vue pour les liens actifs',
    sql: `
      CREATE OR REPLACE VIEW active_links AS
      SELECT 
        sl.*,
        CASE 
          WHEN sl.used = TRUE THEN 'used'
          WHEN sl.expires_at < NOW() THEN 'expired'
          ELSE 'active'
        END as status,
        sc.interpreter_name,
        sc.signed_at
      FROM secure_links sl
      LEFT JOIN signed_contracts sc ON sl.id = sc.link_id
      WHERE sl.expires_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY sl.created_at DESC;
    `
  },
  {
    name: 'create_cleanup_log_table',
    description: 'Création d\'une table pour tracker les nettoyages',
    sql: `
      CREATE TABLE IF NOT EXISTS cleanup_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cleanup_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_links INT DEFAULT 0,
        deleted_logs INT DEFAULT 0,
        deleted_sessions INT DEFAULT 0,
        status ENUM('success', 'partial', 'failed') DEFAULT 'success'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `
  },
  {
    name: 'insert_initial_audit_log',
    description: 'Insertion d\'un log d\'audit initial',
    sql: `
      INSERT IGNORE INTO audit_logs (action, details) 
      VALUES ('DATABASE_MIGRATION_COMPLETED', JSON_OBJECT(
        'migration_date', NOW(),
        'version', '1.0.0',
        'tables_created', JSON_ARRAY('secure_links', 'signed_contracts', 'audit_logs', 'email_tracking', 'system_stats', 'user_sessions'),
        'views_created', JSON_ARRAY('contract_performance', 'active_links'),
        'mysql_version', @@version
      ));
    `
  }
]

// Fonction pour vérifier si un index existe
async function indexExists(connection: mysql.Connection, tableName: string, indexName: string): Promise<boolean> {
  try {
    const [rows] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
      AND table_name = ? 
      AND index_name = ?
    `, [tableName, indexName])
    
    return (rows as any)[0].count > 0
  } catch (error) {
    return false
  }
}

// Fonction pour ajouter des index de façon sécurisée
async function addIndexSafely(connection: mysql.Connection, tableName: string, indexName: string, columns: string) {
  const exists = await indexExists(connection, tableName, indexName)
  
  if (!exists) {
    try {
      await connection.execute(`ALTER TABLE ${tableName} ADD INDEX ${indexName} (${columns})`)
      console.log(`  ✅ Index ${indexName} ajouté à ${tableName}`)
    } catch (error) {
      console.log(`  ⚠️ Impossible d'ajouter l'index ${indexName}: ${error.message}`)
    }
  } else {
    console.log(`  ⏭️ Index ${indexName} existe déjà sur ${tableName}`)
  }
}

async function runMigrations() {
  let connection: mysql.Connection | null = null
  
  try {
    console.log('🔗 Connexion à MySQL...')
    console.log(`📍 URL: ${MYSQL_URL.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`)
    
    // Connexion à MySQL
    connection = await mysql.createConnection(MYSQL_URL)
    
    console.log('✅ Connexion réussie à MySQL')
    
    // Vérifier la version de MySQL
    const [rows] = await connection.execute('SELECT VERSION() as version')
    const version = (rows as any)[0].version
    console.log(`📊 Version MySQL: ${version}`)
    
    // Créer une table pour tracker les migrations
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `)
    
    // Vérifier quelles migrations ont déjà été exécutées
    const [executedMigrations] = await connection.execute('SELECT name FROM migrations')
    const executedNames = (executedMigrations as any[]).map(row => row.name)
    
    console.log(`📋 ${executedNames.length} migrations déjà exécutées`)
    
    // Exécuter chaque migration si pas déjà fait
    let newMigrations = 0
    for (const migration of migrations) {
      if (executedNames.includes(migration.name)) {
        console.log(`⏭️  Migration ${migration.name} déjà exécutée, ignorée`)
        continue
      }
      
      console.log(`\n🔧 Exécution de la migration: ${migration.name}`)
      console.log(`📝 ${migration.description}`)
      
      try {
        await connection.execute(migration.sql)
        
        // Marquer la migration comme exécutée
        await connection.execute(
          'INSERT INTO migrations (name) VALUES (?)', 
          [migration.name]
        )
        
        console.log(`✅ Migration ${migration.name} terminée avec succès`)
        newMigrations++
      } catch (error) {
        console.error(`❌ Erreur lors de la migration ${migration.name}:`, error)
        throw error
      }
    }
    
    // Ajouter les index supplémentaires de façon sécurisée
    console.log('\n🔍 Ajout des index de performance...')
    
    // Index pour secure_links
    await addIndexSafely(connection, 'secure_links', 'idx_email_status', 'email, used, expires_at')
    await addIndexSafely(connection, 'secure_links', 'idx_created_used', 'created_at, used')
    
    // Index pour signed_contracts  
    await addIndexSafely(connection, 'signed_contracts', 'idx_signed_period', 'signed_at, signature_type')
    
    // Index pour audit_logs
    await addIndexSafely(connection, 'audit_logs', 'idx_action_date', 'action, created_at')
    await addIndexSafely(connection, 'audit_logs', 'idx_link_action', 'link_id, action')
    
    // Index pour email_tracking
    await addIndexSafely(connection, 'email_tracking', 'idx_email_status', 'email_to, delivery_status')
    await addIndexSafely(connection, 'email_tracking', 'idx_sent_status', 'sent_at, delivery_status')
    
    console.log(`\n🎯 ${newMigrations} nouvelles migrations exécutées`)
    
    // Vérifier que les tables ont été créées
    console.log('\n📋 Vérification des tables créées...')
    const [tables] = await connection.execute('SHOW TABLES')
    console.log('📊 Tables disponibles:')
    ;(tables as any[]).forEach((table, index) => {
      const tableName = Object.values(table)[0]
      console.log(`  ${index + 1}. ${tableName}`)
    })
    
    // Vérifier les vues
    console.log('\n📋 Vérification des vues créées...')
    const [views] = await connection.execute("SHOW FULL TABLES WHERE TABLE_TYPE LIKE 'VIEW'")
    if ((views as any[]).length > 0) {
      console.log('👁️  Vues disponibles:')
      ;(views as any[]).forEach((view, index) => {
        const viewName = Object.values(view)[0]
        console.log(`  ${index + 1}. ${viewName}`)
      })
    }
    
    // Afficher les index sur les tables principales
    console.log('\n📋 Index sur les tables principales:')
    const mainTables = ['secure_links', 'signed_contracts', 'audit_logs']
    for (const tableName of mainTables) {
      try {
        const [indexes] = await connection.execute(`SHOW INDEX FROM ${tableName}`)
        const indexNames = [...new Set((indexes as any[]).map(idx => idx.Key_name))]
        console.log(`  📊 ${tableName}: ${indexNames.length} index (${indexNames.join(', ')})`)
      } catch (error) {
        console.log(`  ⚠️ ${tableName}: impossible de lister les index`)
      }
    }
    
    console.log('\n🎉 Migration terminée avec succès!')
    console.log('🚀 Votre base de données est prête pour CGSD Logistics')
    console.log('\n📋 Prochaines étapes:')
    console.log('  1. Démarrez votre application Next.js')
    console.log('  2. Accédez au dashboard pour migrer les données existantes')
    console.log('  3. Testez l\'envoi d\'emails et la signature de contrats')
    
  } catch (error) {
    console.error('\n💥 Erreur durant la migration:', error)
    
    if (error.code === 'ENOTFOUND') {
      console.error('🔍 Vérifiez que:')
      console.error('  - Le serveur MySQL est démarré')
      console.error('  - L\'adresse du serveur est correcte')
      console.error('  - Le port est ouvert')
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('🔐 Erreur d\'authentification:')
      console.error('  - Vérifiez le nom d\'utilisateur et mot de passe')
      console.error('  - Assurez-vous que l\'utilisateur a les permissions CREATE')
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('🗄️ Base de données non trouvée:')
      console.error('  - Créez d\'abord la base de données')
      console.error('  - Ou retirez le nom de la DB de l\'URL pour la créer automatiquement')
    }
    
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('🔌 Connexion fermée')
    }
  }
}

// Fonction pour créer la base de données si elle n'existe pas
async function createDatabaseIfNotExists() {
  const url = new URL(MYSQL_URL)
  const dbName = url.pathname.slice(1) // Enlever le '/' du début
  
  if (!dbName) {
    console.log('⚠️ Pas de nom de base de données dans l\'URL')
    return
  }
  
  // URL sans le nom de la base de données
  const connectionUrl = `${url.protocol}//${url.username}:${url.password}@${url.host}`
  
  let connection: mysql.Connection | null = null
  
  try {
    console.log(`🗄️ Vérification de l'existence de la base de données '${dbName}'...`)
    connection = await mysql.createConnection(connectionUrl)
    
    await connection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    console.log(`✅ Base de données '${dbName}' prête`)
    
  } catch (error) {
    console.error('💥 Erreur lors de la création de la base de données:', error)
    throw error
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// Fonction pour afficher les statistiques après migration
async function showPostMigrationStats() {
  let connection: mysql.Connection | null = null
  
  try {
    connection = await mysql.createConnection(MYSQL_URL)
    
    console.log('\n📊 Statistiques post-migration:')
    
    // Compter les enregistrements dans chaque table
    const tables = ['secure_links', 'signed_contracts', 'audit_logs', 'email_tracking', 'system_stats', 'user_sessions', 'migrations', 'cleanup_log']
    
    for (const table of tables) {
      try {
        const [result] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`)
        const count = (result as any)[0].count
        console.log(`  📋 ${table}: ${count} enregistrements`)
      } catch (error) {
        console.log(`  ⚠️ ${table}: table non accessible`)
      }
    }
    
  } catch (error) {
    console.log('⚠️ Impossible d\'afficher les statistiques post-migration')
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// Fonction pour effectuer un nettoyage manuel (remplace les procédures stockées)
async function performCleanup() {
  let connection: mysql.Connection | null = null
  
  try {
    connection = await mysql.createConnection(MYSQL_URL)
    
    console.log('🧹 Démarrage du nettoyage de la base de données...')
    
    // Supprimer les liens expirés et utilisés (plus de 30 jours)
    const [linksResult] = await connection.execute(`
      DELETE FROM secure_links 
      WHERE (expires_at < NOW() OR used = TRUE) 
      AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `)
    const deletedLinks = (linksResult as any).affectedRows
    
    // Supprimer les logs d'audit anciens (plus de 90 jours)
    const [logsResult] = await connection.execute(`
      DELETE FROM audit_logs 
      WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
    `)
    const deletedLogs = (logsResult as any).affectedRows
    
    // Supprimer les sessions anciennes (plus de 7 jours)
    const [sessionsResult] = await connection.execute(`
      DELETE FROM user_sessions 
      WHERE started_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `)
    const deletedSessions = (sessionsResult as any).affectedRows
    
    // Logger l'opération de nettoyage
    await connection.execute(`
      INSERT INTO cleanup_log (deleted_links, deleted_logs, deleted_sessions, status) 
      VALUES (?, ?, ?, 'success')
    `, [deletedLinks, deletedLogs, deletedSessions])
    
    await connection.execute(`
      INSERT INTO audit_logs (action, details) 
      VALUES ('MANUAL_CLEANUP', JSON_OBJECT(
        'deleted_links', ?,
        'deleted_logs', ?, 
        'deleted_sessions', ?,
        'cleanup_date', NOW()
      ))
    `, [deletedLinks, deletedLogs, deletedSessions])
    
    console.log(`✅ Nettoyage terminé:`)
    console.log(`  📋 Liens supprimés: ${deletedLinks}`)
    console.log(`  📋 Logs supprimés: ${deletedLogs}`)
    console.log(`  📋 Sessions supprimées: ${deletedSessions}`)
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// Fonction principale
async function main() {
  console.log('🚀 CGSD Logistics - Migration MySQL Finale')
  console.log('==========================================\n')
  
  try {
    // Créer la base de données si nécessaire
    await createDatabaseIfNotExists()
    
    // Exécuter les migrations
    await runMigrations()
    
    // Afficher les statistiques
    await showPostMigrationStats()
    
  } catch (error) {
    console.error('💥 Échec de la migration:', error)
    process.exit(1)
  }
}

// Exécuter si le script est appelé directement
if (require.main === module) {
  main()
}

export { runMigrations, createDatabaseIfNotExists, showPostMigrationStats, performCleanup }