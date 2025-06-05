// lib/mysql.ts
import mysql from 'mysql2/promise'

// URL de connexion MySQL
const MYSQL_URL = process.env.MYSQL_URL || process.env.DATABASE_URL

if (!MYSQL_URL) {
  throw new Error('MYSQL_URL ou DATABASE_URL doit être définie dans les variables d\'environnement')
}

// Pool de connexions avec URL
const pool = mysql.createPool(MYSQL_URL + '?charset=utf8mb4&timezone=Z')

// Fonction utilitaire pour exécuter des requêtes
export const query = async (sql: string, params?: any[]) => {
  try {
    const [results] = await pool.execute(sql, params)
    return results
  } catch (error) {
    console.error('MySQL Query Error:', error)
    console.error('SQL:', sql)
    console.error('Params:', params)
    throw error
  }
}

// Test de connexion
export const testConnection = async () => {
  try {
    await query('SELECT 1 as test')
    return true
  } catch (error) {
    console.error('MySQL Connection Test Failed:', error)
    return false
  }
}

// Classes pour les modèles de données
export class SecureLink {
  static async create(data: {
    id: string
    email: string
    otp: string
    expiresAt: Date
  }) {
    const sql = `
      INSERT INTO secure_links (id, email, otp, expires_at) 
      VALUES (?, ?, ?, ?)
    `
    await query(sql, [data.id, data.email, data.otp, data.expiresAt])
    return this.findById(data.id)
  }

  static async findById(id: string) {
    const sql = 'SELECT * FROM secure_links WHERE id = ?'
    const results = await query(sql, [id]) as any[]
    return results[0] || null
  }

  // ===== NOUVELLES MÉTHODES POUR LA MIGRATION =====
  static async findAll() {
    const sql = 'SELECT * FROM secure_links ORDER BY created_at DESC'
    const results = await query(sql) as any[]
    return results
  }

  static async findActive() {
    const sql = `
      SELECT * FROM secure_links 
      WHERE expires_at > NOW() AND used = FALSE 
      ORDER BY created_at DESC
    `
    const results = await query(sql) as any[]
    return results
  }

  static async deleteExpired() {
    const sql = 'DELETE FROM secure_links WHERE expires_at < NOW()'
    const result = await query(sql) as any
    return result.affectedRows
  }

  // ===== MÉTHODES EXISTANTES AMÉLIORÉES =====
  static async markAsUsed(id: string) {
    const sql = 'UPDATE secure_links SET used = TRUE, updated_at = NOW() WHERE id = ?'
    await query(sql, [id])
  }

  static async cleanup() {
    // Supprimer les liens expirés (plus de 48h après expiration)
    const sql = 'DELETE FROM secure_links WHERE expires_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)'
    const result = await query(sql) as any
    return result.affectedRows
  }

  static async getStats() {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN used = TRUE THEN 1 ELSE 0 END) as used,
        SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN expires_at > NOW() AND used = FALSE THEN 1 ELSE 0 END) as active
      FROM secure_links
    `
    const results = await query(sql) as any[]
    return results[0]
  }

  // ===== NOUVELLE MÉTHODE POUR VÉRIFIER L'EXISTENCE =====
  static async exists(id: string) {
    const sql = 'SELECT COUNT(*) as count FROM secure_links WHERE id = ?'
    const results = await query(sql, [id]) as any[]
    return results[0].count > 0
  }
}

export class SignedContract {
  static async create(data: {
    linkId: string
    interpreterName: string
    signatureType: 'text' | 'upload' | 'draw'
    signatureData: string
    pdfContent: string
  }) {
    const sql = `
      INSERT INTO signed_contracts 
      (link_id, interpreter_name, signature_type, signature_data, pdf_content) 
      VALUES (?, ?, ?, ?, ?)
    `
    await query(sql, [
      data.linkId,
      data.interpreterName, 
      data.signatureType,
      data.signatureData,
      data.pdfContent
    ])

    // Retourner le contrat créé
    return this.findByLinkId(data.linkId)
  }

  static async findByLinkId(linkId: string) {
    const sql = 'SELECT * FROM signed_contracts WHERE link_id = ?'
    const results = await query(sql, [linkId]) as any[]
    return results[0] || null
  }

  static async findById(id: number) {
    const sql = 'SELECT * FROM signed_contracts WHERE id = ?'
    const results = await query(sql, [id]) as any[]
    return results[0] || null
  }

  static async getAllSigned(limit = 50, offset = 0) {
    const sql = `
      SELECT 
        sc.*,
        sl.email,
        sl.created_at as link_created,
        sl.expires_at as link_expires
      FROM signed_contracts sc
      JOIN secure_links sl ON sc.link_id = sl.id
      ORDER BY sc.signed_at DESC
      LIMIT ? OFFSET ?
    `
    return await query(sql, [limit, offset]) as any[]
  }

  static async getStats() {
    // Statistiques générales
    const generalStats = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN DATE(signed_at) = CURDATE() THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN signed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as this_week,
        SUM(CASE WHEN signed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as this_month
      FROM signed_contracts
    `) as any[]

    // Statistiques par type de signature
    const typeStats = await query(`
      SELECT 
        signature_type,
        COUNT(*) as count
      FROM signed_contracts
      GROUP BY signature_type
    `) as any[]

    return {
      general: generalStats[0],
      byType: typeStats
    }
  }

  // ===== NOUVELLE MÉTHODE POUR VÉRIFIER SI DÉJÀ SIGNÉ =====
  static async isAlreadySigned(linkId: string) {
    const sql = 'SELECT COUNT(*) as count FROM signed_contracts WHERE link_id = ?'
    const results = await query(sql, [linkId]) as any[]
    return results[0].count > 0
  }
}

