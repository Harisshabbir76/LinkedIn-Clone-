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
} from 'react-icons/fi'
import JobTabs from '../../../../components/JobTabs'

interface Application {
  _id: string
  applicant: {
    _id: string
    name: string
    email: string
    profileImage?: string
  }
  status: 'pending' | 'reviewed' | 'shortlisted' | 'interview' | 'accepted' | 'rejected' | 'withdrawn'
  appliedAt: string
  coverLetter?: string
  resume?: string
  notes?: string
  viewedAt?: string
}

// Matches the exact shape JobTabs expects
interface Applicant {
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
}

interface Company {
  _id: string
  name: string
  description: string
  logo?: string
  location: string
  owner: string
  teamMembers: Array<{
    user: { _id: string; name: string; email: string }
    role: string
  }>
  jobs: string[]
}

// status union matches JobTabs exactly: no 'paused'
// applicants is required (never undefined) to match JobTabs
interface Job {
  _id: string
  title: string
  description: string
  location: string
  type: string
  employmentType: string
  salary: any
  company: { _id: string; name: string; logo?: string }
  companyName: string
  applications: Application[]
  applicants: Applicant[]
  createdAt: string
  updatedAt: string
  status: 'active' | 'draft' | 'closed' | 'archived'  // removed 'paused' to match JobTabs
  isUrgent?: boolean
  isFeatured?: boolean
  experience?: { minYears: number; maxYears: number }
  applicationDeadline?: string
  postedBy?: { _id: string; name: string; email: string }
  requirements?: string[]
  responsibilities?: string[]
  benefits?: string[]
  skills?: string[]
  category?: string
  industry?: string
  views?: number
  applicationsCount?: number
}

interface Stats {
  totalJobs: number
  activeJobs: number
  totalApplications: number
  avgApplicationsPerJob: number
  urgentJobs: number
  featuredJobs: number
}

