'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../../context/AuthContext'
import axios from 'axios'
import Link from 'next/link'
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
  Alert
} from 'react-bootstrap'

interface Application {
  _id: string
  job: {
    _id: string
    title: string
    company: {
      _id: string
      name: string
      logo?: string
    }
    location: string
    employmentType: string
    salary?: {
      min?: number
      max?: number
      currency?: string
    }
    createdAt: string
  }
  status: 'pending' | 'reviewed' | 'shortlisted' | 'interview' | 'accepted' | 'rejected' | 'withdrawn'
  appliedAt: string
  score?: number
  skillsMatch?: number
  resume: string
  coverLetter?: string
  viewedAt?: string
  // Add these fields based on your backend response
  company?: {
    _id: string
    name: string
    logo?: string
    industry?: string
  }
}

export default function AppliedJobsPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAppliedJobs()
    }
  }, [isAuthenticated, user])

  const fetchAppliedJobs = async () => {
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('token')
      
      const response = await axios.get('http://localhost:5000/api/applications/my-applications', {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      })
      
      if (response.data.applications) {
        setApplications(response.data.applications)
      }
    } catch (err: any) {
      console.error('Error fetching applied jobs:', err)
      setError(err.response?.data?.error || 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  // Add this function to your component
  const handleWithdrawApplication = async (applicationId: string) => {
    if (!window.confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) {
      return;
    }

    try {
      setWithdrawingId(applicationId);
      const token = localStorage.getItem('token');
      const response = await axios.delete(
        `http://localhost:5000/api/applications/${applicationId}`,
        {
          headers: { 
            Authorization: token || '',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.message) {
        // Show success message
        alert('Application withdrawn successfully!');
        
        // Refresh the applications list
        await fetchAppliedJobs();
      }
    } catch (err: any) {
      console.error('Error withdrawing application:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          'Failed to withdraw application. Please try again.';
      alert(errorMessage);
    } finally {
      setWithdrawingId(null);
    }
  };

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
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return 'Today'
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays} days ago`
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch (error) {
      return 'Invalid date'
    }
  }

  // Get status text
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      reviewed: 'Reviewed',
      shortlisted: 'Shortlisted',
      interview: 'Interview',
      accepted: 'Accepted',
      rejected: 'Rejected',
      withdrawn: 'Withdrawn'
    }
    return statusMap[status] || status
  }

  // Format salary
  const formatSalary = (salary?: { min?: number; max?: number; currency?: string }) => {
    if (!salary) return 'Not specified'
    const { min, max, currency = 'USD' } = salary
    if (min && max) {
      return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`
    } else if (min) {
      return `From ${currency} ${min.toLocaleString()}`
    } else if (max) {
      return `Up to ${currency} ${max.toLocaleString()}`
    }
    return 'Not specified'
  }

  // Get image URL
  const getImageUrl = (imagePath?: string) => {
    if (!imagePath) return ''
    if (imagePath.startsWith('http')) return imagePath
    // Handle both forward and backward slashes
    return `http://localhost:5000/${imagePath.replace(/\\/g, '/')}`
  }

  // Get initials
  const getInitials = (name?: string) => {
    if (!name) return 'NA'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Get company name - handle different possible structures
  const getCompanyName = (application: Application) => {
    // Try company from application first
    if (application.company?.name) {
      return application.company.name
    }
    // Then try job.company
    if (application.job?.company?.name) {
      return application.job.company.name
    }
    return 'Unknown Company'
  }

  // Get company logo - handle different possible structures
  const getCompanyLogo = (application: Application) => {
    // Try company from application first
    if (application.company?.logo) {
      return application.company.logo
    }
    // Then try job.company
    if (application.job?.company?.logo) {
      return application.job.company.logo
    }
    return null
  }

  // Get company ID
  const getCompanyId = (application: Application) => {
    if (application.company?._id) {
      return application.company._id
    }
    if (application.job?.company?._id) {
      return application.job.company._id
    }
    return null
  }

  // Filter applications
  const filteredApplications = activeFilter === 'all' 
    ? applications 
    : applications.filter(app => app.status === activeFilter)

  const filteredAndSearchedApplications = searchTerm
    ? filteredApplications.filter(app => {
        const jobTitle = app.job?.title?.toLowerCase() || ''
        const companyName = getCompanyName(app).toLowerCase()
        const location = app.job?.location?.toLowerCase() || ''
        
        return (
          jobTitle.includes(searchTerm.toLowerCase()) ||
          companyName.includes(searchTerm.toLowerCase()) ||
          location.includes(searchTerm.toLowerCase())
        )
      })
    : filteredApplications

  const sortedApplications = [...filteredAndSearchedApplications].sort((a, b) => {
    return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
  })

  // Clear search
  const clearSearch = () => {
    setSearchTerm('')
  }

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted fw-medium">Loading your applications...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <>
      {/* Custom CSS */}
      <style jsx global>{`
        .gradient-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
        
        .table-row-hover:hover {
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
          cursor: pointer;
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
        
        .filter-btn {
          border-radius: 10px !important;
          padding: 12px 16px !important;
          border: 1px solid #e0e0e0 !important;
          background-color: #f8f9fa !important;
          transition: all 0.3s ease !important;
          min-width: 120px;
        }
        
        .filter-btn.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          color: white !important;
          border-color: transparent !important;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .company-logo {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid #e0e0e0;
          background: white;
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
          align-items-center;
          justify-content: center;
          font-size: 1.25rem;
        }
      `}</style>

      <Container fluid className="p-0 bg-light min-vh-100">
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
                      <Fi.FiBriefcase className="text-white" size={28} />
                    </div>
                  </motion.div>
                  <div>
                    <h1 className="h2 mb-2 fw-bold text-dark">My Applications</h1>
                    <p className="text-muted mb-0">
                      Track all your job applications in one place
                    </p>
                    {user && (
                      <div className="mt-2">
                        <Badge bg="info" className="px-3 py-1 rounded-pill fw-medium">
                          {user.name}
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
                    variant="primary"
                    className="d-inline-flex align-items-center gap-2 px-4 py-2 rounded-pill"
                    onClick={fetchAppliedJobs}
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

        {/* Main Content */}
        <Container className="py-4">
          {/* Filters and Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-4"
          >
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                {/* Search Input */}
                <div className="mb-4">
                  <InputGroup className="search-group">
                    <InputGroup.Text className="bg-transparent border-0 ps-3">
                      <Fi.FiSearch className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      placeholder="Search by job title, company, or location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-0 search-input ps-0"
                    />
                    {searchTerm && (
                      <Button
                        variant="link"
                        className="border-0 text-muted ms-2 me-3"
                        onClick={clearSearch}
                        title="Clear search"
                      >
                        <Fi.FiX size={18} />
                      </Button>
                    )}
                  </InputGroup>
                </div>

                {/* Status Filters */}
                <div className="d-flex flex-wrap gap-2">
                  <Button
                    variant={activeFilter === 'all' ? 'primary' : 'outline-secondary'}
                    className={`filter-btn d-flex align-items-center gap-2 ${activeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveFilter('all')}
                  >
                    <Fi.FiGrid />
                    All ({applications.length})
                  </Button>
                  
                  {['pending', 'reviewed', 'shortlisted', 'interview', 'accepted', 'rejected', 'withdrawn'].map((status) => (
                    <Button
                      key={status}
                      variant={activeFilter === status ? 'primary' : 'outline-secondary'}
                      className={`filter-btn d-flex align-items-center gap-2 text-capitalize ${activeFilter === status ? 'active' : ''}`}
                      onClick={() => setActiveFilter(status)}
                    >
                      {getStatusIcon(status)}
                      {getStatusText(status)} ({applications.filter(app => app.status === status).length})
                    </Button>
                  ))}
                </div>

                {/* Active Filters */}
                {(searchTerm || activeFilter !== 'all') && (
                  <div className="mt-3 pt-3 border-top">
                    <div className="d-flex align-items-center flex-wrap gap-2">
                      <small className="text-muted me-2 fw-medium">Active filters:</small>
                      {searchTerm && (
                        <Badge bg="info" className="d-flex align-items-center gap-1 px-3 py-1 rounded-pill">
                          <Fi.FiSearch size={12} /> Search: "{searchTerm}"
                          <Button
                            variant="outline-light"
                            size="sm"
                            className="ms-1 p-0 border-0"
                            onClick={clearSearch}
                          >
                            ×
                          </Button>
                        </Badge>
                      )}
                      {activeFilter !== 'all' && (
                        <Badge bg="warning" className="d-flex align-items-center gap-1 px-3 py-1 rounded-pill text-capitalize">
                          {getStatusIcon(activeFilter)}
                          Status: {activeFilter}
                          <Button
                            variant="outline-light"
                            size="sm"
                            className="ms-1 p-0 border-0"
                            onClick={() => setActiveFilter('all')}
                          >
                            ×
                          </Button>
                        </Badge>
                      )}
                      <div className="ms-2 text-muted small">
                        Found {sortedApplications.length} application{sortedApplications.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
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
                    <h5 className="fw-bold mb-1">My Job Applications</h5>
                    <p className="text-muted small mb-0">
                      {loading ? (
                        <span>Loading applications...</span>
                      ) : (
                        <span>
                          {sortedApplications.length} application{sortedApplications.length !== 1 ? 's' : ''} found
                          {searchTerm && ` for "${searchTerm}"`}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="text-muted small d-flex align-items-center gap-2">
                    <Fi.FiInfo className="h-3 w-3" />
                    <span>Sorted by most recent</span>
                  </div>
                </div>
              </div>
              
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="px-4 py-3 border-top-0 fw-semibold text-muted">Job Details</th>
                      <th className="px-4 py-3 border-top-0 fw-semibold text-muted">Company</th>
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
                              Loading your applications...
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-5 text-center">
                          <Alert variant="danger" className="border-0 bg-light">
                            <Fi.FiAlertTriangle className="h2 mb-3 text-danger" />
                            <Alert.Heading className="fw-bold">Error Loading Applications</Alert.Heading>
                            <p>{error}</p>
                            <Button
                              variant="primary"
                              className="mt-2 rounded-pill px-4"
                              onClick={fetchAppliedJobs}
                            >
                              <Fi.FiRefreshCw className="me-2" />
                              Try Again
                            </Button>
                          </Alert>
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
                                <Fi.FiBriefcase className="text-muted" size={48} />
                              </div>
                            </div>
                            <h4 className="h5 fw-bold mb-2">
                              {searchTerm ? 'No matches found' : 'No applications yet'}
                            </h4>
                            <p className="text-muted mb-4">
                              {searchTerm 
                                ? `No applications match "${searchTerm}". Try a different search term.`
                                : "You haven't applied to any jobs yet. Start your job search today!"}
                            </p>
                            {searchTerm ? (
                              <Button
                                variant="outline-primary"
                                onClick={clearSearch}
                                className="rounded-pill px-4"
                              >
                                <Fi.FiX className="me-1" />
                                Clear Search
                              </Button>
                            ) : (
                              <Button
                                variant="primary"
                                href="/jobs"
                                as={Link}
                                className="rounded-pill px-4"
                              >
                                <Fi.FiSearch className="me-1" />
                                Browse Jobs
                              </Button>
                            )}
                          </motion.div>
                        </td>
                      </tr>
                    ) : (
                      sortedApplications.map((application) => {
                        const companyName = getCompanyName(application)
                        const companyLogo = getCompanyLogo(application)
                        const companyId = getCompanyId(application)
                        
                        return (
                          <motion.tr 
                            key={application._id} 
                            className="table-row-hover"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                            whileHover={{ backgroundColor: 'rgba(102, 126, 234, 0.05)' }}
                          >
                            {/* Job Details Column with Logo */}
                            <td className="px-4 py-3 align-middle">
                              <div className="d-flex align-items-center gap-3">
                                <div className="flex-shrink-0">
                                  {companyLogo ? (
                                    <Image
                                      src={getImageUrl(companyLogo)}
                                      alt={companyName}
                                      className="company-logo shadow-sm"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.style.display = 'none'
                                        const parent = target.parentElement
                                        if (parent) {
                                          parent.innerHTML = `
                                            <div class="company-logo bg-primary bg-opacity-10 d-flex align-items-center justify-content-center">
                                              <span class="text-primary fw-bold">
                                                ${getInitials(companyName)}
                                              </span>
                                            </div>
                                          `
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="company-logo bg-primary bg-opacity-10 d-flex align-items-center justify-content-center">
                                      <span className="text-primary fw-bold">
                                        {getInitials(companyName)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="fw-semibold">{application.job?.title || 'Unknown Job'}</div>
                                  <div className="small text-muted d-flex align-items-center gap-2">
                                    <Fi.FiMapPin className="h-3 w-3" />
                                    {application.job?.location || 'Location not specified'}
                                  </div>
                                  <div className="small text-muted d-flex align-items-center gap-2 mt-1">
                                    <Fi.FiBriefcase className="h-3 w-3" />
                                    {application.job?.employmentType || 'Not specified'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            
                            {/* Company Name Column */}
                            <td className="px-4 py-3 align-middle">
                              <div className="fw-medium">{companyName}</div>
                              {companyId && (
                                <Link 
                                  href={`/company/${companyId}`}
                                  className="small text-primary text-decoration-none d-inline-flex align-items-center gap-1"
                                >
                                  <Fi.FiExternalLink className="h-3 w-3" />
                                  View Company
                                </Link>
                              )}
                              {application.job?.salary && (
                                <div className="small text-muted d-flex align-items-center gap-1 mt-1">
                                  <Fi.FiDollarSign className="h-3 w-3" />
                                  {formatSalary(application.job.salary)}
                                </div>
                              )}
                            </td>
                            
                            {/* Status Column - Score removed */}
                            <td className="px-4 py-3 align-middle">
                              <Badge 
                                bg={getStatusColor(application.status)}
                                className="status-badge"
                              >
                                {getStatusIcon(application.status)}
                                {getStatusText(application.status)}
                              </Badge>
                            </td>
                            
                            {/* Applied Date Column */}
                            <td className="px-4 py-3 align-middle">
                              <div>
                                <div className="small fw-semibold">
                                  {formatDate(application.appliedAt)}
                                </div>
                                {application.viewedAt && (
                                  <div className="small text-muted d-flex align-items-center gap-1">
                                    <Fi.FiEye className="h-3 w-3" />
                                    Viewed
                                  </div>
                                )}
                              </div>
                            </td>
                            
                            {/* Actions Column */}
                            <td className="px-4 py-3 align-middle text-end">
                              <div className="d-flex gap-2 justify-content-end">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="d-flex align-items-center gap-1 rounded-pill px-3"
                                  href={`/jobs/${application.job?._id}`}
                                  as={Link}
                                >
                                  <Fi.FiEye className="h-3 w-3" />
                                  View Job
                                </Button>
                                {['pending', 'reviewed', 'shortlisted'].includes(application.status) && (
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    className="d-flex align-items-center gap-1 rounded-pill px-3"
                                    onClick={() => handleWithdrawApplication(application._id)}
                                    disabled={withdrawingId === application._id || loading}
                                  >
                                    {withdrawingId === application._id ? (
                                      <>
                                        <Spinner animation="border" size="sm" className="me-1" />
                                        Withdrawing...
                                      </>
                                    ) : (
                                      <>
                                        <Fi.FiX className="h-3 w-3" />
                                        Withdraw
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })
                    )}
                  </tbody>
                </Table>
              </div>
              
              {!loading && sortedApplications.length > 0 && (
                <div className="p-3 border-top bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="text-muted small">
                      Showing {sortedApplications.length} of {applications.length} applications
                      {searchTerm && ` matching "${searchTerm}"`}
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
        </Container>
      </Container>
    </>
  )
}