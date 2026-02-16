'use client'

import { useState, useEffect } from 'react'
import { 
  Badge, 
  Card, 
  Button, 
  Row, 
  Col, 
  Dropdown, 
  ProgressBar, 
  Image, 
  Spinner, 
  Alert, 
  Modal, 
  Nav
} from 'react-bootstrap'
import { 
  FiBriefcase, 
  FiMapPin, 
  FiDollarSign, 
  FiCalendar, 
  FiUsers,
  FiEdit,
  FiTrash2,
  FiClock,
  FiTrendingUp,
  FiArchive,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiAlertCircle,
  FiExternalLink,
  FiPlus,
  FiEye,
  FiX // Added X icon for withdrawn
} from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import axios from 'axios'
import { toast } from 'react-hot-toast'

interface Applicant {
  _id: string
  name: string
  email: string
  age?: number
  profileImage?: string
  skills?: string[]
  education?: any[]
}

interface Application {
  _id: string
  applicant: Applicant
  status: string
  appliedAt: string
  coverLetter?: string
  experience?: string
  resume?: string
}

interface Job {
  _id: string
  title: string
  description: string
  location: string
  type: string
  salary: any
  company: {
    _id: string
    name: string
    logo?: string
  }
  companyName: string
  applications: Application[]
  applicants: Array<{
    _id: string
    name: string
    email: string
    age?: number
    profileImage?: string
    appliedAt: string
    status?: string
    applicationId?: string
    coverLetter?: string
    experience?: string
    resume?: string
  }>
  createdAt: string
  updatedAt: string
  status: 'active' | 'draft' | 'closed' | 'archived'
  isUrgent?: boolean
  isFeatured?: boolean
  experience?: {
    minYears: number
    maxYears: number
  }
  applicationDeadline?: string
  postedBy: string
}

interface JobTabsProps {
  jobs: Job[]
  companyId: string
  onJobUpdate: () => Promise<void>
  onJobDelete: (jobId: string) => void
  onJobStatusChange: (jobId: string, newStatus: Job['status']) => Promise<void>
  onEditJob: (jobId: string) => void
  isLoading?: boolean
  isUpdatingStatus?: string | null
}