// Normalize raw API data into typed Job (guarantees applicants is always [])
const normalizeJob = (job: any): Job => ({
  ...job,
  // If API returns 'paused', map it to 'archived' (closest equivalent in JobTabs)
  status: (['active', 'draft', 'closed', 'archived'].includes(job.status) ? job.status : 'archived') as Job['status'],
  applications: Array.isArray(job.applications) ? job.applications : [],
  applicants: Array.isArray(job.applicants)
    ? job.applicants.map((a: any): Applicant => ({
        _id: a._id ?? '',
        name: a.name ?? '',
        email: a.email ?? '',
        age: a.age,
        profileImage: a.profileImage,
        appliedAt: a.appliedAt ?? new Date().toISOString(),
        status: a.status,
        applicationId: a.applicationId,
        coverLetter: a.coverLetter,
        experience: a.experience,
        resume: a.resume,
      }))
    : [],
})

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
    featuredJobs: 0,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)

  const getImageUrl = (imagePath: string | undefined | null): string => {
    if (!imagePath) return ''
    if (imagePath.startsWith('http')) return imagePath
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/${imagePath.replace(/\\/g, '/')}`
  }

  const applyFilters = (jobsList: Job[]): Job[] => {
    let result = [...jobsList]

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

    if (statusFilter !== 'all') result = result.filter(job => job.status === statusFilter)
    if (typeFilter !== 'all') result = result.filter(job => job.employmentType === typeFilter || job.type === typeFilter)

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        break
      case 'applications':
        result.sort((a, b) => {
          const aCount = a.applications.length || a.applicants.length || a.applicationsCount || 0
          const bCount = b.applications.length || b.applicants.length || b.applicationsCount || 0
          return bCount - aCount
        })
        break
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
    }

    return result
  }

  useEffect(() => {
    if (jobs.length > 0) setFilteredJobs(applyFilters(jobs))
  }, [jobs, searchTerm, statusFilter, typeFilter, sortBy])

  useEffect(() => {
    const checkAuthorization = async (): Promise<void> => {
      if (authLoading) return
      if (!isAuthenticated || !user) { router.push('/login'); return }

      try {
        setCompanyLoading(true)
        const token = localStorage.getItem('token')
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/company/${companyId}`,
          { headers: { Authorization: token ? `Bearer ${token}` : '' } }
        )

        const companyData = res.data.company || res.data
        const isOwner = companyData.owner === user._id
        const isTeamMember = companyData.teamMembers?.some((m: any) =>
          m.user?._id === user._id && ['admin', 'recruiter', 'manager', 'hr'].includes(m.role)
        )

        if (isOwner || isTeamMember) {
          setCompany(companyData)
          setIsAuthorized(true)
          await fetchJobs()
        } else {
          toast.error("You are not authorized to view this company's jobs")
          router.push('/dashboard')
        }
      } catch (error: any) {
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

  const fetchJobs = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token')
      if (!token) { toast.error('No authentication token found'); router.push('/login'); return }

      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      let rawJobs: any[] = []

      const endpoints = [
        `${BASE_URL}/api/jobs/company/${companyId}`,
        `${BASE_URL}/api/jobs?companyId=${companyId}`,
        `${BASE_URL}/api/jobs/user/my-jobs`,
      ]

      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint, { headers })
          if (response.data) {
            if (Array.isArray(response.data)) rawJobs = response.data
            else if (Array.isArray(response.data.jobs)) rawJobs = response.data.jobs
            else if (Array.isArray(response.data.data)) rawJobs = response.data.data
            else continue

            if (endpoint.includes('my-jobs')) {
              rawJobs = rawJobs.filter((j: any) => j.company?._id === companyId)
            }
            break
          }
        } catch {
          console.log(`Endpoint ${endpoint} failed, trying next...`)
        }
      }

      const normalizedJobs: Job[] = rawJobs.map(normalizeJob)
      setJobs(normalizedJobs)
      setFilteredJobs(applyFilters(normalizedJobs))
      updateStats(normalizedJobs)
    } catch (error: any) {
      toast.error('Failed to load jobs. Please check your connection or try again later.')
      setJobs([])
      setFilteredJobs([])
      updateStats([])
    } finally {
      setLoading(false)
    }
  }

  const updateStats = (jobsList: Job[]): void => {
    const totalJobs = jobsList.length
    const activeJobs = jobsList.filter(j => j.status === 'active').length
    const totalApplications = jobsList.reduce(
      (sum, j) => sum + (j.applications.length || j.applicants.length || j.applicationsCount || 0), 0
    )
    setStats({
      totalJobs,
      activeJobs,
      totalApplications,
      avgApplicationsPerJob: totalJobs > 0 ? Math.round((totalApplications / totalJobs) * 10) / 10 : 0,
      urgentJobs: jobsList.filter(j => j.isUrgent).length,
      featuredJobs: jobsList.filter(j => j.isFeatured).length,
    })
  }

  const handleJobDelete = async (jobId: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this job?')) return
    try {
      const token = localStorage.getItem('token')
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/jobs/${jobId}`,
        { headers: { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' } }
      )
      const updated = jobs.filter(j => j._id !== jobId)
      setJobs(updated); setFilteredJobs(applyFilters(updated)); updateStats(updated)
      toast.success('Job deleted successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete job')
    }
  }

  const handleJobStatusChange = async (jobId: string, newStatus: Job['status']): Promise<void> => {
    setIsUpdatingStatus(jobId)
    try {
      const token = localStorage.getItem('token')
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/jobs/${jobId}/status`,
        { status: newStatus },
        { headers: { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' } }
      )
      toast.success(`Job status updated to ${newStatus}`)
      const updated = jobs.map(j => j._id === jobId ? { ...j, status: newStatus } : j)
      setJobs(updated); setFilteredJobs(applyFilters(updated)); updateStats(updated)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update job status')
    } finally {
      setIsUpdatingStatus(null)
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setTypeFilter('all')
    setSortBy('newest')
  }

  if (companyLoading || authLoading || loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading company jobs...</p>
      </div>
    )
  }

  if (!isAuthorized || !company) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <Alert variant="danger" className="text-center">
          <FiBriefcase className="mb-3" size={48} />
          <h4>Access Denied</h4>
          <p>You are not authorized to view this company&apos;s jobs.</p>
          <Button variant="primary" onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </Alert>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      <Container fluid className="p-0">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border-bottom">
          <Container className="py-4">
            <Row className="align-items-center">
              <Col xs={12} md={8}>
                <div className="d-flex align-items-center gap-3 mb-3 mb-md-0">
                  {company.logo ? (
                    <motion.div whileHover={{ scale: 1.1 }}>
                      <Image
                        src={getImageUrl(company.logo)}
                        alt={company.name}
                        roundedCircle
                        className="border"
                        style={{ width: '60px', height: '60px', objectFit: 'cover', backgroundColor: '#f8f9fa' }}
                        onError={(e) => {
                          const t = e.target as HTMLImageElement
                          t.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(company.name)}&background=0a66c2&color=fff&size=60`
                        }}
                      />
                    </motion.div>
                  ) : (
                    <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                      <FiBriefcase className="text-white" size={24} />
                    </div>
                  )}
                  <div>
                    <h1 className="h2 mb-1 fw-bold">{company.name} Jobs</h1>
                    <p className="text-muted mb-0">Manage and track all job postings and applications for your company</p>
                  </div>
                </div>
              </Col>
              <Col xs={12} md={4} className="text-md-end">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="primary" className="d-inline-flex align-items-center gap-2 px-4 py-2"
                    onClick={() => router.push(`/company/${companyId}/post-job`)}>
                    <FiPlus /> Post New Job
                  </Button>
                </motion.div>
              </Col>
            </Row>
          </Container>
        </motion.div>

        {/* Stats Cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-light py-4">
          <Container>
            <Row className="g-3">
              {[
                { title: 'Total Jobs', value: stats.totalJobs, icon: <FiBriefcase className="text-primary" size={20} />, color: 'primary', description: 'All job postings' },
                { title: 'Active Jobs', value: stats.activeJobs, icon: <FiTrendingUp className="text-success" size={20} />, color: 'success', description: 'Currently open' },
                { title: 'Total Applications', value: stats.totalApplications, icon: <FiUsers className="text-info" size={20} />, color: 'info', description: 'All applications received' },
                { title: 'Avg Applications', value: stats.avgApplicationsPerJob, icon: <FiBarChart2 className="text-warning" size={20} />, color: 'warning', description: 'Per job' },
                { title: 'Urgent Jobs', value: stats.urgentJobs, icon: <FiClock className="text-danger" size={20} />, color: 'danger', description: 'Priority hiring' },
                { title: 'Featured Jobs', value: stats.featuredJobs, icon: <FiUserCheck size={20} />, color: 'secondary', description: 'Promoted listings' },
              ].map((stat, i) => (
                <Col key={i} xs={6} md={4} lg={2}>
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Body className="p-3">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className={`bg-${stat.color}-subtle rounded-circle p-2`}>{stat.icon}</div>
                          <div className="fs-4 fw-bold text-dark">{stat.value}</div>
                        </div>
                        <Card.Title className="h6 mb-1">{stat.title}</Card.Title>
                        <Card.Text className="small text-muted mb-0">{stat.description}</Card.Text>
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
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-4">
                <Card className="border-0 shadow-sm">
                  <Card.Body className="p-3">
                    <Row className="g-3 align-items-center">
                      <Col md={4}>
                        <InputGroup>
                          <InputGroup.Text className="bg-transparent border-end-0"><FiSearch /></InputGroup.Text>
                          <Form.Control
                            placeholder="Search jobs by title, description, location, or type..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="border-start-0"
                          />
                          {searchTerm && (
                            <Button variant="outline-secondary" onClick={() => setSearchTerm('')} className="border-start-0">Clear</Button>
                          )}
                        </InputGroup>
                      </Col>
                      <Col md={2}>
                        <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                          <option value="all">All Status</option>
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="closed">Closed</option>
                          <option value="archived">Archived</option>
                        </Form.Select>
                      </Col>
                      <Col md={2}>
                        <Form.Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                          <option value="all">All Types</option>
                          <option value="Full-time">Full-time</option>
                          <option value="Part-time">Part-time</option>
                          <option value="Contract">Contract</option>
                          <option value="Internship">Internship</option>
                          <option value="Remote">Remote</option>
                        </Form.Select>
                      </Col>
                      <Col md={2}>
                        <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                          <option value="newest">Newest First</option>
                          <option value="oldest">Oldest First</option>
                          <option value="applications">Most Applications</option>
                          <option value="title">A-Z</option>
                        </Form.Select>
                      </Col>
                      <Col md={2} className="text-end">
                        <div className="d-flex gap-2 justify-content-end">
                          {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                            <Button variant="outline-danger" onClick={clearFilters} className="d-inline-flex align-items-center gap-1">
                              <FiFilter /> Clear Filters
                            </Button>
                          )}
                          <Button variant="outline-secondary" onClick={fetchJobs} className="d-inline-flex align-items-center gap-1" disabled={loading}>
                            <FiRefreshCw /> Refresh
                          </Button>
                        </div>
                      </Col>
                    </Row>

                    {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                      <Row className="mt-3">
                        <Col xs={12}>
                          <div className="d-flex align-items-center flex-wrap gap-2">
                            <small className="text-muted me-2">Active filters:</small>
                            {searchTerm && (
                              <Badge bg="info" className="d-flex align-items-center gap-1">
                                <FiSearch size={12} /> Search: &quot;{searchTerm}&quot;
                                <Button variant="outline-light" size="sm" className="ms-1 p-0 border-0"
                                  onClick={() => setSearchTerm('')} style={{ fontSize: '0.6rem', lineHeight: 1 }}>×</Button>
                              </Badge>
                            )}
                            {statusFilter !== 'all' && (
                              <Badge bg="warning" className="d-flex align-items-center gap-1">
                                Status: {statusFilter}
                                <Button variant="outline-light" size="sm" className="ms-1 p-0 border-0"
                                  onClick={() => setStatusFilter('all')} style={{ fontSize: '0.6rem', lineHeight: 1 }}>×</Button>
                              </Badge>
                            )}
                            {typeFilter !== 'all' && (
                              <Badge bg="success" className="d-flex align-items-center gap-1">
                                Type: {typeFilter}
                                <Button variant="outline-light" size="sm" className="ms-1 p-0 border-0"
                                  onClick={() => setTypeFilter('all')} style={{ fontSize: '0.6rem', lineHeight: 1 }}>×</Button>
                              </Badge>
                            )}
                            <Badge bg="secondary">
                              Sort: {sortBy === 'newest' ? 'Newest First' : sortBy === 'oldest' ? 'Oldest First' : sortBy === 'applications' ? 'Most Applications' : 'A-Z'}
                            </Badge>
                            <span className="ms-2 text-muted">Showing {filteredJobs.length} of {jobs.length} jobs</span>
                          </div>
                        </Col>
                      </Row>
                    )}
                  </Card.Body>
                </Card>
              </motion.div>

              <JobTabs
                jobs={filteredJobs}
                companyId={companyId}
                onJobUpdate={fetchJobs}
                onJobDelete={handleJobDelete}
                onJobStatusChange={handleJobStatusChange}
                onEditJob={(jobId) => router.push(`/company/${companyId}/jobs/${jobId}/edit`)}
                isLoading={loading}
                isUpdatingStatus={isUpdatingStatus}
              />

              {filteredJobs.length === 0 && !loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-5">
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
                        <Button variant="primary" className="d-inline-flex align-items-center gap-2"
                          onClick={() => router.push(`/company/${companyId}/post-job`)}>
                          <FiPlus /> Post Your First Job
                        </Button>
                      )}
                      {(searchTerm || statusFilter !== 'all' || typeFilter !== 'all') && (
                        <Button variant="outline-secondary" onClick={clearFilters} className="ms-2">Clear Filters</Button>
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