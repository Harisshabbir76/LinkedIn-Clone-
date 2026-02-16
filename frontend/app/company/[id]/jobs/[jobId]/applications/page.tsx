'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import axios from 'axios'
import { useAuth } from '../../../../../../context/AuthContext'
import { format } from 'date-fns'
import { toast, Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion'
import * as Fi from 'react-icons/fi'

// Bootstrap Components
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Form,
  InputGroup,
  Spinner,
  Image,
  Table,
  Modal,
  Alert,
  ProgressBar,
  FormCheck
} from 'react-bootstrap'

interface Application {
  _id: string
  name: string
  email: string
  phone?: string
  location?: string
  resume: string
  coverLetter: string
  portfolio?: string
  linkedin?: string
  portfolioLinks?: Array<{
    _id: string
    title: string
    url: string
    type: string
    description?: string
  }>
  status: 'pending' | 'reviewed' | 'shortlisted' | 'interview' | 'accepted' | 'rejected' | 'withdrawn'
  appliedAt: string
  viewedAt?: string
  notes: Array<{
    _id: string
    note: string
    addedBy: {
      _id: string
      name: string
      email: string
    }
    addedAt: string
  }>
  timeline: Array<{
    _id: string
    action: string
    notes: string
    date: string
    performedBy: {
      _id: string
      name: string
      email: string
    }
  }>
  applicant?: {
    _id: string
    name: string
    email: string
    profileImage?: string
    phone?: string
    location?: string
    skills?: Array<{
      name: string
      proficiency: string
    }>
    education?: Array<{
      institution: string
      degree: string
      fieldOfStudy?: string
    }>
    experience?: Array<{
      title: string
      company: string
    }>
  }
}

interface Job {
  _id: string
  title: string
  location: string
  employmentType: string
  company: {
    _id: string
    name: string
    logo?: string
  }
}

interface Stats {
  total: number
  viewed: number
  viewRate: number
  byStatus: {
    [key: string]: {
      count: number
    }
  }
}

interface Company {
  _id: string
  name: string
  owner: string
  teamMembers: Array<{
    user: {
      _id: string
      name: string
      email: string
    }
    role: 'admin' | 'recruiter' | 'manager' | 'hr' | 'member'
    permissions: string[]
  }>
}