const JobTabs = ({ 
  jobs, 
  companyId, 
  onJobUpdate, 
  onJobDelete, 
  onJobStatusChange,
  onEditJob,
  isLoading = false,
  isUpdatingStatus = null
}: JobTabsProps) => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'active' | 'draft' | 'closed' | 'archived'>('active')
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [applicationStats, setApplicationStats] = useState<{[key: string]: {active: number, withdrawn: number}}>({})

  // Filter jobs based on active tab
  useEffect(() => {
    console.log(`Filtering jobs for tab: ${activeTab}, total jobs: ${jobs.length}`)
    const filtered = jobs.filter(job => {
      const matchesTab = job.status === activeTab
      return matchesTab
    })
    console.log(`Found ${filtered.length} jobs for tab ${activeTab}`)
    setFilteredJobs(filtered)
  }, [jobs, activeTab])

  // Fetch application stats for each job
  useEffect(() => {
    const fetchApplicationStats = async () => {
      const stats: {[key: string]: {active: number, withdrawn: number}} = {}
      
      for (const job of jobs) {
        try {
          const token = localStorage.getItem('token')
          const response = await axios.get(
            `http://localhost:5000/api/applications/job/${job._id}/applicants`,
            { 
              headers: { Authorization: token ? `Bearer ${token}` : '' },
              timeout: 5000 // 5 second timeout
            }
          )
          
          if (response.data && response.data.applications) {
            const applications = response.data.applications
            const activeCount = applications.filter((app: any) => app.status !== 'withdrawn').length
            const withdrawnCount = applications.filter((app: any) => app.status === 'withdrawn').length
            stats[job._id] = { active: activeCount, withdrawn: withdrawnCount }
          } else {
            // Fallback to job's application count if API fails
            const totalCount = job.applications?.length || job.applicants?.length || 0
            stats[job._id] = { active: totalCount, withdrawn: 0 }
          }
        } catch (error) {
          console.log(`Could not fetch stats for job ${job._id}:`, error)
          // Fallback to job's application count
          const totalCount = job.applications?.length || job.applicants?.length || 0
          stats[job._id] = { active: totalCount, withdrawn: 0 }
        }
      }
      
      setApplicationStats(stats)
    }
    
    if (jobs.length > 0) {
      fetchApplicationStats()
    }
  }, [jobs])

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const itemVariants = {
    hidden: { y: 10, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  }

  const cardVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 100
      }
    },
    hover: {
      scale: 1.01,
      transition: {
        type: "spring",
        stiffness: 300
      }
    }
  }

  // Helper functions
  const getImageUrl = (imagePath: string | undefined | null): string => {
    if (!imagePath) return ''
    if (imagePath.startsWith('http')) return imagePath
    return `http://localhost:5000/${imagePath.replace(/\\/g, '/')}`
  }

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge bg="success" className="d-flex align-items-center gap-1">
            <FiCheckCircle size={12} /> Active
          </Badge>
        )
      case 'draft':
        return (
          <Badge bg="secondary" className="d-flex align-items-center gap-1">
            <FiClock size={12} /> Draft
          </Badge>
        )
      case 'closed':
        return (
          <Badge bg="warning" className="d-flex align-items-center gap-1">
            <FiArchive size={12} /> Closed
          </Badge>
        )
      case 'archived':
        return (
          <Badge bg="dark" className="d-flex align-items-center gap-1">
            <FiArchive size={12} /> Archived
          </Badge>
        )
      default:
        return <Badge bg="light" text="dark">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      'Full-time': 'primary',
      'Part-time': 'info',
      'Contract': 'warning',
      'Internship': 'success',
      'Remote': 'dark',
      'Temporary': 'secondary',
      'Freelance': 'purple'
    }
    const color = typeColors[type] || 'light'
    return <Badge bg={color} className="px-2 py-1">{type}</Badge>
  }

  // Get active applications count (excluding withdrawn)
  const getActiveApplicationsCount = (job: Job): number => {
    // Use cached stats if available
    if (applicationStats[job._id]) {
      return applicationStats[job._id].active
    }
    
    // Fallback: filter applications array
    if (job.applications) {
      return job.applications.filter(app => app.status !== 'withdrawn').length
    }
    
    // Fallback: filter applicants array
    if (job.applicants) {
      return job.applicants.filter(app => app.status !== 'withdrawn').length
    }
    
    return 0
  }

  // Get withdrawn applications count
  const getWithdrawnApplicationsCount = (job: Job): number => {
    // Use cached stats if available
    if (applicationStats[job._id]) {
      return applicationStats[job._id].withdrawn
    }
    
    // Fallback: filter applications array
    if (job.applications) {
      return job.applications.filter(app => app.status === 'withdrawn').length
    }
    
    // Fallback: filter applicants array
    if (job.applicants) {
      return job.applicants.filter(app => app.status === 'withdrawn').length
    }
    
    return 0
  }

  // Get total applications count (including withdrawn)
  const getTotalApplicationsCount = (job: Job): number => {
    return job.applications?.length || job.applicants?.length || 0
  }

  const formatSalary = (salary: any): string => {
    if (!salary || salary === null || salary === undefined) {
      return 'Salary not specified'
    }

    if (typeof salary === 'string') {
      if (salary.trim() === '') return 'Salary not specified'
      
      if (salary.toLowerCase().includes('not specified') || 
          salary.toLowerCase().includes('negotiable') ||
          salary.toLowerCase().includes('confidential')) {
        return salary
      }
      
      const num = parseFloat(salary.replace(/[^0-9.-]+/g, ''))
      if (!isNaN(num) && num > 0) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0
        }).format(num)
      }
      
      try {
        const parsed = JSON.parse(salary)
        return formatSalary(parsed)
      } catch {
        return salary
      }
    }

    if (typeof salary === 'object') {
      if (salary.amount !== undefined && salary.amount !== null && salary.amount > 0) {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: salary.currency || 'USD',
          minimumFractionDigits: 0
        }).format(salary.amount)
        
        let result = formatted
        if (salary.isNegotiable) result += ' (Negotiable)'
        if (salary.payPeriod) result += ` per ${salary.payPeriod}`
        return result
      }
      
      if (salary.min !== undefined && salary.max !== undefined) {
        const min = Number(salary.min)
        const max = Number(salary.max)
        
        if (!isNaN(min) && !isNaN(max)) {
          const formattedMin = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: salary.currency || 'USD',
            minimumFractionDigits: 0
          }).format(min)
          
          const formattedMax = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: salary.currency || 'USD',
            minimumFractionDigits: 0
          }).format(max)
          
          let result = `${formattedMin} - ${formattedMax}`
          if (salary.isNegotiable) result += ' (Negotiable)'
          if (salary.payPeriod) result += ` per ${salary.payPeriod}`
          return result
        }
      }
      
      if (salary.min !== undefined && salary.min > 0) {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: salary.currency || 'USD',
          minimumFractionDigits: 0
        }).format(salary.min)
        
        let result = `From ${formatted}`
        if (salary.isNegotiable) result += ' (Negotiable)'
        if (salary.payPeriod) result += ` per ${salary.payPeriod}`
        return result
      }
      
      if (salary.max !== undefined && salary.max > 0) {
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: salary.currency || 'USD',
          minimumFractionDigits: 0
        }).format(salary.max)
        
        let result = `Up to ${formatted}`
        if (salary.isNegotiable) result += ' (Negotiable)'
        if (salary.payPeriod) result += ` per ${salary.payPeriod}`
        return result
      }
      
      if (salary.display && salary.display.trim() !== '') {
        return salary.display
      }
      
      const hasValidValue = Object.values(salary).some(val => {
        if (val === undefined || val === null) return false
        if (typeof val === 'string' && val.trim() === '') return false
        if (typeof val === 'number' && (isNaN(val) || val <= 0)) return false
        return true
      })
      
      if (!hasValidValue) {
        return salary.isNegotiable ? 'Salary negotiable' : 'Salary not specified'
      }
    }
    
    return 'Salary not specified'
  }

  // Tab configurations
  const tabs = [
    {
      key: 'active' as const,
      label: 'Active',
      icon: <FiCheckCircle size={16} />,
      count: jobs.filter(j => j.status === 'active').length,
      description: 'Currently open jobs'
    },
    {
      key: 'draft' as const,
      label: 'Drafts',
      icon: <FiClock size={16} />,
      count: jobs.filter(j => j.status === 'draft').length,
      description: 'Unpublished jobs'
    },
    {
      key: 'closed' as const,
      label: 'Closed',
      icon: <FiArchive size={16} />,
      count: jobs.filter(j => j.status === 'closed').length,
      description: 'Completed jobs'
    },
    {
      key: 'archived' as const,
      label: 'Archived',
      icon: <FiArchive size={16} />,
      count: jobs.filter(j => j.status === 'archived').length,
      description: 'Archived jobs'
    }
  ]

  // Handle delete job
  const handleDeleteJob = async () => {
    if (!selectedJob) return
    
    setIsDeleting(true)
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`http://localhost:5000/api/jobs/${selectedJob._id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      })
      
      toast.success('Job deleted successfully')
      onJobDelete(selectedJob._id)
      setShowDeleteModal(false)
      setSelectedJob(null)
    } catch (error: any) {
      console.error('Error deleting job:', error)
      toast.error(error.response?.data?.error || 'Failed to delete job')
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle job status change
  const handleStatusChange = async (jobId: string, newStatus: Job['status']) => {
    try {
      await onJobStatusChange(jobId, newStatus)
    } catch (error) {
      console.error('Error in handleStatusChange:', error)
    }
  }

  // Navigate to applications page
  const navigateToApplications = (jobId: string) => {
    router.push(`/company/${companyId}/jobs/${jobId}/applications`)
  }

  // Navigate to job details page
  const navigateToJobDetails = (jobId: string) => {
    router.push(`/company/${companyId}/jobs/${jobId}`)
  }

  return (
    <>
      {/* Tabs Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-4"
      >
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-3">
            <Nav variant="pills" className="gap-2" activeKey={activeTab}>
              {tabs.map(tab => (
                <Nav.Item key={tab.key}>
                  <Nav.Link
                    eventKey={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      px-4 py-2 rounded-pill d-flex align-items-center gap-2
                      ${activeTab === tab.key 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'bg-light text-dark border'
                      }
                    `}
                    style={{
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                  >
                    {tab.icon}
                    <span className="fw-medium">{tab.label}</span>
                    {tab.count > 0 && (
                      <Badge 
                        bg={activeTab === tab.key ? 'light' : 'primary'} 
                        text={activeTab === tab.key ? 'dark' : 'white'}
                        pill 
                        className="ms-1"
                      >
                        {tab.count}
                      </Badge>
                    )}
                  </Nav.Link>
                </Nav.Item>
              ))}
            </Nav>
            
            {/* Active tab description */}
            <div className="mt-3">
              <small className="text-muted">
                {tabs.find(t => t.key === activeTab)?.description}
              </small>
            </div>
          </Card.Body>
        </Card>
      </motion.div>

      {/* Jobs List */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-5"
          >
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Loading jobs...</p>
          </motion.div>
        ) : filteredJobs.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-5"
          >
            <div className="display-1 mb-3 text-muted opacity-50">
              {activeTab === 'active' && <FiBriefcase />}
              {activeTab === 'draft' && <FiClock />}
              {(activeTab === 'closed' || activeTab === 'archived') && <FiArchive />}
            </div>
            <h3 className="h4 mb-2 fw-bold">No {activeTab} jobs found</h3>
            <p className="text-muted mb-4">
              {activeTab === 'active' 
                ? 'Get started by posting a new job listing'
                : activeTab === 'draft'
                ? 'Save your job as draft before publishing'
                : activeTab === 'closed'
                ? 'No closed jobs at the moment'
                : 'No archived jobs at the moment'
              }
            </p>
            {activeTab === 'active' && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="primary"
                  onClick={() => router.push(`/company/${companyId}/post-job`)}
                  className="px-4 py-2 d-inline-flex align-items-center gap-2"
                >
                  <FiPlus /> Post New Job
                </Button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="jobs"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="row g-4"
          >
            {filteredJobs.map((job, index) => {
              const activeApplicationsCount = getActiveApplicationsCount(job)
              const withdrawnCount = getWithdrawnApplicationsCount(job)
              const totalApplicationsCount = getTotalApplicationsCount(job)
              
              return (
                <Col key={job._id} xs={12}>
                  <motion.div
                    variants={itemVariants}
                    custom={index}
                    whileHover="hover"
                  >
                    <Card className="border-0 shadow-sm overflow-hidden">
                      <Card.Body className="p-0">
                        <Row className="g-0">
                          {/* Job Details */}
                          <Col lg={8} className="p-4">
                            <div className="d-flex align-items-start gap-3 mb-3">
                              {/* Company Logo */}
                              <div className="flex-shrink-0">
                                <div className="position-relative">
                                  {job.company?.logo ? (
                                    <Image
                                      src={getImageUrl(job.company.logo)}
                                      alt={job.company.name || job.companyName}
                                      roundedCircle
                                      className="border"
                                      style={{ 
                                        width: '60px', 
                                        height: '60px', 
                                        objectFit: 'cover',
                                        backgroundColor: '#f8f9fa'
                                      }}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.companyName || job.company?.name || 'Company')}&background=0a66c2&color=fff&size=60`
                                      }}
                                    />
                                  ) : (
                                    <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center"
                                      style={{ width: '60px', height: '60px' }}>
                                      <FiBriefcase className="text-primary" size={24} />
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Job Info */}
                              <div className="flex-grow-1">
                                <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                  <h5 className="h5 mb-0 fw-bold text-dark">{job.title}</h5>
                                  <div className="d-flex align-items-center gap-1">
                                    {job.isUrgent && (
                                      <Badge bg="danger" className="d-flex align-items-center gap-1 px-2 py-1">
                                        <FiClock size={12} /> Urgent
                                      </Badge>
                                    )}
                                    {job.isFeatured && (
                                      <Badge bg="warning" className="d-flex align-items-center gap-1 px-2 py-1">
                                        <FiTrendingUp size={12} /> Featured
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Job Meta */}
                                <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                                  <div className="d-flex align-items-center gap-1 text-muted">
                                    <FiMapPin size={16} />
                                    <span>{job.location}</span>
                                  </div>
                                  <div className="d-flex align-items-center gap-1 text-muted">
                                    <FiBriefcase size={16} />
                                    {getTypeBadge(job.type)}
                                  </div>
                                  <div className="d-flex align-items-center gap-1 text-muted">
                                    <FiDollarSign size={16} />
                                    <span className="fw-medium text-success">
                                      {formatSalary(job.salary)}
                                    </span>
                                  </div>
                                  {job.applicationDeadline && (
                                    <div className="d-flex align-items-center gap-1 text-muted">
                                      <FiCalendar size={16} />
                                      <span>Apply by {formatDate(job.applicationDeadline)}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Status and Stats */}
                                <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                                  {getStatusBadge(job.status)}
                                  <div className="d-flex align-items-center gap-1">
                                    <FiUsers size={16} />
                                    <span className="fw-medium">
                                      {activeApplicationsCount} active application(s)
                                      {withdrawnCount > 0 && (
                                        <span className="text-muted ms-1">
                                          ({withdrawnCount} withdrawn)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <small className="text-muted">
                                    Posted on {formatDate(job.createdAt)}
                                  </small>
                                </div>

                                {/* Job Description */}
                                <p className="text-muted mb-0">
                                  {job.description && job.description.length > 200
                                    ? `${job.description.substring(0, 200)}...`
                                    : job.description || 'No description provided'}
                                </p>
                              </div>
                            </div>
                          </Col>
                          
                          {/* Actions Sidebar */}
                          <Col lg={4} className="bg-light border-start p-4">
                            <div className="d-flex flex-column gap-3 h-100">
                              {/* Quick Stats */}
                              {totalApplicationsCount > 0 && (
                                <div className="mb-2">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <small className="text-muted">Applications</small>
                                    <div className="d-flex align-items-center gap-1">
                                      <small className="fw-medium">{activeApplicationsCount} active</small>
                                      {withdrawnCount > 0 && (
                                        <small className="text-danger">
                                          <FiX size={12} /> {withdrawnCount}
                                        </small>
                                      )}
                                    </div>
                                  </div>
                                  <ProgressBar 
                                    now={(activeApplicationsCount / 50) * 100} 
                                    max={100}
                                    variant="success"
                                    style={{ height: '6px' }}
                                  />
                                  {withdrawnCount > 0 && (
                                    <div className="mt-1 small text-danger">
                                      <FiX className="me-1" size={12} />
                                      {withdrawnCount} application(s) withdrawn
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Action Buttons */}
                              <div className="d-grid gap-2 mt-auto">
                                {/* View Job Button */}
                                <Button
                                  variant="outline-primary"
                                  className="d-flex align-items-center justify-content-center gap-2 py-2"
                                  onClick={() => navigateToJobDetails(job._id)}
                                >
                                  <FiEye /> View Job
                                </Button>

                                <Button
                                  variant="outline-secondary"
                                  className="d-flex align-items-center justify-content-center gap-2 py-2"
                                  onClick={() => onEditJob(job._id)}
                                >
                                  <FiEdit /> Edit Job
                                </Button>

                                {activeApplicationsCount > 0 && (
                                  <Button
                                    variant="outline-success"
                                    className="d-flex align-items-center justify-content-center gap-2 py-2"
                                    onClick={() => navigateToApplications(job._id)}
                                  >
                                    <FiUsers /> View Applications ({activeApplicationsCount})
                                  </Button>
                                )}

                                {/* Actions Dropdown */}
                                <Dropdown className="mt-2">
                                  <Dropdown.Toggle 
                                    variant="outline-dark" 
                                    className="w-100 d-flex align-items-center justify-content-center gap-2 py-2"
                                  >
                                    <FiExternalLink /> More Actions
                                  </Dropdown.Toggle>
                                  <Dropdown.Menu className="w-100">
                                    {/* Status Management */}
                                    {job.status === 'active' && (
                                      <Dropdown.Item 
                                        onClick={() => handleStatusChange(job._id, 'closed')}
                                        disabled={isUpdatingStatus === job._id}
                                        className="text-warning"
                                      >
                                        {isUpdatingStatus === job._id ? (
                                          <Spinner animation="border" size="sm" className="me-2" />
                                        ) : (
                                          <FiXCircle className="me-2 text-warning" />
                                        )}
                                        Close Job
                                      </Dropdown.Item>
                                    )}
                                    
                                    {job.status === 'closed' && (
                                      <Dropdown.Item 
                                        onClick={() => handleStatusChange(job._id, 'active')}
                                        disabled={isUpdatingStatus === job._id}
                                        className="text-success"
                                      >
                                        {isUpdatingStatus === job._id ? (
                                          <Spinner animation="border" size="sm" className="me-2" />
                                        ) : (
                                          <FiCheckCircle className="me-2 text-success" />
                                        )}
                                        Reactivate Job
                                      </Dropdown.Item>
                                    )}
                                    
                                    {job.status !== 'archived' && (
                                      <Dropdown.Item 
                                        onClick={() => handleStatusChange(job._id, 'archived')}
                                        disabled={isUpdatingStatus === job._id}
                                        className="text-secondary"
                                      >
                                        {isUpdatingStatus === job._id ? (
                                          <Spinner animation="border" size="sm" className="me-2" />
                                        ) : (
                                          <FiArchive className="me-2 text-secondary" />
                                        )}
                                        Archive Job
                                      </Dropdown.Item>
                                    )}
                                    
                                    {job.status === 'archived' && (
                                      <Dropdown.Item 
                                        onClick={() => handleStatusChange(job._id, 'active')}
                                        disabled={isUpdatingStatus === job._id}
                                      >
                                        {isUpdatingStatus === job._id ? (
                                          <Spinner animation="border" size="sm" className="me-2" />
                                        ) : (
                                          <FiRefreshCw className="me-2" />
                                        )}
                                        Unarchive Job
                                      </Dropdown.Item>
                                    )}
                                    
                                    <Dropdown.Divider />
                                    
                                    <Dropdown.Item 
                                      onClick={() => {
                                        setSelectedJob(job)
                                        setShowDeleteModal(true)
                                      }}
                                      className="text-danger"
                                    >
                                      <FiTrash2 className="me-2" />
                                      Delete Job
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onHide={() => {
          setShowDeleteModal(false)
          setSelectedJob(null)
        }} 
        centered
        size="lg"
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="h5 fw-bold">
            <FiAlertCircle className="me-2 text-danger" size={24} />
            Delete Job
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-0">
          <Alert variant="danger" className="mb-3 border-0">
            <Alert.Heading className="h6">Warning: This action is permanent!</Alert.Heading>
            <p className="mb-0 small">
              Deleting this job will permanently remove all data including applications.
            </p>
          </Alert>
          
          <div className="mb-4">
            <p className="mb-2">
              Are you sure you want to permanently delete the job?
            </p>
            <div className="bg-light p-3 rounded">
              <h6 className="fw-bold mb-1">{selectedJob?.title}</h6>
              <small className="text-muted d-block mb-1">
                {selectedJob?.company?.name || selectedJob?.companyName}
              </small>
              <small className="text-muted">
                Posted on {selectedJob && formatDate(selectedJob.createdAt)}
              </small>
            </div>
          </div>
          
          {selectedJob && getActiveApplicationsCount(selectedJob) > 0 && (
            <Alert variant="warning" className="border-0">
              <FiUsers className="me-2" />
              This job has <strong>{getActiveApplicationsCount(selectedJob)} active application(s)</strong> that will also be deleted.
            </Alert>
          )}
          
          {selectedJob && getWithdrawnApplicationsCount(selectedJob) > 0 && (
            <Alert variant="secondary" className="border-0">
              <FiX className="me-2" />
              <strong>{getWithdrawnApplicationsCount(selectedJob)} withdrawn application(s)</strong> will also be deleted.
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button 
            variant="light" 
            onClick={() => {
              setShowDeleteModal(false)
              setSelectedJob(null)
            }}
            className="px-4"
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteJob} 
            disabled={isDeleting}
            className="px-4"
          >
            {isDeleting ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              'Delete Permanently'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default JobTabs