// ===== CLASSE AUDITLOG CORRIGÉE =====
export class AuditLog {
  static async create(data: {
    linkId?: string
    action: string
    details?: any
    ipAddress?: string
    userAgent?: string
  }) {
    // Corriger la sérialisation des détails
    let detailsString = null
    
    if (data.details !== null && data.details !== undefined) {
      try {
        if (typeof data.details === 'object') {
          detailsString = JSON.stringify(data.details)
        } else if (typeof data.details === 'string') {
          detailsString = data.details
        } else {
          detailsString = String(data.details)
        }
      } catch (error) {
        console.warn('Failed to serialize audit log details:', error)
        detailsString = String(data.details)
      }
    }

    const sql = `
      INSERT INTO audit_logs (link_id, action, details, ip_address, user_agent) 
      VALUES (?, ?, ?, ?, ?)
    `
    
    try {
      await query(sql, [
        data.linkId || null,
        data.action,
        detailsString,
        data.ipAddress || null,
        data.userAgent || null
      ])
    } catch (error) {
      console.error('Error creating audit log:', error)
      // Ne pas faire échouer l'opération principale si le log échoue
    }
  }

  // ===== NOUVELLES MÉTHODES POUR LES AUDIT LOGS =====
  static async findAll(limit = 100, offset = 0) {
    const sql = `
      SELECT id, link_id, action, details, ip_address, user_agent, created_at
      FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `
    const results = await query(sql, [limit, offset]) as any[]
    
    // Parser les détails JSON avec gestion d'erreur
    return results.map(log => {
      let parsedDetails = null
      
      if (log.details) {
        try {
          if (typeof log.details === 'object') {
            parsedDetails = log.details
          } else if (typeof log.details === 'string') {
            if (log.details.startsWith('{') || log.details.startsWith('[')) {
              parsedDetails = JSON.parse(log.details)
            } else if (log.details !== '[object Object]') {
              parsedDetails = { message: log.details }
            } else {
              parsedDetails = null
            }
          }
        } catch (error) {
          console.warn(`Failed to parse details for log ${log.id}:`, log.details)
          parsedDetails = { raw: log.details, parseError: true }
        }
      }

      return {
        ...log,
        details: parsedDetails
      }
    })
  }

  static async deleteCorrupted() {
    const sql = `
      DELETE FROM audit_logs 
      WHERE details = '[object Object]' 
         OR details LIKE '%[object Object]%'
    `
    const result = await query(sql) as any
    return result.affectedRows
  }

  static async fixCorrupted() {
    const sql = `
      UPDATE audit_logs 
      SET details = NULL 
      WHERE details IS NOT NULL 
        AND details != '' 
        AND details NOT LIKE '{%' 
        AND details NOT LIKE '[%'
        AND details != '[object Object]'
    `
    const result = await query(sql) as any
    return result.affectedRows
  }

  static async getStats() {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END) as today,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as this_week,
        COUNT(DISTINCT action) as unique_actions,
        COUNT(DISTINCT link_id) as unique_links
      FROM audit_logs
    `
    const results = await query(sql) as any[]
    return results[0]
  }
}

// ===== FONCTIONS UTILITAIRES AMÉLIORÉES =====
export const healthCheck = async () => {
  try {
    const [connectionTest, linkStats, contractStats, auditStats] = await Promise.all([
      testConnection(),
      SecureLink.getStats().catch(() => ({ total: 0, active: 0, used: 0, expired: 0, today: 0 })),
      SignedContract.getStats().catch(() => ({ general: { total: 0, today: 0, this_week: 0 }, byType: [] })),
      AuditLog.getStats().catch(() => ({ total: 0, today: 0, this_week: 0, unique_actions: 0, unique_links: 0 }))
    ])

    return {
      mysql_connected: connectionTest,
      stats: {
        secure_links: linkStats,
        signed_contracts: contractStats,
        audit_logs: auditStats
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      mysql_connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

// ===== NOUVELLE FONCTION POUR LA MIGRATION =====
export const migrationUtils = {
  async checkMemoryData() {
    // Vérifier s'il y a des données en mémoire
    if (typeof global !== 'undefined' && global.secureLinks) {
      return {
        hasMemoryData: global.secureLinks.size > 0,
        memoryCount: global.secureLinks.size,
        memoryLinks: Array.from(global.secureLinks.entries())
      }
    }
    return {
      hasMemoryData: false,
      memoryCount: 0,
      memoryLinks: []
    }
  },

  async getMigrationStatus() {
    const memoryData = await this.checkMemoryData()
    const mysqlLinks = await SecureLink.findAll()
    
    return {
      memory: {
        count: memoryData.memoryCount,
        hasData: memoryData.hasMemoryData
      },
      mysql: {
        count: mysqlLinks.length,
        hasData: mysqlLinks.length > 0
      },
      needsMigration: memoryData.hasMemoryData
    }
  }
}

export default pool