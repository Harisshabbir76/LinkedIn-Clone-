'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../../../context/AuthContext'
import axios from 'axios'
import { toast, Toaster } from 'react-hot-toast'
import { motion } from 'framer-motion'
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
  ProgressBar,
  Alert
} from 'react-bootstrap'
import {
  FiBriefcase,
  FiPlus,
  FiFilter,
  FiSearch,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
  FiBarChart2,
  FiClock,
  FiUserCheck,
  FiMapPin,
  FiDollarSign,
  FiCheckCircle,
  FiArchive,
  FiEye,
  FiEdit
} from 'react-icons/fi'
import JobTabs from '../../../../components/JobTabs'

// Interfaces
interface Company {
  _id: string
  name: string
  description: string
  logo?: string
  location: string
  owner: string
  teamMembers: Array<{
    user: {
      _id: string
      name: string
      email: string
    }
    role: string
  }>
  jobs: string[]
}

interface Job {
  _id: string
  title: string
  description: string
  location: string
  type: string
  employmentType: string
  salary: any
  company: {
    _id: string
    name: string
    logo?: string
  }
  companyName: string
  applications?: any[]
  applicants?: any[]
  createdAt: string
  updatedAt: string
  status: 'active' | 'draft' | 'closed' | 'archived' | 'paused'
  isUrgent?: boolean
  isFeatured?: boolean
  experience?: {
    minYears: number
    maxYears: number
  }
  applicationDeadline?: string
}

interface Stats {
  totalJobs: number
  activeJobs: number
  totalApplications: number
  avgApplicationsPerJob: number
  urgentJobs: number
  featuredJobs: number
}

