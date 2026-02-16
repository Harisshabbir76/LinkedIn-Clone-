'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../context/AuthContext'
import axios from 'axios'
import { toast, Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Form,
  Spinner,
  Image,
  Dropdown,
  Offcanvas,
  CloseButton,
  InputGroup
} from 'react-bootstrap'
import {
  FiSearch,
  FiMapPin,
  FiBriefcase,
  FiDollarSign,
  FiClock,
  FiFilter,
  FiX,
  FiExternalLink,
  FiCheckCircle,
  FiStar,
  FiGlobe,
  FiUsers,
  FiTrendingUp,
  FiBook,
  FiTool,
  FiAward,
  FiZap,
  FiAlertCircle,
  FiCalendar,
  FiLayers,
  FiChevronRight,
  FiHeart,
  FiShare2,
  FiEye,
  FiSave,
  FiRefreshCw,
  FiInfo,
  FiActivity
} from 'react-icons/fi'
import { Suspense } from 'react'

interface Job {
  _id: string
  title: string
  description: string
  location: string
  type: string
  employmentType?: string
  salary: {
    min?: number
    max?: number
    currency?: string
  }
  company: {
    _id: string
    name: string
    logo?: string
    description?: string
    location?: string
    website?: string
    industry?: string
    size?: string
    foundedYear?: number
    email?: string
    phone?: string
  }
  companyName: string
  skills: string[]
  requirements: string[]
  responsibilities?: string[]
  experience: {
    minYears: number
    maxYears?: number
  }
  education?: string
  benefits: string[]
  tags: string[]
  isRemote: boolean
  isUrgent: boolean
  isFeatured: boolean
  status: string
  postedBy: string
  createdAt: string
  updatedAt: string
  applicationDeadline?: string
  applicationsCount?: number
  viewsCount?: number
}

interface JobWithMatch extends Job {
  matchPercentage: number
  matchedSkills: string[]
}

interface FilterState {
  location: string
  type: string
  experience: string
  salary: string
  skill: string
  remote: string
  datePosted: string
  sortBy: 'match' | 'newest' | 'salary' | 'relevance'
}

function SearchPageContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  
  // URL parameters
  const urlParams = params.params as string[] || []
  const initialSkill = urlParams[0] ? decodeURIComponent(urlParams[0]) : searchParams.get('skill') || ''
  const initialLocation = urlParams[1] ? decodeURIComponent(urlParams[1]) : searchParams.get('location') || ''
  const initialType = searchParams.get('type') || ''
  const initialRemote = searchParams.get('remote') || ''
  
  // State
  const [searchTerm, setSearchTerm] = useState(initialSkill)
  const [jobs, setJobs] = useState<Job[]>([])
  const [matchedJobs, setMatchedJobs] = useState<JobWithMatch[]>([])
  const [filteredJobs, setFilteredJobs] = useState<JobWithMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalJobs, setTotalJobs] = useState(0)
  const [selectedJob, setSelectedJob] = useState<JobWithMatch | null>(null)
  const [appliedJobs, setAppliedJobs] = useState<string[]>([])
  const [savedJobs, setSavedJobs] = useState<string[]>([])
  const [showFilterSidebar, setShowFilterSidebar] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  
  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    location: initialLocation,
    type: initialType || 'all',
    experience: 'all',
    salary: 'all',
    skill: '',
    remote: initialRemote || 'all',
    datePosted: 'all',
    sortBy: 'relevance'
  })
  
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  
  // Helper functions
  const getImageUrl = (imagePath: string | undefined | null) => {
    if (!imagePath) return ''
    if (imagePath.startsWith('http')) return imagePath
    return `http://localhost:5000/${imagePath.replace(/\\/g, '/')}`
  }
  
  const handleCompanyClick = (companyId: string) => {
    router.push(`/company/${companyId}`)
  }
  
  const handleExternalLink = (url: string | undefined, companyName?: string) => {
    if (!url || url.trim() === '') {
      toast.error(companyName ? `${companyName} hasn't provided a website URL yet.` : 'Website URL not available')
      return
    }
    
    let fullUrl = url.trim()
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = `https://${fullUrl}`
    }
    
    try {
      window.open(fullUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Invalid URL:', error)
      toast.error('Invalid website URL')
    }
  }
  
  const calculateMatchPercentage = useCallback((job: Job, userSkills: string[]): JobWithMatch => {
    const jobRequirements = [
      ...(job.skills || []),
      ...(job.requirements || []).map(req => req.toLowerCase())
    ]
    
    const userSkillsLower = (userSkills || []).map(skill => 
      typeof skill === 'string' ? skill.toLowerCase() : skill.name?.toLowerCase() || ''
    ).filter(skill => skill.trim())
    
    const matchedSkills = userSkillsLower.filter(userSkill =>
      jobRequirements.some(jobSkill => 
        jobSkill.toLowerCase().includes(userSkill) || 
        userSkill.includes(jobSkill.toLowerCase())
      )
    )
    
    let matchPercentage = 0
    
    // Skills matching (70% weight)
    if (jobRequirements.length > 0) {
      const skillMatch = (matchedSkills.length / jobRequirements.length) * 70
      matchPercentage += skillMatch
    }
    
    // Location matching (30% weight)
    if (user?.location && job.location.toLowerCase().includes(user.location.toLowerCase())) {
      matchPercentage += 30
    }
    
    // Add base score for logged in users
    if (user && matchPercentage < 10) {
      matchPercentage = 10
    }
    
    matchPercentage = Math.min(100, Math.round(matchPercentage))
    
    return {
      ...job,
      matchPercentage,
      matchedSkills
    }
  }, [user])
  
  const getMatchLevel = (percentage: number) => {
    if (percentage >= 80) return { text: 'Perfect Match', color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200' }
    if (percentage >= 60) return { text: 'Great Match', color: '#3b82f6', bg: 'bg-blue-50', border: 'border-blue-200' }
    if (percentage >= 40) return { text: 'Good Match', color: '#8b5cf6', bg: 'bg-purple-50', border: 'border-purple-200' }
    if (percentage >= 20) return { text: 'Fair Match', color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200' }
    return { text: 'Basic Match', color: '#6b7280', bg: 'bg-gray-50', border: 'border-gray-200' }
  }
  
  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const params = new URLSearchParams()
      
      if (searchTerm) params.append('search', searchTerm)
      if (filters.location) params.append('location', filters.location)
      if (filters.type !== 'all') params.append('type', filters.type)
      if (filters.remote !== 'all') params.append('isRemote', filters.remote === 'true' ? 'true' : 'false')
      
      const response = await axios.get(`${API_URL}/api/jobs?${params.toString()}`)
      
      const jobsData = response.data.jobs || response.data || []
      const activeJobs = jobsData
        .filter((job: Job) => job.status === 'active' && job.company)
        .map((job: Job) => ({
          ...job,
          company: {
            _id: job.company._id,
            name: job.company.name || job.companyName,
            logo: job.company.logo,
            description: job.company.description,
            location: job.company.location || job.location,
            website: job.company.website || '',
            industry: job.company.industry,
            size: job.company.size,
            foundedYear: job.company.foundedYear,
            email: job.company.email,
            phone: job.company.phone
          }
        }))
      
      setJobs(activeJobs)
      setTotalJobs(response.data.total || activeJobs.length)
      
      if (user && isAuthenticated) {
        const userSkills = user.skills?.map(s => s.name) || []
        const jobsWithMatch = activeJobs.map((job: Job) => 
          calculateMatchPercentage(job, userSkills)
        )
        setMatchedJobs(jobsWithMatch)
      } else {
        const defaultJobs = activeJobs.map((job: Job) => ({
          ...job,
          matchPercentage: 0,
          matchedSkills: []
        }))
        setMatchedJobs(defaultJobs)
      }
      
      if (isAuthenticated && user) {
        await loadUserData()
      }
      
    } catch (err: any) {
      console.error('Error fetching jobs:', err)
      setError(err.response?.data?.message || 'Failed to load jobs')
      toast.error('Failed to load jobs. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, filters.location, filters.type, filters.remote, user, isAuthenticated, calculateMatchPercentage])
  
  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      
      // Load applied jobs
      const appliedResponse = await axios.get(`${API_URL}/api/jobs/user/applied`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAppliedJobs(appliedResponse.data.map((job: any) => job._id))
      
      // Load saved jobs
      const savedResponse = await axios.get(`${API_URL}/api/jobs/user/saved`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSavedJobs(savedResponse.data.map((job: any) => job._id))
      
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }
  
  // Apply filters and sorting
  const applyFiltersAndSorting = useCallback(() => {
    let result = [...matchedJobs]
    const newActiveFilters: string[] = []
    
    // Location filter
    if (filters.location && filters.location !== 'all') {
      const locationTerm = filters.location.toLowerCase()
      result = result.filter(job =>
        job.location.toLowerCase().includes(locationTerm) ||
        job.company.location?.toLowerCase().includes(locationTerm)
      )
      newActiveFilters.push(`Location: ${filters.location}`)
    }
    
    // Type filter
    if (filters.type && filters.type !== 'all') {
      result = result.filter(job => 
        job.type === filters.type || 
        job.employmentType === filters.type
      )
      newActiveFilters.push(`Type: ${filters.type}`)
    }
    
    // Experience filter
    if (filters.experience && filters.experience !== 'all') {
      result = result.filter(job => {
        const minExp = job.experience.minYears
        switch (filters.experience) {
          case 'entry':
            return minExp <= 2
          case 'mid':
            return minExp > 2 && minExp <= 5
          case 'senior':
            return minExp > 5
          default:
            return true
        }
      })
      newActiveFilters.push(`Experience: ${filters.experience}`)
    }
    
    // Salary filter
    if (filters.salary && filters.salary !== 'all') {
      result = result.filter(job => {
        const minSalary = job.salary.min || 0
        switch (filters.salary) {
          case '<50k':
            return minSalary < 50000
          case '50k-100k':
            return minSalary >= 50000 && minSalary < 100000
          case '100k-150k':
            return minSalary >= 100000 && minSalary < 150000
          case '>150k':
            return minSalary >= 150000
          default:
            return true
        }
      })
      newActiveFilters.push(`Salary: ${filters.salary}`)
    }
    
    // Skill filter
    if (filters.skill) {
      const skill = filters.skill.toLowerCase()
      result = result.filter(job =>
        job.skills.some(s => s.toLowerCase().includes(skill))
      )
      newActiveFilters.push(`Skill: ${filters.skill}`)
    }
    
    // Remote filter
    if (filters.remote && filters.remote !== 'all') {
      result = result.filter(job => 
        filters.remote === 'true' ? job.isRemote : !job.isRemote
      )
      newActiveFilters.push(`Remote: ${filters.remote === 'true' ? 'Yes' : 'No'}`)
    }
    
    // Date posted filter
    if (filters.datePosted && filters.datePosted !== 'all') {
      const now = new Date()
      result = result.filter(job => {
        const postedDate = new Date(job.createdAt)
        const diffDays = Math.floor((now.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24))
        
        switch (filters.datePosted) {
          case 'today':
            return diffDays === 0
          case '3days':
            return diffDays <= 3
          case 'week':
            return diffDays <= 7
          case 'month':
            return diffDays <= 30
          default:
            return true
        }
      })
      newActiveFilters.push(`Posted: ${filters.datePosted}`)
    }
    
    // Sorting
    switch (filters.sortBy) {
      case 'match':
        result.sort((a, b) => b.matchPercentage - a.matchPercentage)
        break
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'salary':
        result.sort((a, b) => (b.salary.min || 0) - (a.salary.min || 0))
        break
      case 'relevance':
        result.sort((a, b) => {
          // Relevance score based on multiple factors
          const scoreA = (a.matchPercentage || 0) + (a.isUrgent ? 50 : 0) + (a.isFeatured ? 30 : 0)
          const scoreB = (b.matchPercentage || 0) + (b.isUrgent ? 50 : 0) + (b.isFeatured ? 30 : 0)
          return scoreB - scoreA
        })
        break
    }
    
    setActiveFilters(newActiveFilters)
    setFilteredJobs(result)
    
    // Update selected job if needed
    if (selectedJob && !result.find(job => job._id === selectedJob._id)) {
      setSelectedJob(result.length > 0 ? result[0] : null)
    }
  }, [matchedJobs, filters, selectedJob])
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term')
      return
    }
    
    // Build URL with search parameters
    const params = new URLSearchParams()
    params.set('skill', searchTerm.trim())
    if (filters.location && filters.location !== 'all') params.set('location', filters.location)
    if (filters.type && filters.type !== 'all') params.set('type', filters.type)
    if (filters.remote && filters.remote !== 'all') params.set('remote', filters.remote)
    
    router.push(`/search/${encodeURIComponent(searchTerm.trim())}?${params.toString()}`)
  }
  
  // Handle apply job
  const handleApplyJob = (jobId: string) => {
    if (!isAuthenticated) {
      toast.error('Please login to apply for jobs')
      router.push('/login')
      return
    }
    router.push(`/jobs/${jobId}/apply`)
  }
  
  // Handle save job
  const handleSaveJob = async (jobId: string) => {
    if (!isAuthenticated) {
      toast.error('Please login to save jobs')
      router.push('/login')
      return
    }
    
    try {
      const token = localStorage.getItem('token')
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      
      if (savedJobs.includes(jobId)) {
        await axios.delete(`${API_URL}/api/jobs/${jobId}/save`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSavedJobs(prev => prev.filter(id => id !== jobId))
        toast.success('Job removed from saved')
      } else {
        await axios.post(`${API_URL}/api/jobs/${jobId}/save`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
        setSavedJobs(prev => [...prev, jobId])
        toast.success('Job saved successfully')
      }
    } catch (error) {
      console.error('Error saving job:', error)
      toast.error('Failed to save job')
    }
  }
  
  // Format salary
  const formatSalary = (salary: any) => {
    if (!salary.min && !salary.max) return 'Not specified'
    
    const currency = salary.currency || '$'
    const formatValue = (value: number) => {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
      if (value >= 1000) return `${Math.floor(value / 1000)}k`
      return value.toString()
    }
    
    if (salary.min && salary.max) {
      return `${currency}${formatValue(salary.min)} - ${currency}${formatValue(salary.max)}`
    } else if (salary.min) {
      return `From ${currency}${formatValue(salary.min)}`
    } else if (salary.max) {
      return `Up to ${currency}${formatValue(salary.max)}`
    }
  }
  
  const formatSalaryShort = (salary: any) => {
    if (!salary.min && !salary.max) return ''
    
    const currency = salary.currency || '$'
    const formatValue = (value: number) => {
      if (value >= 1000) return `${Math.floor(value / 1000)}k`
      return value.toString()
    }
    
    if (salary.min && salary.max) {
      return `${currency}${formatValue(salary.min)}-${formatValue(salary.max)}`
    } else if (salary.min) {
      return `From ${currency}${formatValue(salary.min)}`
    } else {
      return `Up to ${currency}${formatValue(salary.max)}`
    }
  }
  
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return `${Math.floor(diffDays / 30)}mo ago`
  }
  
  const getExperienceLevel = (minYears: number) => {
    if (minYears <= 2) return 'Entry'
    if (minYears <= 5) return 'Mid'
    return 'Senior'
  }
  
  const clearAllFilters = () => {
    setFilters({
      location: '',
      type: 'all',
      experience: 'all',
      salary: 'all',
      skill: '',
      remote: 'all',
      datePosted: 'all',
      sortBy: 'relevance'
    })
    setActiveFilters([])
  }
  
  const removeFilter = (filter: string) => {
    const filterType = filter.split(':')[0].trim().toLowerCase()
    
    switch (filterType) {
      case 'location':
        setFilters(prev => ({ ...prev, location: '' }))
        break
      case 'type':
        setFilters(prev => ({ ...prev, type: 'all' }))
        break
      case 'experience':
        setFilters(prev => ({ ...prev, experience: 'all' }))
        break
      case 'salary':
        setFilters(prev => ({ ...prev, salary: 'all' }))
        break
      case 'skill':
        setFilters(prev => ({ ...prev, skill: '' }))
        break
      case 'remote':
        setFilters(prev => ({ ...prev, remote: 'all' }))
        break
      case 'posted':
        setFilters(prev => ({ ...prev, datePosted: 'all' }))
        break
    }
  }
  
  // Effects
  useEffect(() => {
    if (!authLoading) {
      fetchJobs()
    }
  }, [authLoading, fetchJobs])
  
  useEffect(() => {
    applyFiltersAndSorting()
  }, [applyFiltersAndSorting])
  
  useEffect(() => {
    if (matchedJobs.length > 0 && !selectedJob) {
      setSelectedJob(matchedJobs[0])
    }
  }, [matchedJobs, selectedJob])
  
  // Loading state
  if (authLoading || loading) {
    return (
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading job recommendations...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={6} className="text-center">
            <FiAlertCircle size={64} className="text-danger mb-4" />
            <h4 className="mb-3">Error Loading Jobs</h4>
            <p className="text-muted mb-4">{error}</p>
            <Button variant="primary" onClick={fetchJobs}>
              <FiRefreshCw className="me-2" />
              Try Again
            </Button>
          </Col>
        </Row>
      </Container>
    )
  }
  
  return (
    <>
      <Toaster position="top-right" />
      
      <Container fluid className="px-4 px-md-5 py-4 bg-light" style={{ minHeight: 'calc(100vh - 56px)' }}>
        {/* Search Header */}
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <h1 className="h3 mb-4 fw-bold">
                  {searchTerm ? `"${searchTerm}" Jobs` : 'Search Jobs'}
                  {filters.location && filters.location !== 'all' && ` in ${filters.location}`}
                </h1>
                
                {/* Search Bar */}
                <Form onSubmit={handleSearch}>
                  <InputGroup className="mb-3">
                    <InputGroup.Text className="bg-white border-end-0">
                      <FiSearch className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Search jobs, companies, or skills..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="border-start-0"
                    />
                    <InputGroup.Text className="bg-white border-start-0">
                      <FiMapPin className="text-muted" />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Location"
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                      className="border-end-0"
                    />
                    <Button variant="primary" type="submit">
                      <FiSearch className="me-2" />
                      Search
                    </Button>
                  </InputGroup>
                </Form>
                
                {/* Quick Filters */}
                <div className="d-flex flex-wrap gap-2">
                  <Button
                    variant={filters.type === 'Full-time' ? 'primary' : 'light'}
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, type: prev.type === 'Full-time' ? 'all' : 'Full-time' }))}
                    className="d-flex align-items-center gap-1"
                  >
                    <FiBriefcase size={14} />
                    Full-time
                  </Button>
                  <Button
                    variant={filters.type === 'Part-time' ? 'primary' : 'light'}
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, type: prev.type === 'Part-time' ? 'all' : 'Part-time' }))}
                    className="d-flex align-items-center gap-1"
                  >
                    <FiBriefcase size={14} />
                    Part-time
                  </Button>
                  <Button
                    variant={filters.remote === 'true' ? 'primary' : 'light'}
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, remote: prev.remote === 'true' ? 'all' : 'true' }))}
                    className="d-flex align-items-center gap-1"
                  >
                    <FiGlobe size={14} />
                    Remote
                  </Button>
                  <Button
                    variant={filters.experience === 'entry' ? 'primary' : 'light'}
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, experience: prev.experience === 'entry' ? 'all' : 'entry' }))}
                    className="d-flex align-items-center gap-1"
                  >
                    <FiUsers size={14} />
                    Entry Level
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        {/* Main Content */}
        <Row className="g-4">
          {/* Left Column - Filters & Job List */}
          <Col lg={selectedJob ? 5 : 12} xl={selectedJob ? 5 : 12}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body className="p-0">
                {/* Filter Header */}
                <div className="border-bottom p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-0 fw-semibold">
                        {filteredJobs.length} jobs found
                        <span className="text-muted fw-normal ms-2">
                          • Sorted by {filters.sortBy === 'match' ? 'match' : filters.sortBy === 'newest' ? 'newest' : 'salary'}
                        </span>
                      </h6>
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setShowMobileFilters(true)}
                        className="d-flex align-items-center gap-1 d-lg-none"
                      >
                        <FiFilter />
                        Filters
                      </Button>
                      <Dropdown>
                        <Dropdown.Toggle variant="light" size="sm" className="border d-flex align-items-center gap-1">
                          <FiTrendingUp size={14} />
                          Sort
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => setFilters(prev => ({ ...prev, sortBy: 'relevance' }))}>
                            Relevance
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => setFilters(prev => ({ ...prev, sortBy: 'match' }))}>
                            Best Match
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => setFilters(prev => ({ ...prev, sortBy: 'newest' }))}>
                            Newest
                          </Dropdown.Item>
                          <Dropdown.Item onClick={() => setFilters(prev => ({ ...prev, sortBy: 'salary' }))}>
                            Salary
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  </div>
                  
                  {/* Active Filters */}
                  {activeFilters.length > 0 && (
                    <div className="d-flex align-items-center flex-wrap gap-2 mt-3">
                      {activeFilters.map((filter, idx) => (
                        <Badge key={idx} bg="light" text="dark" className="d-flex align-items-center gap-1 px-3 py-1 border">
                          {filter}
                          <CloseButton onClick={() => removeFilter(filter)} className="ms-1 fs-8" />
                        </Badge>
                      ))}
                      <Button
                        variant="link"
                        size="sm"
                        onClick={clearAllFilters}
                        className="text-decoration-none p-0 ms-2"
                      >
                        Clear all
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Jobs List */}
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                  {filteredJobs.length === 0 ? (
                    <div className="text-center py-8">
                      <FiSearch size={48} className="text-muted mb-3" />
                      <h5 className="mb-2">No jobs found</h5>
                      <p className="text-muted mb-4">Try adjusting your search or filters</p>
                      <Button variant="primary" onClick={clearAllFilters}>
                        Clear all filters
                      </Button>
                    </div>
                  ) : (
                    <div>
                      {filteredJobs.map((job, index) => {
                        const isSelected = selectedJob?._id === job._id
                        const isApplied = appliedJobs.includes(job._id)
                        const isSaved = savedJobs.includes(job._id)
                        const matchLevel = getMatchLevel(job.matchPercentage)
                        const hasSalary = job.salary && (job.salary.min || job.salary.max)
                        const hasWebsite = job.company.website && job.company.website.trim() !== ''
                        
                        return (
                          <motion.div
                            key={job._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <div 
                              className={`p-3 border-bottom cursor-pointer transition-all ${isSelected ? 'bg-primary bg-opacity-10 border-primary border-start-0 border-end-0 border-top-0' : 'bg-white hover-bg-light'}`}
                              onClick={() => setSelectedJob(job)}
                              style={{ borderLeft: isSelected ? '4px solid #0d6efd' : 'none' }}
                            >
                              <div className="d-flex align-items-start gap-3">
                                {/* Company Logo */}
                                <div className="flex-shrink-0">
                                  {job.company.logo ? (
                                    <Image
                                      src={getImageUrl(job.company.logo)}
                                      alt={job.company.name}
                                      rounded
                                      className="border"
                                      style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement
                                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company.name)}&background=3b82f6&color=fff&size=48`
                                      }}
                                    />
                                  ) : (
                                    <div className="rounded bg-primary d-flex align-items-center justify-content-center text-white"
                                      style={{ width: '48px', height: '48px' }}>
                                      <FiBriefcase size={20} />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Job Info */}
                                <div className="flex-grow-1">
                                  <div className="d-flex justify-content-between align-items-start mb-1">
                                    <div>
                                      <h6 className="mb-1 fw-bold text-dark">{job.title}</h6>
                                      <p 
                                        className="mb-1 text-primary fw-semibold small cursor-pointer hover-underline"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleCompanyClick(job.company._id)
                                        }}
                                        style={{ 
                                          cursor: 'pointer',
                                          textDecoration: 'none',
                                          transition: 'text-decoration 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                      >
                                        {job.company.name}
                                      </p>
                                    </div>
                                    <div className="d-flex align-items-center gap-1">
                                      {job.matchPercentage > 0 && (
                                        <Badge 
                                          style={{ 
                                            backgroundColor: matchLevel.color,
                                            color: 'white'
                                          }} 
                                          className="px-2 py-1"
                                        >
                                          {job.matchPercentage}%
                                        </Badge>
                                      )}
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="p-0"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleSaveJob(job._id)
                                        }}
                                      >
                                        <FiHeart 
                                          size={16} 
                                          className={isSaved ? "text-danger" : "text-muted"} 
                                          fill={isSaved ? "#dc3545" : "none"}
                                        />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                                    <span className="d-flex align-items-center gap-1 text-muted small">
                                      <FiMapPin size={12} />
                                      {job.location}
                                    </span>
                                    {job.isRemote && (
                                      <Badge bg="success" className="px-2 py-1 small">
                                        Remote
                                      </Badge>
                                    )}
                                    {job.isUrgent && (
                                      <Badge bg="danger" className="px-2 py-1 small">
                                        ⚡ Urgent
                                      </Badge>
                                    )}
                                    {job.isFeatured && (
                                      <Badge bg="warning" className="px-2 py-1 small">
                                        <FiStar size={10} className="me-1" />
                                        Featured
                                      </Badge>
                                    )}
                                    {hasWebsite && (
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="p-0 text-decoration-none"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleExternalLink(job.company.website, job.company.name)
                                        }}
                                        title="Visit company website"
                                      >
                                        <FiGlobe size={12} className="text-primary" />
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {/* Quick Info */}
                                  <div className="d-flex align-items-center flex-wrap gap-2">
                                    <Badge bg="light" text="dark" className="px-2 py-1 small border">
                                      {job.type}
                                    </Badge>
                                    {hasSalary && (
                                      <Badge bg="light" text="dark" className="px-2 py-1 small border d-flex align-items-center gap-1">
                                        <FiDollarSign size={12} />
                                        {formatSalaryShort(job.salary)}
                                      </Badge>
                                    )}
                                    <Badge bg="light" text="dark" className="px-2 py-1 small border d-flex align-items-center gap-1">
                                      <FiClock size={12} />
                                      {getTimeAgo(job.createdAt)}
                                    </Badge>
                                    <Badge bg="light" text="dark" className="px-2 py-1 small border d-flex align-items-center gap-1">
                                      <FiUsers size={12} />
                                      {getExperienceLevel(job.experience.minYears)}
                                    </Badge>
                                    {isApplied && (
                                      <Badge bg="success" className="px-2 py-1 small">
                                        Applied
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          {/* Right Column - Job Details */}
          {selectedJob && (
            <Col lg={7} xl={7}>
              <motion.div
                key={selectedJob._id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="h-100 d-flex flex-column"
              >
                <Card className="border-0 shadow-sm h-100 d-flex flex-column">
                  {/* Job Header - Sticky */}
                  <div className="bg-primary bg-opacity-10 border-bottom" style={{ flexShrink: 0 }}>
                    <div style={{ 
                      backgroundColor: 'rgba(13, 110, 253, 0.05)',
                      backdropFilter: 'blur(8px)',
                      borderBottom: '1px solid rgba(0,0,0,0.1)'
                    }}>
                      <div className="p-4">
                        <div className="d-flex justify-content-between align-items-start mb-4">
                          <div className="d-flex align-items-start gap-3">
                            {/* Company Logo */}
                            <div className="flex-shrink-0">
                              {selectedJob.company.logo ? (
                                <Image
                                  src={getImageUrl(selectedJob.company.logo)}
                                  alt={selectedJob.company.name}
                                  rounded
                                  className="border"
                                  style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                                />
                              ) : (
                                <div className="rounded bg-primary d-flex align-items-center justify-content-center text-white"
                                  style={{ width: '64px', height: '64px' }}>
                                  <FiBriefcase size={28} />
                                </div>
                              )}
                            </div>
                            
                            {/* Job Title and Company */}
                            <div>
                              <h3 className="fw-bold mb-1">{selectedJob.title}</h3>
                              <h5 
                                className="text-primary mb-2 cursor-pointer hover-underline"
                                onClick={() => handleCompanyClick(selectedJob.company._id)}
                                style={{ 
                                  cursor: 'pointer',
                                  textDecoration: 'none',
                                  transition: 'text-decoration 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                              >
                                {selectedJob.company.name}
                              </h5>
                              <div className="d-flex align-items-center flex-wrap gap-2">
                                <span className="d-flex align-items-center gap-1 text-muted">
                                  <FiMapPin size={14} />
                                  {selectedJob.location}
                                </span>
                                <span className="text-muted">•</span>
                                <span className="text-muted">{selectedJob.type}</span>
                                {selectedJob.isRemote && (
                                  <Badge bg="success" className="px-2 py-1">
                                    Remote
                                  </Badge>
                                )}
                                {selectedJob.isUrgent && (
                                  <Badge bg="danger" className="px-2 py-1">
                                    ⚡ Urgent
                                  </Badge>
                                )}
                                {selectedJob.isFeatured && (
                                  <Badge bg="warning" className="px-2 py-1">
                                    <FiStar size={12} className="me-1" />
                                    Featured
                                  </Badge>
                                )}
                                {selectedJob.company.website && selectedJob.company.website.trim() !== '' && (
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleExternalLink(selectedJob.company.website, selectedJob.company.name)}
                                    title="Visit company website"
                                    className="d-flex align-items-center gap-1"
                                  >
                                    <FiGlobe size={12} />
                                    Website
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Close Button */}
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => setSelectedJob(null)}
                            className="d-lg-none"
                          >
                            <FiX />
                          </Button>
                        </div>
                        
                        {/* Quick Stats */}
                        <Row className="g-2">
                          <Col xs={4} className="d-flex flex-column align-items-center">
                            <div className="fw-bold text-primary">{selectedJob.experience.minYears}+ years</div>
                            <div className="text-muted small mt-1">Experience</div>
                          </Col>
                          <Col xs={4} className="d-flex flex-column align-items-center">
                            <div className="fw-bold text-success">{formatSalary(selectedJob.salary)}</div>
                            <div className="text-muted small mt-1">Salary</div>
                          </Col>
                          <Col xs={4} className="d-flex flex-column align-items-center">
                            <div className="fw-bold text-info">{getTimeAgo(selectedJob.createdAt)}</div>
                            <div className="text-muted small mt-1">Posted</div>
                          </Col>
                        </Row>
                        
                        {/* Action Buttons */}
                        <div className="d-flex gap-3 mt-4">
                          <Button
                            variant="primary"
                            size="lg"
                            onClick={() => handleApplyJob(selectedJob._id)}
                            disabled={appliedJobs.includes(selectedJob._id)}
                            className="flex-grow-1"
                          >
                            {appliedJobs.includes(selectedJob._id) ? (
                              <>
                                <FiCheckCircle className="me-2" />
                                Applied
                              </>
                            ) : (
                              <>
                                <FiZap className="me-2" />
                                Apply Now
                              </>
                            )}
                          </Button>
                          <Button
                            variant={savedJobs.includes(selectedJob._id) ? "danger" : "outline-primary"}
                            size="lg"
                            onClick={() => handleSaveJob(selectedJob._id)}
                            title="Save job"
                          >
                            <FiHeart fill={savedJobs.includes(selectedJob._id) ? "#fff" : "none"} />
                          </Button>
                          {selectedJob.company.website && selectedJob.company.website.trim() !== '' && (
                            <Button
                              variant="outline-primary"
                              size="lg"
                              onClick={() => handleExternalLink(selectedJob.company.website, selectedJob.company.name)}
                              title="Visit company website"
                              className="d-flex align-items-center gap-2"
                            >
                              <FiExternalLink />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Scrollable Content */}
                  <div className="flex-grow-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                    <div className="p-4">
                      {/* Job Description */}
                      <Card className="mb-4 border-0 shadow-sm">
                        <Card.Body>
                          <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                            <FiBook />
                            Job Description
                          </h6>
                          <div className="text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                            {selectedJob.description}
                          </div>
                        </Card.Body>
                      </Card>
                      
                      {/* Requirements */}
                      {selectedJob.requirements?.length > 0 && (
                        <Card className="mb-4 border-0 shadow-sm">
                          <Card.Body>
                            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                              <FiCheckCircle />
                              Requirements
                            </h6>
                            <ul className="mb-0">
                              {selectedJob.requirements.map((req, idx) => (
                                <li key={idx} className="mb-2">{req}</li>
                              ))}
                            </ul>
                          </Card.Body>
                        </Card>
                      )}
                      
                      {/* Skills */}
                      {selectedJob.skills?.length > 0 && (
                        <Card className="mb-4 border-0 shadow-sm">
                          <Card.Body>
                            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                              <FiTool />
                              Skills Required
                            </h6>
                            <div className="d-flex flex-wrap gap-2">
                              {selectedJob.skills.map((skill, idx) => {
                                const isMatched = selectedJob.matchedSkills?.includes(skill.toLowerCase())
                                return (
                                  <Badge 
                                    key={idx} 
                                    bg={isMatched ? 'success' : 'primary'}
                                    className="px-3 py-2"
                                  >
                                    {skill}
                                    {isMatched && <FiCheckCircle className="ms-2" size={12} />}
                                  </Badge>
                                )
                              })}
                            </div>
                          </Card.Body>
                        </Card>
                      )}
                      
                      {/* Benefits */}
                      {selectedJob.benefits?.length > 0 && (
                        <Card className="mb-4 border-0 shadow-sm">
                          <Card.Body>
                            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                              <FiAward />
                              Benefits & Perks
                            </h6>
                            <Row>
                              {selectedJob.benefits.map((benefit, idx) => (
                                <Col md={6} key={idx} className="mb-2">
                                  <div className="d-flex align-items-start">
                                    <FiCheckCircle className="text-success mt-1 me-2 flex-shrink-0" />
                                    <span>{benefit}</span>
                                  </div>
                                </Col>
                              ))}
                            </Row>
                          </Card.Body>
                        </Card>
                      )}
                      
                      {/* Company Info */}
                      {(selectedJob.company.description || selectedJob.company.website) && (
                        <Card className="border-0 shadow-sm">
                          <Card.Body>
                            <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                              <FiBriefcase />
                              About {selectedJob.company.name}
                            </h6>
                            {selectedJob.company.description && (
                              <p className="text-dark mb-3">{selectedJob.company.description}</p>
                            )}
                            <div className="d-flex gap-2">
                              {selectedJob.company.website && selectedJob.company.website.trim() !== '' && (
                                <Button
                                  variant="outline-primary"
                                  onClick={() => handleExternalLink(selectedJob.company.website, selectedJob.company.name)}
                                  title="Visit company website"
                                  className="d-flex align-items-center gap-2"
                                >
                                  <FiExternalLink />
                                  Visit Website
                                </Button>
                              )}
                              <Button
                                variant="outline-secondary"
                                onClick={() => handleCompanyClick(selectedJob.company._id)}
                                title="View company profile"
                                className="d-flex align-items-center gap-2"
                              >
                                <FiBriefcase />
                                View Profile
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            </Col>
          )}
        </Row>
      </Container>
      
      {/* Mobile Filter Sidebar */}
      <Offcanvas show={showMobileFilters} onHide={() => setShowMobileFilters(false)} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Filters</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Location</h6>
            <Form.Control
              type="text"
              placeholder="City, state, or remote"
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>
          
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Job Type</h6>
            <Form.Select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
            >
              <option value="all">All Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Part-time">Part-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
              <option value="Remote">Remote</option>
            </Form.Select>
          </div>
          
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Experience Level</h6>
            <Form.Select
              value={filters.experience}
              onChange={(e) => setFilters(prev => ({ ...prev, experience: e.target.value }))}
            >
              <option value="all">All Levels</option>
              <option value="entry">Entry (0-2 years)</option>
              <option value="mid">Mid (3-5 years)</option>
              <option value="senior">Senior (5+ years)</option>
            </Form.Select>
          </div>
          
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Salary Range</h6>
            <Form.Select
              value={filters.salary}
              onChange={(e) => setFilters(prev => ({ ...prev, salary: e.target.value }))}
            >
              <option value="all">All Salaries</option>
              <option value="<50k">Less than $50k</option>
              <option value="50k-100k">$50k - $100k</option>
              <option value="100k-150k">$100k - $150k</option>
              <option value=">150k">More than $150k</option>
            </Form.Select>
          </div>
          
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Remote</h6>
            <Form.Select
              value={filters.remote}
              onChange={(e) => setFilters(prev => ({ ...prev, remote: e.target.value }))}
            >
              <option value="all">Any</option>
              <option value="true">Remote Only</option>
              <option value="false">On-site Only</option>
            </Form.Select>
          </div>
          
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Date Posted</h6>
            <Form.Select
              value={filters.datePosted}
              onChange={(e) => setFilters(prev => ({ ...prev, datePosted: e.target.value }))}
            >
              <option value="all">Any time</option>
              <option value="today">Today</option>
              <option value="3days">Last 3 days</option>
              <option value="week">Last week</option>
              <option value="month">Last month</option>
            </Form.Select>
          </div>
          
          <Button
            variant="outline-danger"
            onClick={clearAllFilters}
            className="w-100 mb-3"
          >
            Clear All Filters
          </Button>
          
          <Button
            variant="primary"
            onClick={() => setShowMobileFilters(false)}
            className="w-100"
          >
            Apply Filters
          </Button>
        </Offcanvas.Body>
      </Offcanvas>
      
      {/* Desktop Filter Sidebar */}
      <Offcanvas show={showFilterSidebar} onHide={() => setShowFilterSidebar(false)} placement="end">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Advanced Filters</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Skills</h6>
            <Form.Control
              type="text"
              placeholder="Filter by specific skills..."
              value={filters.skill}
              onChange={(e) => setFilters(prev => ({ ...prev, skill: e.target.value }))}
            />
          </div>
          
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Company Size</h6>
            <Form.Select>
              <option>Any size</option>
              <option>1-10 employees</option>
              <option>11-50 employees</option>
              <option>51-200 employees</option>
              <option>201-500 employees</option>
              <option>500+ employees</option>
            </Form.Select>
          </div>
          
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Industry</h6>
            <Form.Select>
              <option>Any industry</option>
              <option>Technology</option>
              <option>Finance</option>
              <option>Healthcare</option>
              <option>Education</option>
              <option>Retail</option>
              <option>Manufacturing</option>
            </Form.Select>
          </div>
          
          <div className="mb-4">
            <h6 className="fw-bold mb-3">Benefits</h6>
            <Form.Check
              type="checkbox"
              label="Health Insurance"
              className="mb-2"
            />
            <Form.Check
              type="checkbox"
              label="Dental Insurance"
              className="mb-2"
            />
            <Form.Check
              type="checkbox"
              label="Flexible Hours"
              className="mb-2"
            />
            <Form.Check
              type="checkbox"
              label="Remote Work"
              className="mb-2"
            />
            <Form.Check
              type="checkbox"
              label="Stock Options"
              className="mb-2"
            />
          </div>
          
          <Button
            variant="outline-danger"
            onClick={clearAllFilters}
            className="w-100"
          >
            Clear All Filters
          </Button>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading search results...</p>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}