"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Mail, Link, Clock, Send, Copy, Download, FileText, Users, 
  TrendingUp, Calendar, Search, Filter, RefreshCw, Eye,
  AlertCircle, CheckCircle, XCircle, Activity, Database,
  Loader2, ArrowRight, Shield
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Interfaces
interface SecureLink {
  id: string
  email: string
  otp: string
  expires_at: string
  used: boolean
  created_at: string
}

interface SignedContract {
  id: number
  link_id: string
  interpreter_name: string
  signature_type: 'text' | 'upload' | 'draw'
  signed_at: string
  email?: string
}

interface AuditLog {
  id: number
  link_id?: string
  action: string
  details: any
  ip_address?: string
  created_at: string
}

interface Stats {
  totalLinks: number
  activeLinks: number
  signedContracts: number
  todayActivity: number
  signatureTypes: Record<string, number>
}

interface MigrationStatus {
  memory: { count: number; hasData: boolean }
  mysql: { count: number; hasData: boolean }
  needsMigration: boolean
}

export default function FinalDashboard() {
  // States pour les données
  const [stats, setStats] = useState<Stats>({
    totalLinks: 0,
    activeLinks: 0,
    signedContracts: 0,
    todayActivity: 0,
    signatureTypes: {}
  })
  const [secureLinks, setSecureLinks] = useState<SecureLink[]>([])
  const [signedContracts, setSignedContracts] = useState<SignedContract[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  
  // States pour les formulaires
  const [interpreterEmail, setInterpreterEmail] = useState('')
  const [emailSubject, setEmailSubject] = useState('Contract Signature Required - CGSD Logistics')
  const [emailMessage, setEmailMessage] = useState(
    'Dear Interpreter,\\n\\nPlease use the secure link below to access and sign your contract. You will need the OTP code provided to access the document.\\n\\nThank you,\\nCGSD Logistics Team'
  )
  const [isLoading, setIsLoading] = useState(false)
  
  // States pour la recherche et filtres
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'used'>('all')
  
  // States pour la migration
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null)
  const [isMigrating, setIsMigrating] = useState(false)
  
  const { toast } = useToast()

  // Charger toutes les données au démarrage
  useEffect(() => {
    loadDashboardData()
    checkMigrationStatus()
  }, [])

  const checkMigrationStatus = async () => {
    try {
      const response = await fetch('/api/migrate-to-mysql')
      if (response.ok) {
        const data = await response.json()
        setMigrationStatus(data)
      }
    } catch (error) {
      console.warn('Could not check migration status:', error)
    }
  }

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Charger toutes les données depuis les APIs MySQL
      const [statsRes, linksRes, contractsRes, logsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/secure-links'),
        fetch('/api/dashboard/signed-contracts'),
        fetch('/api/dashboard/audit-logs')
      ])

      // Traiter les réponses individuellement pour isoler les erreurs
      let statsData = { totalLinks: 0, activeLinks: 0, signedContracts: 0, todayActivity: 0, signatureTypes: {} }
      let linksData = []
      let contractsData = []
      let logsData = []

      if (statsRes.ok) {
        statsData = await statsRes.json()
      } else {
        console.warn('Failed to load stats:', await statsRes.text())
      }

      if (linksRes.ok) {
        linksData = await linksRes.json()
      } else {
        console.warn('Failed to load links:', await linksRes.text())
      }

      if (contractsRes.ok) {
        contractsData = await contractsRes.json()
      } else {
        console.warn('Failed to load contracts:', await contractsRes.text())
      }

      if (logsRes.ok) {
        logsData = await logsRes.json()
      } else {
        console.warn('Failed to load audit logs:', await logsRes.text())
      }

      setStats(statsData)
      setSecureLinks(linksData)
      setSignedContracts(contractsData)
      setAuditLogs(logsData)

      console.log('✅ Dashboard data loaded successfully')
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error)
      
      // Fallback vers des données vides si les APIs échouent
      const fallbackStats: Stats = {
        totalLinks: 0,
        activeLinks: 0,
        signedContracts: 0,
        todayActivity: 0,
        signatureTypes: {}
      }

      setStats(fallbackStats)
      setSecureLinks([])
      setSignedContracts([])
      setAuditLogs([])

      toast({
        title: 'Warning',
        description: 'Failed to load dashboard data. Please check your database connection.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const performMigration = async () => {
    const adminKey = prompt('Enter admin key to proceed with migration:')
    if (!adminKey) return

    setIsMigrating(true)
    try {
      const response = await fetch('/api/migrate-to-mysql', {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Migration completed',
          description: `Successfully migrated ${data.migratedCount} links to MySQL database`,
        })
        
        // Recharger les données et le statut de migration
        await Promise.all([
          loadDashboardData(),
          checkMigrationStatus()
        ])
      } else {
        throw new Error(data.error || 'Migration failed')
      }
    } catch (error) {
      console.error('Migration error:', error)
      toast({
        title: 'Migration failed',
        description: error.message || 'Failed to migrate data to MySQL',
        variant: 'destructive'
      })
    } finally {
      setIsMigrating(false)
    }
  }

  const sendEmailWithLink = async () => {
    if (!interpreterEmail) {
      toast({
        title: 'Email required',
        description: 'Please enter an interpreter email address.',
        variant: 'destructive'
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/send-contract-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: interpreterEmail,
          subject: emailSubject,
          message: emailMessage,
          expiresIn: 24
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Email sent successfully',
          description: `Contract email sent to ${interpreterEmail}`
        })
        setInterpreterEmail('')
        // Recharger les données
        loadDashboardData()
      } else {
        throw new Error('Failed to send email')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send email. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const downloadPDF = async (linkId: string) => {
    try {
      const response = await fetch(`/api/download-contract-pdf?linkId=${linkId}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `contract-${linkId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast({
          title: 'PDF Downloaded',
          description: 'Contract PDF downloaded successfully'
        })
      } else {
        throw new Error('Download failed')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download PDF',
        variant: 'destructive'
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copied to clipboard',
      description: 'Text copied successfully.'
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date()
  }

  const getStatusBadge = (link: SecureLink) => {
    if (link.used) {
      return <Badge className="bg-blue-100 text-blue-800 border-0">Used</Badge>
    }
    if (isExpired(link.expires_at)) {
      return <Badge variant="destructive">Expired</Badge>
    }
    return <Badge className="bg-green-100 text-green-800 border-0">Active</Badge>
  }

  const getSignatureTypeBadge = (type: string) => {
    const colors = {
      text: 'bg-blue-100 text-blue-800',
      draw: 'bg-green-100 text-green-800',
      upload: 'bg-purple-100 text-purple-800'
    }
    
    const labels = {
      text: 'Typed',
      draw: 'Drawn',
      upload: 'Image'
    }

    return (
      <Badge className={`${colors[type as keyof typeof colors]} border-0`}>
        {labels[type as keyof typeof labels]}
      </Badge>
    )
  }

  const filteredLinks = secureLinks.filter(link => {
    const matchesSearch = link.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         link.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'active' && !link.used && !isExpired(link.expires_at)) ||
                         (filterStatus === 'expired' && isExpired(link.expires_at)) ||
                         (filterStatus === 'used' && link.used)
    
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">CGSD Logistics Dashboard</h1>
            <p className="text-gray-600">Comprehensive contract management system</p>
          </div>
          <div className="flex items-center gap-2">
            {migrationStatus?.needsMigration && (
              <Badge variant="destructive" className="animate-pulse">
                Migration Required
              </Badge>
            )}
            <Button onClick={loadDashboardData} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Migration Alert */}
        {migrationStatus?.needsMigration && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="w-8 h-8 text-orange-600" />
                  <div>
                    <h3 className="font-semibold text-orange-900">Data Migration Required</h3>
                    <p className="text-orange-700 text-sm">
                      {migrationStatus.memory.count} links found in memory storage. 
                      Migrate to MySQL for better persistence and dashboard integration.
                    </p>
                  </div>
                </div>
                <Button 
                  onClick={performMigration}
                  disabled={isMigrating}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isMigrating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Migrating...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Migrate Now
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Links</CardTitle>
              <Link className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.totalLinks}</div>
              <p className="text-xs text-muted-foreground">All time generated</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Links</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeLinks}</div>
              <p className="text-xs text-muted-foreground">Currently valid</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Signed Contracts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.signedContracts}</div>
              <p className="text-xs text-muted-foreground">Completed signatures</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Activity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.todayActivity}</div>
              <p className="text-xs text-muted-foreground">Actions today</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="send-email" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-6">
            <TabsTrigger value="send-email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Send Email
            </TabsTrigger>
            <TabsTrigger value="secure-links" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Secure Links
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Contracts
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Audit Logs
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Admin
            </TabsTrigger>
          </TabsList>

          {/* Send Email Tab */}
          <TabsContent value="send-email">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-green-600" />
                    Send Contract Email
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="email-send">Interpreter Email</Label>
                    <Input
                      id="email-send"
                      type="email"
                      placeholder="interpreter@example.com"
                      value={interpreterEmail}
                      onChange={(e) => setInterpreterEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">Email Subject</Label>
                    <Input 
                      id="subject" 
                      value={emailSubject} 
                      onChange={(e) => setEmailSubject(e.target.value)} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="message">Email Message</Label>
                    <Textarea
                      id="message"
                      rows={6}
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={sendEmailWithLink}
                    disabled={!interpreterEmail || isLoading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isLoading ? 'Sending...' : 'Send Email with Secure Link'}
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Signature Types Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(stats.signatureTypes).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getSignatureTypeBadge(type)}
                          <span className="text-sm font-medium capitalize">{type}</span>
                        </div>
                        <span className="text-2xl font-bold">{count}</span>
                      </div>
                    ))}
                    
                    {Object.keys(stats.signatureTypes).length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No signatures yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Secure Links Tab */}
          <TabsContent value="secure-links">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5 text-green-600" />
                  Secure Links Management
                </CardTitle>
                <div className="flex gap-4 mt-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by email or link ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-3 py-2 border rounded-md"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="used">Used</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredLinks.map((link) => (
                    <div
                      key={link.id}
                      className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{link.email}</p>
                          <p className="text-sm text-gray-600">
                            Created: {formatDate(link.created_at)} | 
                            Expires: {formatDate(link.expires_at)}
                          </p>
                        </div>
                        {getStatusBadge(link)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">OTP:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                            {link.otp}
                          </code>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => copyToClipboard(link.otp)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Link:</span>
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono flex-1 truncate">
                            {`/contract/${link.id}`}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(`${window.location.origin}/contract/${link.id}`)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredLinks.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No links found matching your criteria
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Signed Contracts Tab */}
          <TabsContent value="contracts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Signed Contracts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {signedContracts.map((contract) => (
                    <div
                      key={contract.id}
                      className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {contract.interpreter_name}
                            </h3>
                            {getSignatureTypeBadge(contract.signature_type)}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Email: {contract.email}</div>
                            <div>Signed: {formatDate(contract.signed_at)}</div>
                            <div>Link ID: {contract.link_id}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadPDF(contract.link_id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {signedContracts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No signed contracts yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  Audit Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 border rounded-lg bg-white text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                          {log.link_id && (
                            <span className="text-gray-500 ml-2">({log.link_id})</span>
                          )}
                          {log.details && (
                            <div className="text-gray-600 mt-1 text-xs">
                              {typeof log.details === 'object' 
                                ? JSON.stringify(log.details, null, 2)
                                : log.details
                              }
                            </div>
                          )}
                        </div>
                        <div className="text-right text-gray-500 text-xs">
                          <div>{formatDate(log.created_at)}</div>
                          {log.ip_address && (
                            <div>{log.ip_address}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {auditLogs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No audit logs yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="stats">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats.totalLinks}</div>
                      <div className="text-sm text-gray-600">Total Links</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats.signedContracts}</div>
                      <div className="text-sm text-gray-600">Signed Contracts</div>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <h4 className="font-medium mb-2">Success Rate</h4>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${stats.totalLinks > 0 ? (stats.signedContracts / stats.totalLinks) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {stats.totalLinks > 0 ? Math.round((stats.signedContracts / stats.totalLinks) * 100) : 0}% completion rate
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {auditLogs.slice(0, 8).map((log) => (
                      <div key={log.id} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          log.action.includes('ERROR') || log.action.includes('FAILED') 
                            ? 'bg-red-500' 
                            : log.action.includes('SUCCESS') || log.action.includes('VERIFIED')
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {log.action.replace(/_/g, ' ').toLowerCase()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(log.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                    
                    {auditLogs.length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        No recent activity
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Admin Tab */}
          <TabsContent value="admin">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  System Administration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Migration Status */}
                {migrationStatus && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Migration Status</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong>Memory Storage:</strong>
                        <div className="text-gray-600">
                          {migrationStatus.memory.count} links
                          {migrationStatus.memory.hasData ? 
                            <Badge variant="destructive" className="ml-2">Needs Migration</Badge> :
                            <Badge className="bg-green-100 text-green-800 ml-2">Empty</Badge>
                          }
                        </div>
                      </div>
                      <div>
                        <strong>MySQL Database:</strong>
                        <div className="text-gray-600">
                          {migrationStatus.mysql.count} links
                          <Badge className="bg-blue-100 text-blue-800 ml-2">Active</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="space-y-3">
                  <h3 className="font-medium">Database Maintenance</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/dashboard/cleanup', { method: 'POST' })
                          const data = await response.json()
                          if (response.ok) {
                            toast({
                              title: 'Cleanup completed',
                              description: `Removed ${data.deletedLinks} old links and ${data.deletedLogs} old logs`
                            })
                            loadDashboardData()
                          } else {
                            throw new Error('Cleanup failed')
                          }
                        } catch (error) {
                          toast({
                            title: 'Error',
                            description: 'Failed to perform database cleanup',
                            variant: 'destructive'
                          })
                        }
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Clean Old Data
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/dashboard/cleanup-audit-logs', { method: 'POST' })
                          const data = await response.json()
                          if (response.ok) {
                            toast({
                              title: 'Audit logs cleaned',
                              description: `Fixed ${data.correctedCount} logs, deleted ${data.deletedCount} corrupted entries`
                            })
                            loadDashboardData()
                          } else {
                            throw new Error('Audit cleanup failed')
                          }
                        } catch (error) {
                          toast({
                            title: 'Error',
                            description: 'Failed to cleanup audit logs',
                            variant: 'destructive'
                          })
                        }
                      }}
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Fix Audit Logs
                    </Button>
                    
                    {migrationStatus?.needsMigration && (
                      <Button
                        onClick={performMigration}
                        disabled={isMigrating}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        {isMigrating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Migrating...
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4 mr-2" />
                            Migrate to MySQL
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      onClick={() => {
                        checkMigrationStatus()
                        loadDashboardData()
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh All Data
                    </Button>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    These tools help maintain database performance and data integrity.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}