export default function CompanyJobsPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const companyId = params.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [companyLoading, setCompanyLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    avgApplicationsPerJob: 0,
    urgentJobs: 0,
    featuredJobs: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)

  // Helper function to get image URL
  const getImageUrl = (imagePath: string | undefined | null) => {
    if (!imagePath) return ''
    if (imagePath.startsWith('http')) return imagePath
    return `http://localhost:5000/${imagePath.replace(/\\/g, '/')}`
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Apply filters and search
  const applyFilters = (jobsList: Job[]) => {
    let result = [...jobsList]

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim()
      result = result.filter(job => 
        job.title.toLowerCase().includes(term) ||
        job.description.toLowerCase().includes(term) ||
        job.location.toLowerCase().includes(term) ||
        job.type.toLowerCase().includes(term) ||
        job.employmentType?.toLowerCase().includes(term) ||
        job.companyName.toLowerCase().includes(term)
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(job => job.status === statusFilter)
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      result = result.filter(job => job.employmentType === typeFilter || job.type === typeFilter)
    }

    // Apply sorting
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'applications':
        result.sort((a, b) => {
          const aCount = a.applications?.length || a.applicants?.length || 0
          const bCount = b.applications?.length || b.applicants?.length || 0
          return bCount - aCount
        })
        break
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
    }

    return result
  }

  // Reapply filters when any filter changes
  useEffect(() => {
    if (jobs.length > 0) {
      const filtered = applyFilters(jobs)
      setFilteredJobs(filtered)
    }
  }, [jobs, searchTerm, statusFilter, typeFilter, sortBy])

  // Fetch company and check authorization
  useEffect(() => {
    const checkAuthorization = async () => {
      if (authLoading) return
      
      if (!isAuthenticated || !user) {
        router.push('/login')
        return
      }

      try {
        setCompanyLoading(true)
        const token = localStorage.getItem('token')
        const companyResponse = await axios.get(`http://localhost:5000/api/company/${companyId}`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        })

        const companyData = companyResponse.data.company || companyResponse.data
        
        // Check if user is owner or team member with appropriate role
        const isOwner = companyData.owner === user._id
        const isTeamMember = companyData.teamMembers?.some((member: any) => 
          member.user?._id === user._id && ['admin', 'recruiter', 'manager', 'hr'].includes(member.role)
        )
        
        if (isOwner || isTeamMember) {
          setCompany(companyData)
          setIsAuthorized(true)
          await fetchJobs()
        } else {
          toast.error('You are not authorized to view this company\'s jobs')
          router.push('/dashboard')
        }
      } catch (error: any) {
        console.error('Error fetching company:', error)
        if (error.response?.status === 401) {
          toast.error('Session expired. Please login again.')
          router.push('/login')
        } else {
          toast.error('Failed to load company data')
          router.push('/dashboard')
        }
      } finally {
        setCompanyLoading(false)
      }
    }

    checkAuthorization()
  }, [companyId, user, isAuthenticated, authLoading, router])

  // Fetch jobs function
  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('No authentication token found');
        router.push('/login');
        return;
      }

      const headers = { 
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      };
      
      let jobsData: Job[] = [];
      
      // Try endpoints in order of preference
      const endpoints = [
        `http://localhost:5000/api/jobs/company/${companyId}`,
        `http://localhost:5000/api/jobs?companyId=${companyId}`,
        `http://localhost:5000/api/jobs/user/my-jobs`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, { headers });
          
          if (response.data) {
            // Handle different response structures
            if (Array.isArray(response.data)) {
              jobsData = response.data;
            } else if (response.data.jobs && Array.isArray(response.data.jobs)) {
              jobsData = response.data.jobs;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              jobsData = response.data.data;
            } else {
              continue; // Try next endpoint
            }
            
            // If using the general my-jobs endpoint, filter by company
            if (endpoint.includes('my-jobs')) {
              jobsData = jobsData.filter((job: Job) => 
                job.company && job.company._id === companyId
              );
            }
            
            console.log(`Successfully fetched jobs from ${endpoint}:`, jobsData.length, 'jobs');
            break; // Exit loop if successful
          }
        } catch (endpointError) {
          console.log(`Endpoint ${endpoint} failed, trying next...`);
          continue;
        }
      }
      
      if (jobsData.length === 0) {
        console.log('No jobs found for this company');
        toast.error('No jobs found for this company');
      } else {
        toast.success(`Loaded ${jobsData.length} jobs`);
      }
      
      setJobs(jobsData);
      setFilteredJobs(applyFilters(jobsData));
      updateStats(jobsData);
      
    } catch (error: any) {
      console.error('All endpoints failed:', error);
      toast.error('Failed to load jobs. Please check your connection or try again later.');
      setJobs([]);
      setFilteredJobs([]);
      updateStats([]);
    } finally {
      setLoading(false);
    }
  };

  // Update stats
  const updateStats = (jobsList: Job[]) => {
    const totalJobs = jobsList.length
    const activeJobs = jobsList.filter(job => job.status === 'active').length
    const totalApplications = jobsList.reduce((sum, job) => {
      const appCount = job.applications?.length || job.applicants?.length || 0;
      return sum + appCount;
    }, 0)
    const urgentJobs = jobsList.filter(job => job.isUrgent).length
    const featuredJobs = jobsList.filter(job => job.isFeatured).length
    
    setStats({
      totalJobs,
      activeJobs,
      totalApplications,
      avgApplicationsPerJob: totalJobs > 0 ? Math.round((totalApplications / totalJobs) * 10) / 10 : 0,
      urgentJobs,
      featuredJobs
    })
  }

  // Handle job deletion
  const handleJobDelete = async (jobId: string) => {
    if (!window.confirm('Are you sure you want to delete this job?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token')
      await axios.delete(
        `http://localhost:5000/api/jobs/${jobId}`,
        {
          headers: { 
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        }
      );
      
      const updatedJobs = jobs.filter(job => job._id !== jobId);
      setJobs(updatedJobs);
      setFilteredJobs(applyFilters(updatedJobs));
      toast.success('Job deleted successfully');
    } catch (error: any) {
      console.error('Error deleting job:', error);
      toast.error(error.response?.data?.error || 'Failed to delete job');
    }
  };

  // Handle job status change
  const handleJobStatusChange = async (jobId: string, newStatus: Job['status']) => {
    setIsUpdatingStatus(jobId);
    try {
      const token = localStorage.getItem('token')
      // Update job status
      await axios.put(
        `http://localhost:5000/api/jobs/${jobId}/status`, 
        { status: newStatus },
        { 
          headers: { 
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        }
      );
      
      toast.success(`Job status updated to ${newStatus}`);
      
      // Update local state
      const updatedJobs = jobs.map(job => 
        job._id === jobId ? { ...job, status: newStatus } : job
      );
      setJobs(updatedJobs);
      setFilteredJobs(applyFilters(updatedJobs));
      
    } catch (error: any) {
      console.error('Error updating job status:', error);
      toast.error(error.response?.data?.error || 'Failed to update job status');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }

  // Handle status filter change
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
  }

  // Handle type filter change
  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value);
  }

  // Handle sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value);
  }

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setSortBy('newest');
  }

  // Navigate to edit job page
  const navigateToEditJob = (jobId: string) => {
    router.push(`/company/${companyId}/jobs/${jobId}/edit`);
  }

  // Loading state
  if (companyLoading || authLoading || loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading company jobs...</p>
      </div>
    )
  }

  // Not authorized
  if (!isAuthorized || !company) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <Alert variant="danger" className="text-center">
          <FiBriefcase className="mb-3" size={48} />
          <h4>Access Denied</h4>
          <p>You are not authorized to view this company's jobs.</p>
          <Button variant="primary" onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <Container fluid className="p-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-bottom"
        >
          <Container className="py-4">
            <Row className="align-items-center">
              <Col xs={12} md={8}>
                <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
                  {company.logo ? (
                    <motion.div
                      className="position-relative"
                      whileHover={{ scale: 1.1 }}
                    >
                      <Image
                        src={getImageUrl(company.logo)}
                        alt={company.name}
                        roundedCircle
                        className="border"
                        style={{ 
                          width: '60px', 
                          height: '60px', 
                          objectFit: 'cover',
                          backgroundColor: '#f8f9fa'
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=0a66c2&color=fff&size=60`;
                        }}
                      />
                    </motion.div>
                  ) : (
                    <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center"
                      style={{ width: '60px', height: '60px' }}>
                      <FiBriefcase className="text-white" size={24} />
                    </div>
                  )}
                  <div>
                    <h1 className="h2 mb-1 fw-bold">{company.name} Jobs</h1>
                    <p className="text-muted mb-0">
                      Manage and track all job postings and applications for your company
                    </p>
                  </div>
                </div>
              </Col>
              <Col xs={12} md={4} className="text-md-end">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="primary"
                    className="d-inline-flex align-items-center gap-2 px-4 py-2"
                    onClick={() => router.push(`/company/${companyId}/post-job`)}
                  >
                    <FiPlus /> Post New Job
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
          className="bg-light py-4"
        >
          <Container>
            <Row className="g-3">
              {[
                {
                  title: 'Total Jobs',
                  value: stats.totalJobs,
                  icon: <FiBriefcase className="text-primary" size={20} />,
                  color: 'primary',
                  description: 'All job postings'
                },
                {
                  title: 'Active Jobs',
                  value: stats.activeJobs,
                  icon: <FiTrendingUp className="text-success" size={20} />,
                  color: 'success',
                  description: 'Currently open'
                },
                {
                  title: 'Total Applications',
                  value: stats.totalApplications,
                  icon: <FiUsers className="text-info" size={20} />,
                  color: 'info',
                  description: 'All applications received'
                },
                {
                  title: 'Avg Applications',
                  value: stats.avgApplicationsPerJob,
                  icon: <FiBarChart2 className="text-warning" size={20} />,
                  color: 'warning',
                  description: 'Per job'
                },
                {
                  title: 'Urgent Jobs',
                  value: stats.urgentJobs,
                  icon: <FiClock className="text-danger" size={20} />,
                  color: 'danger',
                  description: 'Priority hiring'
                },
                {
                  title: 'Featured Jobs',
                  value: stats.featuredJobs,
                  icon: <FiUserCheck className="text-purple" size={20} />,
                  color: 'purple',
                  description: 'Promoted listings'
                }
              ].map((stat, index) => (
                <Col key={index} xs={6} md={4} lg={2}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Body className="p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className={`bg-${stat.color}-subtle rounded-circle p-2`}>
                            {stat.icon}
                          </div>
                          <div className="fs-4 fw-bold text-dark">{stat.value}</div>
                        </div>
                        <Card.Title className="h6 mb-1">{stat.title}</Card.Title>
                        <Card.Text className="small text-muted mb-0">
                          {stat.description}
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
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
                  <Card.Body className="p-3">
                    <Row className="g-3 align-items-center">
                      <Col md={4}>
                        <InputGroup>
                          <InputGroup.Text className="bg-transparent border-end-0">
                            <FiSearch />
                          </InputGroup.Text>
                          <Form.Control
                            placeholder="Search jobs by title, description, location, or type..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="border-start-0"
                          />
                          {searchTerm && (
                            <Button
                              variant="outline-secondary"
                              onClick={() => setSearchTerm('')}
                              className="border-start-0"
                            >
                              Clear
                            </Button>
                          )}
                        </InputGroup>
                      </Col>
                      <Col md={2}>
                        <Form.Select
                          value={statusFilter}
                          onChange={handleStatusFilterChange}
                        >
                          <option value="all">All Status</option>
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="closed">Closed</option>
                          <option value="archived">Archived</option>
                          <option value="paused">Paused</option>
                        </Form.Select>
                      </Col>
                      <Col md={2}>
                        <Form.Select
                          value={typeFilter}
                          onChange={handleTypeFilterChange}
                        >
                          <option value="all">All Types</option>
                          <option value="Full-time">Full-time</option>
                          <option value="Part-time">Part-time</option>
                          <option value="Contract">Contract</option>
                          <option value="Internship">Internship</option>
                          <option value="Remote">Remote</option>
                        </Form.Select>
                      </Col>
                      <Col md={2}>
                        <Form.Select
                          value={sortBy}
                          onChange={handleSortChange}
                        >
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="applications">Most Applications</option>
                          <option value="title">A-Z</option>
                        </Form.Select>
                      </Col>
                      <Col md={2} className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
                          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                            <Button
                              variant="outline-danger"
                              onClick={clearFilters}
                              className="d-inline-flex align-items-center gap-1"
                            >
                              <FiFilter /> Clear Filters
                            </Button>
                          )}
                          <Button
                            variant="outline-secondary"
                            onClick={fetchJobs}
                            className="d-inline-flex align-items-center gap-1"
                            disabled={loading}
                          >
                            <FiRefreshCw /> Refresh
                          </Button>
                        </div>
                      </Col>
                    </Row>
                    
                    {/* Active Filters Display */}
                    {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                      <Row className="mt-3">
                        <Col xs={12}>
                          <div className="d-flex align-items-center flex-wrap gap-2">
                            <small className="text-muted me-2">Active filters:</small>
                            {searchTerm && (
                              <Badge bg="info" className="d-flex align-items-center gap-1">
                                <FiSearch size={12} /> Search: "{searchTerm}"
                                <Button
                                  variant="outline-light"
                                  size="sm"
                                  className="ms-1 p-0 border-0"
                                  onClick={() => setSearchTerm('')}
                                  style={{ fontSize: '0.6rem', lineHeight: 1 }}
                                >
                                  ×
                                </Button>
                              </Badge>
                            )}
                            {statusFilter !== 'all' && (
                              <Badge bg="warning" className="d-flex align-items-center gap-1">
                                Status: {statusFilter}
                                <Button
                                  variant="outline-light"
                                  size="sm"
                                  className="ms-1 p-0 border-0"
                                  onClick={() => setStatusFilter('all')}
                                  style={{ fontSize: '0.6rem', lineHeight: 1 }}
                                >
                                  ×
                                </Button>
                              </Badge>
                            )}
                            {typeFilter !== 'all' && (
                              <Badge bg="success" className="d-flex align-items-center gap-1">
                                Type: {typeFilter}
                                <Button
                                  variant="outline-light"
                                  size="sm"
                                  className="ms-1 p-0 border-0"
                                  onClick={() => setTypeFilter('all')}
                                  style={{ fontSize: '0.6rem', lineHeight: 1 }}
                                >
                                  ×
                                </Button>
                              </Badge>
                            )}
                            <Badge bg="secondary" className="d-flex align-items-center gap-1">
                              Sort: {sortBy === 'newest' ? 'Newest First' : 
                                    sortBy === 'oldest' ? 'Oldest First' : 
                                    sortBy === 'applications' ? 'Most Applications' : 'A-Z'}
                            </Badge>
                            <span className="ms-2 text-muted">
                              Showing {filteredJobs.length} of {jobs.length} jobs
                            </span>
                          </div>
                        </Col>
                      </Row>
                    )}
                  </Card.Body>
                </Card>
              </motion.div>

              {/* Job Tabs Component */}
              <JobTabs
                jobs={filteredJobs}
                companyId={companyId}
                onJobUpdate={fetchJobs}
                onJobDelete={handleJobDelete}
                onJobStatusChange={handleJobStatusChange}
                onEditJob={navigateToEditJob}
                isLoading={loading}
                isUpdatingStatus={isUpdatingStatus}
              />

              {/* Empty State */}
              {filteredJobs.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-5"
                >
                  <Card className="border-0 shadow-sm">
                    <Card.Body className="py-5">
                      <FiBriefcase className="text-muted mb-3" size={48} />
                      <h4 className="mb-2">No jobs found</h4>
                      <p className="text-muted mb-4">
                        {jobs.length === 0 
                          ? 'Get started by posting your first job opening'
                          : 'No jobs match your current filters. Try changing your search criteria.'}
                      </p>
                      {jobs.length === 0 && (
                        <Button
                          variant="primary"
                          className="d-inline-flex align-items-center gap-2"
                          onClick={() => router.push(`/company/${companyId}/post-job`)}
                        >
                          <FiPlus /> Post Your First Job
                        </Button>
                      )}
                      {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                        <Button
                          variant="outline-secondary"
                          onClick={clearFilters}
                          className="ms-2"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </Card.Body>
                  </Card>
                </motion.div>
              )}
            </Col>
          </Row>
        </Container>
      </Container>
    </>
  )
}