export default function JobApplicationsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  
  const [applications, setApplications] = useState<Application[]>([])
  const [job, setJob] = useState<Job | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyLoading, setCompanyLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [accessChecked, setAccessChecked] = useState(false)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('appliedAt')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [showWithdrawn, setShowWithdrawn] = useState(false) // Toggle for showing withdrawn applications
  
  // Modals
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  
  // Selected application
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)

  const companyId = params.id as string
  const jobId = params.jobId as string

  // Helper function to get image URL
  const getImageUrl = (imagePath: string | undefined | null) => {
    if (!imagePath) return ''
    if (imagePath.startsWith('http')) return imagePath
    return `http://localhost:5000/${imagePath.replace(/\\/g, '/')}`
  }

  // Helper function to get resume URL
  const getResumeUrl = (resumePath: string) => {
    if (resumePath.startsWith('http')) return resumePath
    return `http://localhost:5000/${resumePath.replace(/\\/g, '/')}`
  }

  // Check if user is authorized to view applications
  const checkUserAuthorization = (companyData: Company, userId: string): boolean => {
    if (String(companyData.owner) === String(userId)) return true
    
    const isTeamMember = companyData.teamMembers?.some((member: any) => {
      if (!member || !member.user) return false
      if (String(member.user._id) === String(userId)) {
        const allowedRoles = ['admin', 'recruiter', 'manager', 'hr']
        return allowedRoles.includes(member.role)
      }
      return false
    })
    
    return isTeamMember || false
  }

  // Download resume function
  const downloadResume = async (applicationId: string, applicantName: string) => {
    try {
      setDownloading(applicationId)
      const token = localStorage.getItem('token')
      
      if (!token) {
        toast.error('Authentication required')
        return
      }
      
      const response = await fetch(`http://localhost:5000/api/applications/download/resume/${applicationId}`, {
        headers: { 'Authorization': token }
      })
      
      if (!response.ok) throw new Error(`Failed to download resume: ${response.statusText}`)
      
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = blobUrl
      
      const contentDisposition = response.headers.get('content-disposition')
      let fileName = `${applicantName.replace(/\s+/g, '_')}_resume.pdf`
      
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition)
        if (matches != null && matches[1]) {
          fileName = matches[1].replace(/['"]/g, '')
        }
      }
      
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
      
      toast.success('Resume downloaded successfully')
    } catch (error: any) {
      console.error('Error downloading resume:', error)
      toast.error(error.message || 'Failed to download resume')
    } finally {
      setDownloading(null)
    }
  }

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'reviewed': return 'info'
      case 'shortlisted': return 'success'
      case 'interview': return 'primary'
      case 'accepted': return 'success'
      case 'rejected': return 'danger'
      case 'withdrawn': return 'secondary'
      default: return 'secondary'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Fi.FiClock size={14} />
      case 'reviewed': return <Fi.FiEye size={14} />
      case 'shortlisted': return <Fi.FiStar size={14} />
      case 'interview': return <Fi.FiBriefcase size={14} />
      case 'accepted': return <Fi.FiCheckCircle size={14} />
      case 'rejected': return <Fi.FiXCircle size={14} />
      case 'withdrawn': return <Fi.FiX size={14} />
      default: return null
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'MMM dd, yyyy')
    } catch (error) {
      return 'Invalid date'
    }
  }

  // Format time
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'hh:mm a')
    } catch (error) {
      return 'Invalid time'
    }
  }

  // Format datetime
  const formatDateTime = (dateString: string) => {
    return `${formatDate(dateString)} at ${formatTime(dateString)}`
  }

  // Helper function to get user's role in company
  const getUserRoleInCompany = () => {
    if (!company || !user) return '';
    
    // First check if user is owner
    if (String(company.owner) === String(user._id)) {
      return 'Owner';
    }
    
    // Check if user is a team member
    const teamMember = company.teamMembers?.find(member => 
      String(member.user?._id || member.user) === String(user._id)
    );
    
    if (teamMember) {
      return teamMember.role.charAt(0).toUpperCase() + teamMember.role.slice(1);
    }
    
    return 'Not a member';
  };

  // Fetch applications with search functionality
  const fetchApplications = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      
      let url = `http://localhost:5000/api/applications/company/${companyId}?jobId=${jobId}&limit=100&populate=applicant`
      
      // Add showWithdrawn parameter to backend
      if (showWithdrawn) {
        url += `&showWithdrawn=true`
      }
      
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`
      } else {
        // When showing "all", backend should exclude withdrawn by default (unless showWithdrawn is true)
        url += '&status=all'
      }
      
      if (searchTerm && searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`
      }

      console.log('Fetching applications with URL:', url)

      const response = await axios.get(url, { 
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        timeout: 15000
      })
      
      console.log('Applications fetched:', response.data.applications?.length || 0)
      
      let fetchedApplications = response.data.applications || []
      
      // If backend doesn't filter withdrawn, filter on frontend
      if (!showWithdrawn && statusFilter === 'all') {
        // FIXED: Added type annotation for the parameter
        fetchedApplications = fetchedApplications.filter((app: Application) => app.status !== 'withdrawn')
      }
      
      setApplications(fetchedApplications)
      setStats(response.data.stats || { total: 0, viewed: 0, viewRate: 0, byStatus: {} })
    } catch (error: any) {
      console.error('Error fetching applications:', error)
      console.error('Error details:', error.response?.data || error.message)
      setApplications([])
      setStats({ total: 0, viewed: 0, viewRate: 0, byStatus: {} })
      if (error.response?.status !== 401) {
        toast.error(error.response?.data?.error || 'Failed to load applications. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch job details
  const fetchJobDetails = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`http://localhost:5000/api/jobs/${jobId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      })
      setJob(response.data.job)
    } catch (error) {
      console.error('Error fetching job details:', error)
    }
  }

  // Fetch company details and check authorization
  const fetchCompanyDetails = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`http://localhost:5000/api/company/${companyId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      })
      const companyData = response.data.company || response.data
      setCompany(companyData)
      
      if (user) {
        const authorized = checkUserAuthorization(companyData, user._id)
        setIsAuthorized(authorized)
        setAccessChecked(true)
        
        if (!authorized) {
          router.push('/404')
          return false
        }
        return true
      }
      return false
    } catch (error: any) {
      console.error('Error fetching company:', error)
      router.push('/404')
      return false
    }
  }

  // Check authorization
  useEffect(() => {
    const checkAuthorization = async () => {
      if (authLoading) return
      
      if (!isAuthenticated || !user) {
        router.push('/404')
        return
      }

      try {
        setCompanyLoading(true)
        const isAuthorized = await fetchCompanyDetails()
        
        if (isAuthorized) {
          await Promise.all([fetchApplications(), fetchJobDetails()])
        }
      } catch (error: any) {
        console.error('Error in authorization check:', error)
        router.push('/404')
      } finally {
        setCompanyLoading(false)
      }
    }

    checkAuthorization()
  }, [companyId, user, isAuthenticated, authLoading, router])

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
  }

  // Clear search
  const handleClearSearch = () => {
    setSearchTerm('')
    fetchApplications()
  }

  // Handle status filter change
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setStatusFilter(value)
  }

  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSortBy(value)
  }

  // Handle sort order change
  const handleSortOrderChange = () => {
    const newOrder = sortOrder === 'desc' ? 'asc' : 'desc'
    setSortOrder(newOrder)
  }

  // Handle view application
  const handleViewApplication = (application: Application) => {
    setSelectedApplication(application)
    setShowDetailsModal(true)
  }

  // Handle status update
  const handleStatusUpdate = async () => {
    if (!selectedApplication || !newStatus) return
    
    try {
      setIsUpdating(true)
      const token = localStorage.getItem('token')
      
      await axios.put(
        `http://localhost:5000/api/applications/${selectedApplication._id}/status`,
        { status: newStatus, notes: statusNotes },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      )
      
      // Refresh applications after status update
      await fetchApplications()
      
      setShowStatusModal(false)
      setNewStatus('')
      setStatusNotes('')
      
      // Update selected application
      const updatedApp = applications.find(app => app._id === selectedApplication._id)
      if (updatedApp) setSelectedApplication(updatedApp)
      
      toast.success('Status updated successfully')
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast.error(error.response?.data?.error || 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  // Get phone number to display
  const getPhoneNumber = (application: Application) => {
    return application.phone || application.applicant?.phone || 'Not provided'
  }

  // Handle search with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (!companyLoading && !authLoading && isAuthorized) {
        fetchApplications()
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, statusFilter, showWithdrawn])

  // Client-side filtering for better UX (backup)
  const filterApplications = (applications: Application[]) => {
    return applications.filter(app => {
      // Exclude withdrawn applications unless showWithdrawn is true
      if (!showWithdrawn && app.status === 'withdrawn') {
        return false
      }
      
      // Status filter
      if (statusFilter !== 'all' && app.status !== statusFilter) {
        return false
      }
      
      // Search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase().trim()
        return (
          app.name.toLowerCase().includes(searchLower) ||
          app.email.toLowerCase().includes(searchLower) ||
          (app.phone && app.phone.toLowerCase().includes(searchLower)) ||
          (app.location && app.location.toLowerCase().includes(searchLower)) ||
          (app.applicant?.skills?.some(skill => 
            skill.name.toLowerCase().includes(searchLower)
          )) ||
          (app.applicant?.education?.some(edu => 
            edu.institution.toLowerCase().includes(searchLower) ||
            edu.degree.toLowerCase().includes(searchLower)
          )) ||
          (app.applicant?.experience?.some(exp => 
            exp.company.toLowerCase().includes(searchLower) ||
            exp.title.toLowerCase().includes(searchLower)
          ))
        )
      }
      
      return true
    })
  }

  // Client-side sorting
  const sortApplications = (apps: Application[]) => {
    return [...apps].sort((a, b) => {
      if (sortBy === 'appliedAt') {
        const dateA = new Date(a.appliedAt).getTime()
        const dateB = new Date(b.appliedAt).getTime()
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
      } else if (sortBy === 'name') {
        const nameA = a.name.toLowerCase()
        const nameB = b.name.toLowerCase()
        return sortOrder === 'desc' 
          ? nameB.localeCompare(nameA)
          : nameA.localeCompare(nameB)
      } else if (sortBy === 'status') {
        const statusA = a.status.toLowerCase()
        const statusB = b.status.toLowerCase()
        return sortOrder === 'desc'
          ? statusB.localeCompare(statusA)
          : statusA.localeCompare(statusB)
      }
      return 0
    })
  }

  // Get filtered and sorted applications
  const filteredApplications = filterApplications(applications)
  const sortedApplications = sortApplications(filteredApplications)

  // Calculate status distribution for progress bar (excluding withdrawn)
  const getStatusDistribution = () => {
    if (!stats?.byStatus) return []
    const validStatuses = ['pending', 'reviewed', 'shortlisted', 'interview', 'accepted', 'rejected']
    const filteredStats = Object.entries(stats.byStatus)
      .filter(([status]) => showWithdrawn ? true : status !== 'withdrawn')
      .reduce((acc, [status, data]) => {
        acc[status] = data
        return acc
      }, {} as any)
    
    const total = Object.values(filteredStats).reduce((sum: number, data: any) => sum + data.count, 0) || 1
    return Object.entries(filteredStats).map(([status, data]: [string, any]) => ({
      status,
      count: data.count,
      percentage: Math.round((data.count / total) * 100)
    }))
  }

  // Calculate active applications count (excluding withdrawn)
  const getActiveApplicationsCount = () => {
    if (!stats) return 0
    const total = stats.total || 0
    const withdrawn = stats.byStatus.withdrawn?.count || 0
    return total - withdrawn
  }

  // Loading state
  if (companyLoading || authLoading || loading || !accessChecked) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted fw-medium">Loading applications...</p>
        </motion.div>
      </div>
    )
  }

  // If not authorized
  if (isAuthorized === false) {
    return (
      <Container className="py-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert variant="danger" className="text-center border-0 shadow-sm rounded-3 py-5">
            <Fi.FiLock className="h2 mb-3 text-danger" />
            <Alert.Heading className="fw-bold">Access Denied</Alert.Heading>
            <p>You are not authorized to view job applications for this company.</p>
            <p className="mb-4">Only company administrators and authorized team members can access this page.</p>
            <Button 
              variant="primary" 
              className="px-4 py-2 rounded-pill"
              onClick={() => router.push('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </Alert>
        </motion.div>
      </Container>
    )
  }

  // Check if job belongs to the company
  if (job && company && job.company._id !== companyId) {
    return (
      <Container className="py-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert variant="warning" className="text-center border-0 shadow-sm rounded-3 py-5">
            <Fi.FiAlertTriangle className="h2 mb-3 text-warning" />
            <Alert.Heading className="fw-bold">Job Not Found</Alert.Heading>
            <p>The job you're trying to view applications for does not belong to this company.</p>
            <Button 
              variant="primary" 
              className="px-4 py-2 rounded-pill mt-3"
              onClick={() => router.push(`/company/${companyId}/jobs`)}
            >
              View Company Jobs
            </Button>
          </Alert>
        </motion.div>
      </Container>
    )
  }

  // If user is not authenticated or not authorized
  if (!isAuthenticated || !user || !isAuthorized) {
    return null
  }

  return (
    <>
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
            padding: '16px',
          },
        }}
      />
      
      {/* Custom CSS */}
      <style jsx global>{`
        .gradient-light {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        
        .gradient-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .gradient-success {
          background: linear-gradient(135deg, #56ab2f 0%, #a8e063 100%);
        }
        
        .gradient-warning {
          background: linear-gradient(135deg, #f7971e 0%, #ffd200 100%);
        }
        
        .gradient-info {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        
        .card-hover {
          transition: all 0.3s ease;
          border: 1px solid rgba(0,0,0,0.05);
        }
        
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.1) !important;
          border-color: rgba(0,123,255,0.2);
        }
        
        .status-badge {
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border: none;
        }
        
        .avatar-circle {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 15px;
          color: white;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .avatar-circle-lg {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 28px;
          color: white;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .timeline-item {
          position: relative;
          padding-left: 30px;
          margin-bottom: 20px;
        }
        
        .timeline-item:before {
          content: '';
          position: absolute;
          left: 0;
          top: 5px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #667eea;
        }
        
        .timeline-item:after {
          content: '';
          position: absolute;
          left: 5px;
          top: 20px;
          width: 2px;
          height: calc(100% - 5px);
          background: #e9ecef;
        }
        
        .timeline-item:last-child:after {
          display: none;
        }
        
        .table-row-hover:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
          cursor: pointer;
        }
        
        .stat-card {
          border: none;
          border-radius: 12px;
          overflow: hidden;
          background: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          box-shadow: 0 6px 20px rgba(0,0,0,0.12);
        }
        
        .stat-icon {
          width: 50px;
          height: 50px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        
        .search-input {
          border-radius: 10px !important;
          padding: 12px 16px !important;
          border: 1px solid #e0e0e0 !important;
          background-color: #f8f9fa !important;
          transition: all 0.3s ease !important;
        }
        
        .search-input:focus {
          border-color: #667eea !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15) !important;
          background-color: white !important;
        }
        
        .modal-overlay {
          backdrop-filter: blur(3px);
        }
        
        .skill-tag {
          display: inline-block;
          padding: 5px 12px;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          border-radius: 20px;
          color: #667eea;
          font-size: 0.8rem;
          font-weight: 500;
          margin: 3px;
          border: 1px solid rgba(102, 126, 234, 0.2);
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .search-group .form-control,
        .search-group .input-group-text {
          border: none !important;
          background-color: #f8f9fa !important;
          border-radius: 12px !important;
        }
        
        .search-group .form-control:focus {
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15) !important;
          background-color: white !important;
        }
        
        .search-group .input-group-text {
          padding-left: 20px;
          padding-right: 10px;
        }
        
        .filter-input {
          border-radius: 10px !important;
          padding: 12px 16px !important;
          border: 1px solid #e0e0e0 !important;
          background-color: #f8f9fa !important;
          transition: all 0.3s ease !important;
        }
        
        .filter-input:focus {
          border-color: #667eea !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15) !important;
          background-color: white !important;
        }
      `}</style>

      <Container fluid className="p-0 bg-light">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-bottom shadow-sm"
        >
          <Container className="py-4">
            <Row className="align-items-center">
              <Col xs={12} md={8}>
                <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
                  <motion.div
                    className="position-relative"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="rounded-circle gradient-primary d-flex align-items-center justify-content-center p-3 shadow">
                      <Fi.FiUsers className="text-white" size={28} />
                    </div>
                  </motion.div>
                  <div>
                    <h1 className="h2 mb-2 fw-bold text-dark">Job Applications</h1>
                    {job && (
                      <div className="text-muted">
                        <p className="mb-1 d-flex align-items-center gap-2">
                          <Fi.FiBriefcase className="h-4 w-4" />
                          <span className="fw-semibold text-dark">{job.title}</span>
                        </p>
                        <p className="mb-1">
                          {job.employmentType} • {job.location}
                        </p>
                        <p className="mb-0 d-flex align-items-center gap-2">
                          <Fi.FiBold className="h-4 w-4" />
                          {job.company.name}
                        </p>
                      </div>
                    )}
                    {company && user && (
                      <div className="mt-3">
                        <Badge 
                          bg={getUserRoleInCompany() === 'Owner' ? "primary" : "secondary"}
                          className="px-3 py-1 rounded-pill fw-medium"
                        >
                          {getUserRoleInCompany()}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </Col>
              <Col xs={12} md={4} className="text-md-end">
                <motion.div 
                  whileHover={{ scale: 1.05 }} 
                  whileTap={{ scale: 0.95 }}
                  className="d-flex gap-2 justify-content-md-end"
                >
                  <Button
                    variant="outline-primary"
                    className="d-inline-flex align-items-center gap-2 px-4 py-2 rounded-pill border-2"
                    onClick={() => router.push(`/company/${companyId}/jobs`)}
                  >
                    <Fi.FiChevronLeft /> Back to Jobs
                  </Button>
                  <Button
                    variant="primary"
                    className="d-inline-flex align-items-center gap-2 px-4 py-2 rounded-pill"
                    onClick={fetchApplications}
                    disabled={loading}
                  >
                    <Fi.FiRefreshCw className={loading ? "spin" : ""} /> 
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </motion.div>
              </Col>
            </Row>
          </Container>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="py-4"
        >
          <Container>
            <Row className="g-4">
              {stats && (
                <>
                  <Col xs={6} md={3}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Card className="stat-card border-0">
                        <Card.Body className="p-4">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="stat-icon gradient-primary">
                              <Fi.FiUsers className="text-white" size={24} />
                            </div>
                            <div className="fs-3 fw-bold text-dark">
                              {getActiveApplicationsCount()}
                            </div>
                          </div>
                          <Card.Title className="h6 mb-2 text-muted fw-semibold">Active Applications</Card.Title>
                          <div className="small text-muted">
                            {showWithdrawn ? 'Including withdrawn applications' : 'Excluding withdrawn applications'}
                            {stats.byStatus.withdrawn?.count > 0 && !showWithdrawn && (
                              <div className="mt-1 text-danger small">
                                {stats.byStatus.withdrawn?.count} withdrawn (hidden)
                              </div>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </motion.div>
                  </Col>

                  <Col xs={6} md={3}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Card className="stat-card border-0">
                        <Card.Body className="p-4">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="stat-icon gradient-info">
                              <Fi.FiEye className="text-white" size={24} />
                            </div>
                            <div className="fs-3 fw-bold text-dark">{stats.viewed}</div>
                          </div>
                          <Card.Title className="h6 mb-2 text-muted fw-semibold">Viewed</Card.Title>
                          <div className="d-flex align-items-center gap-2">
                            <ProgressBar 
                              now={stats.viewRate} 
                              variant="info"
                              className="flex-grow-1" 
                              style={{ height: '6px', borderRadius: '3px' }}
                            />
                            <span className="small fw-semibold">{stats.viewRate}%</span>
                          </div>
                        </Card.Body>
                      </Card>
                    </motion.div>
                  </Col>

                  <Col xs={6} md={3}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Card className="stat-card border-0">
                        <Card.Body className="p-4">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="stat-icon gradient-success">
                              <Fi.FiCheckCircle className="text-white" size={24} />
                            </div>
                            <div className="fs-3 fw-bold text-dark">
                              {stats.byStatus.shortlisted?.count || 0}
                            </div>
                          </div>
                          <Card.Title className="h6 mb-2 text-muted fw-semibold">Shortlisted</Card.Title>
                          <div className="small text-muted">
                            Top candidates
                          </div>
                        </Card.Body>
                      </Card>
                    </motion.div>
                  </Col>

                  <Col xs={6} md={3}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Card className="stat-card border-0">
                        <Card.Body className="p-4">
                          <div className="d-flex align-items-center justify-content-between mb-3">
                            <div className="stat-icon gradient-warning">
                              <Fi.FiClock className="text-white" size={24} />
                            </div>
                            <div className="fs-3 fw-bold text-dark">
                              {stats.byStatus.pending?.count || 0}
                            </div>
                          </div>
                          <Card.Title className="h6 mb-2 text-muted fw-semibold">Pending</Card.Title>
                          <div className="small text-muted">
                            Awaiting review
                          </div>
                        </Card.Body>
                      </Card>
                    </motion.div>
                  </Col>
                </>
              )}
            </Row>

            {/* Status Distribution */}
            {stats && stats.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mt-4"
              >
                <Card className="border-0 shadow-sm">
                  <Card.Body className="p-3">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-semibold mb-0 d-flex align-items-center gap-2">
                        <Fi.FiPieChart className="h-4 w-4" />
                        Status Distribution
                      </h6>
                      <div className="d-flex align-items-center gap-3">
                        {stats.byStatus.withdrawn?.count > 0 && (
                          <div className="d-flex align-items-center gap-2">
                            <Badge bg="secondary" className="status-badge">
                              <Fi.FiX size={12} />
                              Withdrawn: {stats.byStatus.withdrawn.count}
                            </Badge>
                            <FormCheck
                              type="switch"
                              id="show-withdrawn-toggle"
                              label="Show withdrawn"
                              checked={showWithdrawn}
                              onChange={(e) => setShowWithdrawn(e.target.checked)}
                              className="small text-muted"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="d-flex flex-wrap gap-3">
                      {getStatusDistribution().map((item) => (
                        <div key={item.status} className="d-flex align-items-center gap-2">
                          <div className={`status-badge bg-${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            {item.status}
                          </div>
                          <span className="small text-muted">{item.count} ({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              </motion.div>
            )}
          </Container>
        </motion.div>

        {/* Main Content */}
        <Container className="py-4">
          <Row>
            <Col lg={12}>
              {/* Filters and Search */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-4"
              >
                <Card className="border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <Row className="g-3 align-items-center">
                      {/* Search Input - Clean borderless design */}
                      <Col md={5}>
                        <InputGroup className="search-group">
                          <InputGroup.Text className="bg-transparent border-0 ps-3">
                            <Fi.FiSearch className="text-muted" />
                          </InputGroup.Text>
                          <Form.Control
                            placeholder="Search by name, email, phone, skills, or location..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="border-0 search-input ps-0"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                fetchApplications()
                              }
                            }}
                          />
                          {searchTerm && (
                            <Button
                              variant="link"
                              className="border-0 text-muted ms-2 me-3"
                              onClick={handleClearSearch}
                              title="Clear search"
                            >
                              <Fi.FiX size={18} />
                            </Button>
                          )}
                        </InputGroup>
                      </Col>
                      
                      {/* Status Filter */}
                      <Col md={3}>
                        <InputGroup>
                          <InputGroup.Text className="bg-transparent border-0">
                            <Fi.FiFilter className="text-muted" />
                          </InputGroup.Text>
                          <Form.Select
                            value={statusFilter}
                            onChange={handleStatusFilterChange}
                            className="filter-input"
                          >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="reviewed">Reviewed</option>
                            <option value="shortlisted">Shortlisted</option>
                            <option value="interview">Interview</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                            {showWithdrawn && (
                              <option value="withdrawn">Withdrawn</option>
                            )}
                          </Form.Select>
                        </InputGroup>
                      </Col>
                      
                      {/* Sort By */}
                      <Col md={2}>
                        <InputGroup>
                          <InputGroup.Text className="bg-transparent border-0">
                            <Fi.FiStopCircle className="text-muted" />
                          </InputGroup.Text>
                          <Form.Select
                            value={sortBy}
                            onChange={handleSortChange}
                            className="filter-input"
                          >
                            <option value="appliedAt">Date Applied</option>
                            <option value="name">Name</option>
                            <option value="status">Status</option>
                          </Form.Select>
                        </InputGroup>
                      </Col>
                      
                      {/* Sort Order */}
                      <Col md={2}>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-secondary"
                            className="w-100 border d-flex align-items-center justify-content-center rounded-3"
                            onClick={handleSortOrderChange}
                            title={sortOrder === 'desc' ? 'Sort Ascending' : 'Sort Descending'}
                            style={{ height: '48px' }}
                          >
                            {sortOrder === 'desc' ? <Fi.FiArrowDown /> : <Fi.FiArrowUp />}
                          </Button>
                          {stats?.byStatus.withdrawn?.count > 0 && (
                            <Button
                              variant={showWithdrawn ? "secondary" : "outline-secondary"}
                              className="d-flex align-items-center justify-content-center rounded-3"
                              onClick={() => setShowWithdrawn(!showWithdrawn)}
                              title={showWithdrawn ? "Hide withdrawn applications" : "Show withdrawn applications"}
                              style={{ height: '48px', width: '48px' }}
                            >
                              {showWithdrawn ? (
                                <Fi.FiEyeOff className="h-4 w-4" />
                              ) : (
                                <Fi.FiEye className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </Col>
                    </Row>
                    
                    {/* Active Filters */}
                    {(searchTerm || statusFilter !== 'all' || showWithdrawn) && (
                      <Row className="mt-3">
                        <Col xs={12}>
                          <div className="d-flex align-items-center flex-wrap gap-2">
                            <small className="text-muted me-2 fw-medium">Active filters:</small>
                            {searchTerm && (
                              <Badge bg="info" className="d-flex align-items-center gap-1 px-3 py-1 rounded-pill">
                                <Fi.FiSearch size={12} /> Search: "{searchTerm}"
                                <Button
                                  variant="outline-light"
                                  size="sm"
                                  className="ms-1 p-0 border-0"
                                  onClick={handleClearSearch}
                                >
                                  ×
                                </Button>
                              </Badge>
                            )}
                            {statusFilter !== 'all' && (
                              <Badge bg="warning" className="d-flex align-items-center gap-1 px-3 py-1 rounded-pill text-capitalize">
                                {getStatusIcon(statusFilter)}
                                Status: {statusFilter}
                                <Button
                                  variant="outline-light"
                                  size="sm"
                                  className="ms-1 p-0 border-0"
                                  onClick={() => {
                                    setStatusFilter('all')
                                    fetchApplications()
                                  }}
                                >
                                  ×
                                </Button>
                              </Badge>
                            )}
                            {showWithdrawn && (
                              <Badge bg="secondary" className="d-flex align-items-center gap-1 px-3 py-1 rounded-pill">
                                <Fi.FiEye size={12} />
                                Showing withdrawn
                                <Button
                                  variant="outline-light"
                                  size="sm"
                                  className="ms-1 p-0 border-0"
                                  onClick={() => setShowWithdrawn(false)}
                                >
                                  ×
                                </Button>
                              </Badge>
                            )}
                            <div className="ms-2 text-muted small">
                              Found {sortedApplications.length} application{sortedApplications.length !== 1 ? 's' : ''}
                              {showWithdrawn && stats?.byStatus.withdrawn?.count > 0 && (
                                <span className="ms-1">
                                  ({stats.byStatus.withdrawn.count} withdrawn included)
                                </span>
                              )}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    )}
                    
                    {/* Search Tips */}
                    {searchTerm && sortedApplications.length === 0 && !loading && (
                      <Row className="mt-3">
                        <Col xs={12}>
                          <div className="alert alert-info p-3 small mb-0 border-0 rounded-3">
                            <div className="d-flex align-items-center gap-2">
                              <Fi.FiInfo className="h-4 w-4 flex-shrink-0" />
                              <div>
                                <strong className="d-block mb-1">Search tips:</strong>
                                <p className="mb-0">Try searching by:
                                  <span className="ms-1">candidate name, email address, phone number, location, skills, education, or company experience.</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </Col>
                      </Row>
                    )}
                  </Card.Body>
                </Card>
              </motion.div>

              {/* Applications Table */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Card className="border-0 shadow-sm">
                  <div className="p-4 border-bottom bg-light rounded-top">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h5 className="fw-bold mb-1">Candidate Applications</h5>
                        <p className="text-muted small mb-0">
                          {loading ? (
                            <span>Loading applications...</span>
                          ) : (
                            <span>
                              {sortedApplications.length} candidate{sortedApplications.length !== 1 ? 's' : ''} found
                              {searchTerm && ` for "${searchTerm}"`}
                              {showWithdrawn && stats?.byStatus.withdrawn?.count > 0 && (
                                <span className="ms-1">
                                  ({stats.byStatus.withdrawn.count} withdrawn included)
                                </span>
                              )}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-muted small d-flex align-items-center gap-2">
                        <Fi.FiInfo className="h-3 w-3" />
                        <span>Sorted by {sortBy === 'appliedAt' ? 'Date Applied' : sortBy} ({sortOrder})</span>
                        {!showWithdrawn && stats?.byStatus.withdrawn?.count > 0 && (
                          <span className="text-danger">
                            • {stats.byStatus.withdrawn.count} withdrawn applications hidden
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="table-responsive">
                    <Table hover className="mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="px-4 py-3 border-top-0 fw-semibold text-muted">Candidate</th>
                          <th className="px-4 py-3 border-top-0 fw-semibold text-muted">Contact</th>
                          <th className="px-4 py-3 border-top-0 fw-semibold text-muted">Status</th>
                          <th className="px-4 py-3 border-top-0 fw-semibold text-muted">Applied</th>
                          <th className="px-4 py-3 border-top-0 fw-semibold text-muted text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-5 text-center">
                              <div className="d-flex flex-column align-items-center justify-content-center">
                                <Spinner animation="border" variant="primary" />
                                <p className="mt-3 text-muted fw-medium">
                                  {searchTerm ? `Searching for "${searchTerm}"...` : 'Loading applications...'}
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : sortedApplications.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-5 text-center">
                              <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-4"
                              >
                                <div className="mb-4">
                                  <div className="rounded-circle bg-light p-4 d-inline-flex">
                                    <Fi.FiUsers className="text-muted" size={48} />
                                  </div>
                                </div>
                                <h4 className="h5 fw-bold mb-2">
                                  {searchTerm ? 'No matches found' : 'No applications yet'}
                                </h4>
                                <p className="text-muted mb-4">
                                  {searchTerm 
                                    ? `No candidates match "${searchTerm}". Try a different search term.`
                                    : 'No applications have been submitted for this job yet.'}
                                </p>
                                {searchTerm && (
                                  <Button
                                    variant="outline-primary"
                                    onClick={handleClearSearch}
                                    className="rounded-pill px-4"
                                  >
                                    <Fi.FiX className="me-1" />
                                    Clear Search
                                  </Button>
                                )}
                                {!showWithdrawn && stats?.byStatus.withdrawn?.count > 0 && (
                                  <div className="mt-3">
                                    <Button
                                      variant="outline-secondary"
                                      onClick={() => setShowWithdrawn(true)}
                                      className="rounded-pill px-4"
                                    >
                                      <Fi.FiEye className="me-1" />
                                      Show {stats.byStatus.withdrawn.count} withdrawn applications
                                    </Button>
                                  </div>
                                )}
                              </motion.div>
                            </td>
                          </tr>
                        ) : (
                          sortedApplications.map((application) => (
                            <motion.tr 
                              key={application._id} 
                              className="table-row-hover"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3 }}
                              whileHover={{ backgroundColor: 'rgba(102, 126, 234, 0.05)' }}
                            >
                              <td className="px-4 py-3 align-middle">
                                <div className="d-flex align-items-center gap-3">
                                  <div className="position-relative">
                                    {application.applicant?.profileImage ? (
                                      <Image
                                        src={getImageUrl(application.applicant.profileImage)}
                                        alt={application.name}
                                        roundedCircle
                                        className="shadow-sm border"
                                        style={{ 
                                          width: '44px', 
                                          height: '44px', 
                                          objectFit: 'cover' 
                                        }}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.style.display = 'none'
                                          const parent = target.parentElement
                                          if (parent) {
                                            parent.innerHTML = `
                                              <div class="avatar-circle">
                                                ${getInitials(application.name)}
                                              </div>
                                            `
                                          }
                                        }}
                                      />
                                    ) : (
                                      <div className="avatar-circle">
                                        {getInitials(application.name)}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <div className="fw-semibold">{application.name}</div>
                                    <div className="small text-muted d-flex align-items-center gap-1">
                                      <Fi.FiMail className="h-3 w-3" />
                                      {application.email}
                                    </div>
                                    {application.status === 'withdrawn' && (
                                      <div className="small text-danger d-flex align-items-center gap-1 mt-1">
                                        <Fi.FiX className="h-3 w-3" />
                                        Withdrawn by candidate
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <div className="small">
                                  <div className="d-flex align-items-center gap-1 mb-1">
                                    <Fi.FiPhone className="h-3 w-3 text-muted" />
                                    <span className="fw-medium">{getPhoneNumber(application)}</span>
                                  </div>
                                  {application.location && (
                                    <div className="d-flex align-items-center gap-1 text-muted">
                                      <Fi.FiMapPin className="h-3 w-3" />
                                      <span>{application.location}</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <Badge 
                                  bg={getStatusColor(application.status)}
                                  className="status-badge"
                                >
                                  {getStatusIcon(application.status)}
                                  {application.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 align-middle">
                                <div>
                                  <div className="small fw-semibold">
                                    {formatDate(application.appliedAt)}
                                  </div>
                                  <div className="small text-muted d-flex align-items-center gap-1">
                                    <Fi.FiCalendar className="h-3 w-3" />
                                    {formatTime(application.appliedAt)}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 align-middle text-end">
                                <div className="d-flex gap-2 justify-content-end">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="d-flex align-items-center gap-1 rounded-pill px-3"
                                    onClick={() => handleViewApplication(application)}
                                    disabled={application.status === 'withdrawn'}
                                  >
                                    <Fi.FiEye className="h-3 w-3" />
                                    View
                                  </Button>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="d-flex align-items-center gap-1 rounded-pill px-3"
                                    onClick={() => downloadResume(application._id, application.name)}
                                    disabled={downloading === application._id || application.status === 'withdrawn'}
                                  >
                                    {downloading === application._id ? (
                                      <>
                                        <Spinner animation="border" size="sm" className="me-1" />
                                        Downloading...
                                      </>
                                    ) : (
                                      <>
                                        <Fi.FiDownload className="h-3 w-3" />
                                        Resume
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </Table>
                  </div>
                  
                  {!loading && sortedApplications.length > 0 && (
                    <div className="p-3 border-top bg-light">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="text-muted small">
                          Showing {sortedApplications.length} of {showWithdrawn ? stats?.total || 0 : getActiveApplicationsCount()} applications
                          {searchTerm && ` matching "${searchTerm}"`}
                          {showWithdrawn && stats?.byStatus.withdrawn?.count > 0 && (
                            <span className="ms-1">
                              ({stats.byStatus.withdrawn.count} withdrawn included)
                            </span>
                          )}
                        </div>
                        <div className="text-muted small d-flex align-items-center gap-2">
                          <Fi.FiClock className="h-3 w-3" />
                          <span>Updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            </Col>
          </Row>
        </Container>
      </Container>

      {/* Application Details Modal */}
      {selectedApplication && (
        <>
          <Modal
            show={showDetailsModal}
            onHide={() => setShowDetailsModal(false)}
            size="xl"
            centered
            scrollable
            className="modal-overlay"
          >
            <Modal.Header closeButton className="border-0 bg-light rounded-top py-4">
              <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                <Fi.FiUser className="text-primary" />
                Application Details
                {selectedApplication.status === 'withdrawn' && (
                  <Badge bg="secondary" className="ms-2">
                    <Fi.FiX className="me-1" />
                    Withdrawn
                  </Badge>
                )}
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="py-4">
              <Row>
                {/* Left Column - Candidate Info */}
                <Col md={4} className="border-end pe-4">
                  {/* Profile Card */}
                  <Card className="border-0 shadow-sm mb-4 card-hover">
                    <Card.Body className="text-center p-4">
                      <div className="mb-4">
                        {selectedApplication.applicant?.profileImage ? (
                          <Image
                            src={getImageUrl(selectedApplication.applicant.profileImage)}
                            alt={selectedApplication.name}
                            roundedCircle
                            className="shadow-lg mb-3 border"
                            style={{ 
                              width: '120px', 
                              height: '120px', 
                              objectFit: 'cover' 
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.style.display = 'none'
                              const parent = target.parentElement
                              if (parent) {
                                parent.innerHTML = `
                                  <div class="avatar-circle-lg gradient-primary mx-auto mb-3">
                                    ${getInitials(selectedApplication.name)}
                                  </div>
                                `
                              }
                            }}
                          />
                        ) : (
                          <div className="avatar-circle-lg gradient-primary mx-auto mb-3">
                            {getInitials(selectedApplication.name)}
                          </div>
                        )}
                        <h5 className="fw-bold mb-2">{selectedApplication.name}</h5>
                        <p className="text-muted mb-3 d-flex align-items-center justify-content-center gap-1">
                          <Fi.FiMail className="h-4 w-4" />
                          {selectedApplication.email}
                        </p>
                        {selectedApplication.status === 'withdrawn' && (
                          <div className="alert alert-warning small mb-3">
                            <Fi.FiAlertTriangle className="me-2" />
                            This application was withdrawn by the candidate
                          </div>
                        )}
                      </div>
                      
                      {/* Contact Information */}
                      <div className="text-start mb-4">
                        <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                          <Fi.FiPhone className="h-4 w-4 text-primary" />
                          Contact Information
                        </h6>
                        <div className="space-y-2">
                          <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
                            <div className="d-flex align-items-center gap-2">
                              <Fi.FiPhone className="h-4 w-4 text-muted" />
                              <span className="small">Phone</span>
                            </div>
                            <a 
                              href={`tel:${getPhoneNumber(selectedApplication)}`}
                              className="fw-semibold small text-decoration-none text-primary"
                            >
                              {getPhoneNumber(selectedApplication)}
                            </a>
                          </div>
                          {selectedApplication.location && (
                            <div className="d-flex align-items-center justify-content-between py-2">
                              <div className="d-flex align-items-center gap-2">
                                <Fi.FiMapPin className="h-4 w-4 text-muted" />
                                <span className="small">Location</span>
                              </div>
                              <span className="fw-semibold small">{selectedApplication.location}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Links */}
                      <div className="text-start mb-4">
                        <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                          <Fi.FiGlobe className="h-4 w-4 text-primary" />
                          Links
                        </h6>
                        <div className="d-grid gap-2">
                          {selectedApplication.linkedin && (
                            <a
                              href={selectedApplication.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-between rounded-pill px-3"
                            >
                              <div className="d-flex align-items-center gap-2">
                                <Fi.FiLinkedin className="h-4 w-4" />
                                LinkedIn
                              </div>
                              <Fi.FiExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {selectedApplication.portfolio && (
                            <a
                              href={selectedApplication.portfolio}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline-primary btn-sm d-flex align-items-center justify-content-between rounded-pill px-3"
                            >
                              <div className="d-flex align-items-center gap-2">
                                <Fi.FiGlobe className="h-4 w-4" />
                                Portfolio
                              </div>
                              <Fi.FiExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Skills */}
                      {selectedApplication.applicant?.skills && selectedApplication.applicant.skills.length > 0 && (
                        <div className="text-start">
                          <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2">
                            <Fi.FiAward className="h-4 w-4 text-primary" />
                            Skills
                          </h6>
                          <div className="d-flex flex-wrap gap-1">
                            {selectedApplication.applicant.skills.slice(0, 10).map((skill, index) => (
                              <span key={index} className="skill-tag">
                                {skill.name}
                              </span>
                            ))}
                            {selectedApplication.applicant.skills.length > 10 && (
                              <span className="skill-tag">
                                +{selectedApplication.applicant.skills.length - 10} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>

                {/* Right Column - Application Details */}
                <Col md={8} className="ps-4">
                  {/* Status and Action */}
                  <Card className="border-0 shadow-sm mb-4 card-hover">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                          <h6 className="fw-bold mb-1">Application Status</h6>
                          <p className="text-muted small mb-0">
                            Submitted on {formatDateTime(selectedApplication.appliedAt)}
                          </p>
                        </div>
                        {selectedApplication.status !== 'withdrawn' && (
                          <Button
                            variant="primary"
                            className="d-flex align-items-center gap-2 rounded-pill px-4"
                            onClick={() => {
                              setShowDetailsModal(false)
                              setTimeout(() => setShowStatusModal(true), 100)
                            }}
                          >
                            <Fi.FiPenTool className="h-4 w-4" />
                            Update Status
                          </Button>
                        )}
                      </div>
                      
                      <div className="d-flex align-items-center gap-3 mb-4">
                        <Badge 
                          bg={getStatusColor(selectedApplication.status)}
                          className="status-badge px-4 py-2"
                        >
                          {getStatusIcon(selectedApplication.status)}
                          {selectedApplication.status}
                        </Badge>
                        <div className="small text-muted">
                          Last updated: {selectedApplication.viewedAt ? formatDateTime(selectedApplication.viewedAt) : 'Not viewed yet'}
                        </div>
                      </div>

                      {/* Timeline */}
                      {selectedApplication.timeline && selectedApplication.timeline.length > 0 && (
                        <div className="mt-4">
                          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                            <Fi.FiClock className="h-4 w-4 text-primary" />
                            Timeline
                          </h6>
                          <div className="timeline">
                            {selectedApplication.timeline.slice().reverse().map((event, index) => (
                              <div key={index} className="timeline-item">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div>
                                    <div className="fw-semibold text-capitalize">{event.action}</div>
                                    <div className="small text-muted">{event.notes}</div>
                                  </div>
                                  <div className="small text-muted text-nowrap">
                                    {formatDate(event.date)}
                                  </div>
                                </div>
                                <div className="small text-muted">
                                  By {event.performedBy.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card.Body>
                  </Card>

                  {/* Documents */}
                  <Card className="border-0 shadow-sm mb-4 card-hover">
                    <Card.Body className="p-4">
                      <h6 className="fw-bold mb-4 d-flex align-items-center gap-2">
                        <Fi.FiFileText className="h-4 w-4 text-primary" />
                        Documents
                      </h6>
                      
                      <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center bg-light p-4 rounded-3">
                          <div className="d-flex align-items-center gap-3">
                            <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                              <Fi.FiFileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="fw-semibold">Resume</div>
                              <div className="small text-muted">
                                {selectedApplication.resume.split('/').pop()}
                              </div>
                            </div>
                          </div>
                          <div className="d-flex gap-2">
                            <a
                              href={getResumeUrl(selectedApplication.resume)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline-primary d-flex align-items-center gap-2 rounded-pill px-3"
                            >
                              <Fi.FiEye className="h-4 w-4" />
                              View
                            </a>
                            <Button
                              variant="primary"
                              className="d-flex align-items-center gap-2 rounded-pill px-3"
                              onClick={() => downloadResume(selectedApplication._id, selectedApplication.name)}
                              disabled={downloading === selectedApplication._id}
                            >
                              {downloading === selectedApplication._id ? (
                                <>
                                  <Spinner animation="border" size="sm" className="me-1" />
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  <Fi.FiDownload className="h-4 w-4" />
                                  Download
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {selectedApplication.coverLetter && (
                        <div className="border rounded-3 p-4 bg-light">
                          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                            <Fi.FiMessageSquare className="h-4 w-4 text-primary" />
                            Cover Letter
                          </h6>
                          <div className="text-muted" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {selectedApplication.coverLetter}
                          </div>
                        </div>
                      )}
                    </Card.Body>
                  </Card>

                  {/* Education & Experience */}
                  {(selectedApplication.applicant?.education || selectedApplication.applicant?.experience) && (
                    <Card className="border-0 shadow-sm card-hover">
                      <Card.Body className="p-4">
                        <h6 className="fw-bold mb-4 d-flex align-items-center gap-2">
                          <Fi.FiBriefcase className="h-4 w-4 text-primary" />
                          Background
                        </h6>
                        
                        <Row>
                          {selectedApplication.applicant?.education && selectedApplication.applicant.education.length > 0 && (
                            <Col md={6}>
                              <div className="mb-4">
                                <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2 text-muted">
                                  <Fi.FiBook className="h-4 w-4" />
                                  Education
                                </h6>
                                {selectedApplication.applicant.education.map((edu, index) => (
                                  <div key={index} className="mb-3 pb-3 border-bottom">
                                    <div className="fw-semibold">{edu.degree}</div>
                                    <div className="small text-muted">{edu.institution}</div>
                                    {edu.fieldOfStudy && (
                                      <div className="small text-muted mt-1">Field: {edu.fieldOfStudy}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </Col>
                          )}

                          {selectedApplication.applicant?.experience && selectedApplication.applicant.experience.length > 0 && (
                            <Col md={6}>
                              <div>
                                <h6 className="fw-semibold mb-3 d-flex align-items-center gap-2 text-muted">
                                  <Fi.FiBriefcase className="h-4 w-4" />
                                  Experience
                                </h6>
                                {selectedApplication.applicant.experience.map((exp, index) => (
                                  <div key={index} className="mb-3 pb-3 border-bottom">
                                    <div className="fw-semibold">{exp.title}</div>
                                    <div className="small text-muted">{exp.company}</div>
                                  </div>
                                ))}
                              </div>
                            </Col>
                          )}
                        </Row>
                      </Card.Body>
                    </Card>
                  )}
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer className="border-0 bg-light rounded-bottom">
              <Button 
                variant="secondary" 
                onClick={() => setShowDetailsModal(false)}
                className="rounded-pill px-4"
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Update Status Modal */}
          <Modal
            show={showStatusModal}
            onHide={() => setShowStatusModal(false)}
            centered
            className="modal-overlay"
          >
            <Modal.Header closeButton className="border-0">
              <Modal.Title className="fw-bold d-flex align-items-center gap-2">
                <Fi.FiPenTool className="text-primary" />
                Update Status
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="text-muted small mb-4">
                Update application status for <strong>{selectedApplication.name}</strong>
              </div>
              
              <div className="mb-4">
                <label className="form-label fw-semibold mb-3">Select New Status</label>
                <div className="row g-3">
                  {['pending', 'reviewed', 'shortlisted', 'interview', 'accepted', 'rejected'].map((status) => (
                    <div key={status} className="col-6">
                      <div
                        className={`p-3 border rounded-3 cursor-pointer ${newStatus === status ? 'border-primary bg-primary bg-opacity-10' : 'border-light-subtle'}`}
                        onClick={() => setNewStatus(status)}
                        style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <div className={`rounded-circle p-2 bg-${getStatusColor(status)}-subtle`}>
                            {getStatusIcon(status)}
                          </div>
                          <span className="fw-semibold text-capitalize">{status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Notes (Optional)</label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add any notes about this status change..."
                  className="rounded-3"
                />
              </div>
            </Modal.Body>
            <Modal.Footer className="border-0">
              <Button
                variant="secondary"
                onClick={() => setShowStatusModal(false)}
                disabled={isUpdating}
                className="rounded-pill px-4"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleStatusUpdate}
                disabled={!newStatus || isUpdating}
                className="rounded-pill px-4"
              >
                {isUpdating ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Updating...
                  </>
                ) : (
                  'Update Status'
                )}
              </Button>
            </Modal.Footer>
          </Modal>
        </>
      )}
    </>
  )
}