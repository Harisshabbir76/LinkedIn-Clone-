'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Spinner,
  Image,
  Dropdown,
  CloseButton
} from 'react-bootstrap'
import {
  FiBriefcase,
  FiMapPin,
  FiDollarSign,
  FiCheckCircle,
  FiHeart,
  FiExternalLink,
  FiAlertCircle,
  FiTool,
  FiBook,
  FiAward,
  FiX,
  FiZap,
  FiClock,
  FiUsers,
  FiGlobe,
  FiStar,
  FiTag,
  FiChevronRight
} from 'react-icons/fi'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'

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
  matchPercentage?: number
  matchedSkills?: string[]
}

interface JobWithMatch extends Job {
  matchPercentage: number
  matchedSkills: string[]
}

interface JobListWithDetailsProps {
  jobs: JobWithMatch[]
  loading: boolean
  savedJobs: string[]
  appliedJobs: string[]
  selectedJob: JobWithMatch | null
  sortBy: 'match' | 'newest' | 'salary'
  activeFilters: string[]
  onJobSelect: (job: JobWithMatch) => void
  onSaveJob: (jobId: string) => void
  onApplyJob: (jobId: string) => void
  onSortChange: (sort: 'match' | 'newest' | 'salary') => void
  onClearFilters?: () => void
  onRemoveFilter?: (filter: string) => void
  isAuthenticated?: boolean
}

export default function JobListWithDetails({
  jobs,
  loading,
  savedJobs,
  appliedJobs,
  selectedJob,
  sortBy,
  activeFilters,
  onJobSelect,
  onSaveJob,
  onApplyJob,
  onSortChange,
  onClearFilters,
  onRemoveFilter,
  isAuthenticated = true
}: JobListWithDetailsProps) {
  const router = useRouter()
  const detailsRef = useRef<HTMLDivElement>(null)

  // Helper function to get image URL
  const getImageUrl = (imagePath: string | undefined | null) => {
    if (!imagePath) return ''
    if (imagePath.startsWith('http')) return imagePath
    return `http://localhost:5000/${imagePath.replace(/\\/g, '/')}`
  }

  // Helper function to check if website URL is valid
  const isValidWebsite = (url: string | undefined): boolean => {
    if (!url) return false
    // Remove whitespace
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return false
    
    // Basic URL validation
    try {
      // Try to create a URL object
      const urlObj = new URL(trimmedUrl.includes('://') ? trimmedUrl : `https://${trimmedUrl}`)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  // Format website URL
  const formatWebsiteUrl = (url: string | undefined): string => {
    if (!url) return ''
    const trimmedUrl = url.trim()
    if (!trimmedUrl.includes('://')) {
      return `https://${trimmedUrl}`
    }
    return trimmedUrl
  }

  // Handle company name click (opens in new tab)
  const handleCompanyClick = (companyId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    // Open in new tab
    window.open(`/company/${companyId}`, '_blank', 'noopener,noreferrer')
  }

  // Handle external link click (opens in new tab)
  const handleExternalLink = (url: string | undefined, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!url || !isValidWebsite(url)) {
      toast.error('Website URL not available')
      return
    }
    
    // Format URL and open in new tab
    const fullUrl = formatWebsiteUrl(url)
    window.open(fullUrl, '_blank', 'noopener,noreferrer')
  }

  // Get match level
  const getMatchLevel = (percentage: number) => {
    if (percentage >= 80) return { text: 'Perfect Match', color: '#10b981', bg: 'bg-emerald-50', border: 'border-emerald-200' }
    if (percentage >= 60) return { text: 'Great Match', color: '#3b82f6', bg: 'bg-blue-50', border: 'border-blue-200' }
    if (percentage >= 40) return { text: 'Good Match', color: '#8b5cf6', bg: 'bg-purple-50', border: 'border-purple-200' }
    if (percentage >= 20) return { text: 'Fair Match', color: '#f59e0b', bg: 'bg-amber-50', border: 'border-amber-200' }
    return { text: 'Basic Match', color: '#6b7280', bg: 'bg-gray-50', border: 'border-gray-200' }
  }

  // Format salary
  const formatSalary = (salary: any) => {
    if (!salary.min && !salary.max) return 'Not specified'
    
    const currency = salary.currency || '$'
    if (salary.min && salary.max) {
      const minInK = salary.min >= 1000 ? `${Math.floor(salary.min / 1000)}k` : salary.min.toString()
      const maxInK = salary.max >= 1000 ? `${Math.floor(salary.max / 1000)}k` : salary.max.toString()
      return `${currency}${minInK} - ${currency}${maxInK}`
    } else if (salary.min) {
      const minInK = salary.min >= 1000 ? `${Math.floor(salary.min / 1000)}k` : salary.min.toString()
      return `${currency}${minInK}`
    } else {
      const maxInK = salary.max >= 1000 ? `${Math.floor(salary.max / 1000)}k` : salary.max.toString()
      return `${currency}${maxInK}`
    }
  }

  // Format salary for list view
  const formatSalaryShort = (salary: any) => {
    if (!salary.min && !salary.max) return ''
    
    const currency = salary.currency || '$'
    if (salary.min && salary.max) {
      const minInK = salary.min >= 1000 ? `${Math.floor(salary.min / 1000)}k` : salary.min.toString()
      const maxInK = salary.max >= 1000 ? `${Math.floor(salary.max / 1000)}k` : salary.max.toString()
      return `${currency}${minInK}-${maxInK}`
    } else if (salary.min) {
      const minInK = salary.min >= 1000 ? `${Math.floor(salary.min / 1000)}k` : salary.min.toString()
      return `From ${currency}${minInK}`
    } else {
      const maxInK = salary.max >= 1000 ? `${Math.floor(salary.max / 1000)}k` : salary.max.toString()
      return `Up to ${currency}${maxInK}`
    }
  }

  // Get time ago
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

  // Get experience level text
  const getExperienceLevel = (minYears: number) => {
    if (minYears <= 2) return 'Entry'
    if (minYears <= 5) return 'Mid'
    return 'Senior'
  }

  // Handle apply button click
  const handleApplyClick = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    onApplyJob(jobId)
  }

  // Handle save button click
  const handleSaveClick = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    onSaveJob(jobId)
  }

  // Scroll to top when new job is selected
  useEffect(() => {
    if (detailsRef.current) {
      detailsRef.current.scrollTop = 0
    }
  }, [selectedJob])

  if (loading) {
    return (
      <div className="min-vh-50 d-flex align-items-center justify-content-center">
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Loading jobs...</span>
      </div>
    )
  }

  return (
    <Row className="g-4">
      {/* Left Column - Job Listings */}
      <Col lg={selectedJob ? 5 : 12} xl={selectedJob ? 5 : 12}>
        <Card className="border-0 shadow-sm h-100">
          <Card.Body className="p-0">
            {/* Header */}
            <div className="border-bottom p-3 bg-white sticky-top" style={{ zIndex: 5 }}>
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0 fw-semibold">
                  {jobs.length} jobs found
                  <span className="text-muted fw-normal ms-2">
                    • Sorted by {sortBy === 'match' ? 'relevance' : sortBy === 'newest' ? 'date' : 'salary'}
                  </span>
                </h6>
                
                {/* Sort Dropdown */}
                <Dropdown>
                  <Dropdown.Toggle variant="light" size="sm" className="border d-flex align-items-center gap-2">
                    Sort
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    <Dropdown.Item onClick={() => onSortChange('match')}>Relevance</Dropdown.Item>
                    <Dropdown.Item onClick={() => onSortChange('newest')}>Newest</Dropdown.Item>
                    <Dropdown.Item onClick={() => onSortChange('salary')}>Salary</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </div>

              {/* Active Filters */}
              {activeFilters.length > 0 && (
                <div className="d-flex align-items-center flex-wrap gap-2 mt-3">
                  <span className="small text-muted">Active filters:</span>
                  {activeFilters.map((filter, idx) => (
                    <Badge key={idx} bg="light" text="dark" className="d-flex align-items-center gap-1 px-2 py-1 border">
                      {filter}
                      {onRemoveFilter && (
                        <CloseButton onClick={() => onRemoveFilter(filter)} className="ms-1 fs-8" />
                      )}
                    </Badge>
                  ))}
                  {onClearFilters && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={onClearFilters}
                      className="text-decoration-none p-0"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Jobs List */}
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
              {jobs.length === 0 ? (
                <div className="text-center py-8">
                  <FiAlertCircle size={48} className="text-muted mb-3" />
                  <h5 className="mb-2">No jobs found</h5>
                  <p className="text-muted mb-4">Try adjusting your filters</p>
                  {onClearFilters && (
                    <Button variant="primary" onClick={onClearFilters}>
                      Clear all filters
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  {jobs.map((job, index) => {
                    const isSelected = selectedJob?._id === job._id
                    const isSaved = savedJobs.includes(job._id)
                    const isApplied = appliedJobs.includes(job._id)
                    const matchLevel = getMatchLevel(job.matchPercentage)
                    const hasSalary = job.salary && (job.salary.min || job.salary.max)
                    const hasWebsite = isValidWebsite(job.company.website)
                    
                    return (
                      <motion.div
                        key={job._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div 
                          className={`p-3 border-bottom cursor-pointer transition-all ${isSelected ? 'bg-primary bg-opacity-5 border-primary border-start-4' : 'bg-white hover-bg-light border-start-0'}`}
                          onClick={() => onJobSelect(job)}
                          style={{ 
                            borderLeft: isSelected ? '4px solid #0d6efd' : 'none',
                            transition: 'all 0.2s ease'
                          }}
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
                                <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white"
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
                                    className="mb-1 text-primary fw-semibold small cursor-pointer hover-underline d-flex align-items-center gap-1"
                                    onClick={(e) => handleCompanyClick(job.company._id, e)}
                                    style={{ 
                                      cursor: 'pointer',
                                      textDecoration: 'none',
                                      transition: 'text-decoration 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                    title="View company profile (opens in new tab)"
                                  >
                                    {job.companyName}
                                    <FiExternalLink size={12} className="opacity-75" />
                                  </p>
                                </div>
                                <div className="d-flex align-items-center gap-1">
                                  {job.matchPercentage > 0 && (
                                    <Badge 
                                      style={{ 
                                        backgroundColor: matchLevel.color + '15',
                                        color: matchLevel.color,
                                        border: `1px solid ${matchLevel.color}40`
                                      }} 
                                      className="px-2 py-1 fw-medium"
                                    >
                                      {job.matchPercentage}% match
                                    </Badge>
                                  )}
                                  <Button
                                    variant="link"
                                    className="p-0 text-decoration-none"
                                    onClick={(e) => handleSaveClick(job._id, e)}
                                    title={isSaved ? 'Remove from saved' : 'Save job'}
                                  >
                                    <FiHeart className={isSaved ? 'text-danger fill-danger' : 'text-muted'} size={18} />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                                <span className="d-flex align-items-center gap-1 text-muted small">
                                  <FiMapPin size={12} />
                                  {job.location}
                                </span>
                                {job.isRemote && (
                                  <Badge bg="success" className="px-2 py-1 small d-flex align-items-center gap-1">
                                    <FiGlobe size={10} />
                                    Remote
                                  </Badge>
                                )}
                                {job.isUrgent && (
                                  <Badge bg="danger" className="px-2 py-1 small d-flex align-items-center gap-1">
                                    <FiZap size={10} />
                                    Urgent
                                  </Badge>
                                )}
                                {job.isFeatured && (
                                  <Badge bg="warning" className="px-2 py-1 small d-flex align-items-center gap-1">
                                    <FiStar size={10} />
                                    Featured
                                  </Badge>
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
                                {hasWebsite && (
                                  <Badge 
                                    bg="info" 
                                    className="px-2 py-1 small cursor-pointer d-flex align-items-center gap-1"
                                    onClick={(e) => handleExternalLink(job.company.website, e)}
                                    title="Visit company website"
                                  >
                                    <FiExternalLink size={10} />
                                    Website
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
              <div className="bg-white border-bottom" style={{ flexShrink: 0 }}>
                <div className="sticky-top bg-white" style={{ zIndex: 10 }}>
                  <div className="p-4">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div className="d-flex align-items-start gap-3">
                        {/* Company Logo */}
                        <div className="flex-shrink-0">
                          {selectedJob.company.logo ? (
                            <Image
                              src={getImageUrl(selectedJob.company.logo)}
                              alt={selectedJob.company.name}
                              rounded
                              className="border shadow-sm"
                              style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center text-white shadow-sm"
                              style={{ width: '64px', height: '64px' }}>
                              <FiBriefcase size={28} />
                            </div>
                          )}
                        </div>
                        
                        {/* Job Title and Company */}
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h3 className="fw-bold mb-1">{selectedJob.title}</h3>
                              <div className="d-flex align-items-center gap-2">
                                <h5 
                                  className="text-primary mb-2 cursor-pointer hover-underline d-flex align-items-center gap-1"
                                  onClick={(e) => handleCompanyClick(selectedJob.company._id, e)}
                                  style={{ 
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    transition: 'text-decoration 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                  title="View company profile (opens in new tab)"
                                >
                                  {selectedJob.companyName}
                                  <FiExternalLink size={16} className="opacity-75" />
                                </h5>
                              </div>
                            </div>
                            {/* Close Button */}
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => onJobSelect(null as any)}
                              className="d-lg-none border-0"
                            >
                              <FiX size={20} />
                            </Button>
                          </div>
                          <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
                            <Badge bg="light" text="dark" className="px-3 py-2 border d-flex align-items-center gap-2">
                              <FiMapPin size={14} />
                              {selectedJob.location}
                            </Badge>
                            <Badge bg="light" text="dark" className="px-3 py-2 border d-flex align-items-center gap-2">
                              <FiBriefcase size={14} />
                              {selectedJob.type}
                            </Badge>
                            {selectedJob.isRemote && (
                              <Badge bg="success" className="px-3 py-2 d-flex align-items-center gap-2">
                                <FiGlobe size={14} />
                                Remote
                              </Badge>
                            )}
                            {selectedJob.isUrgent && (
                              <Badge bg="danger" className="px-3 py-2 d-flex align-items-center gap-2">
                                <FiZap size={14} />
                                Urgent
                              </Badge>
                            )}
                            {selectedJob.isFeatured && (
                              <Badge bg="warning" className="px-3 py-2 d-flex align-items-center gap-2">
                                <FiStar size={14} />
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Quick Stats */}
                    <Row className="g-3 mb-3">
                      <Col xs={6} md={3}>
                        <div className="bg-light rounded p-3 text-center">
                          <div className="fw-bold text-primary d-flex align-items-center justify-content-center gap-2">
                            <FiUsers size={16} />
                            {selectedJob.experience.minYears}+ yrs
                          </div>
                          <small className="text-muted">Experience</small>
                        </div>
                      </Col>
                      <Col xs={6} md={3}>
                        <div className="bg-light rounded p-3 text-center">
                          <div className="fw-bold text-success d-flex align-items-center justify-content-center gap-2">
                            <FiDollarSign size={16} />
                            {formatSalary(selectedJob.salary)}
                          </div>
                          <small className="text-muted">Salary</small>
                        </div>
                      </Col>
                      <Col xs={6} md={3}>
                        <div className="bg-light rounded p-3 text-center">
                          <div className="fw-bold text-info d-flex align-items-center justify-content-center gap-2">
                            <FiClock size={16} />
                            {getTimeAgo(selectedJob.createdAt)}
                          </div>
                          <small className="text-muted">Posted</small>
                        </div>
                      </Col>
                      {selectedJob.matchPercentage > 0 && (
                        <Col xs={6} md={3}>
                          <div className="bg-light rounded p-3 text-center">
                            <div className="fw-bold d-flex align-items-center justify-content-center gap-2" style={{ color: getMatchLevel(selectedJob.matchPercentage).color }}>
                              {selectedJob.matchPercentage}%
                            </div>
                            <small className="text-muted">Your match</small>
                          </div>
                        </Col>
                      )}
                    </Row>
                    
                    {/* Action Buttons */}
                    <div className="d-flex gap-3 mt-4">
                      <div className="position-relative flex-grow-1">
                        <Button
                          variant="primary"
                          size="lg"
                          onClick={(e) => handleApplyClick(selectedJob._id, e)}
                          disabled={appliedJobs.includes(selectedJob._id)}
                          className="w-100 d-flex align-items-center justify-content-center gap-2"
                        >
                          {appliedJobs.includes(selectedJob._id) ? (
                            <>
                              <FiCheckCircle size={20} />
                              Applied
                            </>
                          ) : (
                            <>
                              <FiZap size={20} />
                              Apply Now
                            </>
                          )}
                        </Button>
                        {isValidWebsite(selectedJob.company.website) && !appliedJobs.includes(selectedJob._id) && (
                          <Button
                            variant="link"
                            className="position-absolute top-0 end-0 p-2 text-white opacity-75 hover-opacity-100"
                            onClick={(e) => handleExternalLink(selectedJob.company.website, e)}
                            title="Visit company website (opens in new tab)"
                            style={{
                              right: '8px',
                              top: '8px',
                              zIndex: 5,
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <FiExternalLink size={16} />
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="outline-primary"
                        size="lg"
                        onClick={(e) => handleSaveClick(selectedJob._id, e)}
                        className="px-4 d-flex align-items-center justify-content-center gap-2"
                        title={savedJobs.includes(selectedJob._id) ? 'Remove from saved' : 'Save job'}
                      >
                        <FiHeart className={savedJobs.includes(selectedJob._id) ? 'text-danger fill-danger' : ''} size={20} />
                        {savedJobs.includes(selectedJob._id) ? 'Saved' : 'Save'}
                      </Button>
                      {isValidWebsite(selectedJob.company.website) && (
                        <Button
                          variant="outline-success"
                          size="lg"
                          onClick={(e) => handleExternalLink(selectedJob.company.website, e)}
                          className="px-4 d-flex align-items-center justify-content-center gap-2"
                          title="Visit company website (opens in new tab)"
                        >
                          <FiExternalLink size={20} />
                          Website
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div 
                ref={detailsRef}
                className="flex-grow-1 overflow-auto" 
                style={{ maxHeight: 'calc(100vh - 400px)' }}
              >
                <div className="p-4">
                  {/* Job Description */}
                  <Card className="mb-4 border-0 bg-light">
                    <Card.Body className="p-4">
                      <h5 className="fw-bold mb-3 d-flex align-items-center gap-3">
                        <div className="bg-primary bg-opacity-10 p-2 rounded">
                          <FiBook className="text-primary" size={20} />
                        </div>
                        Job Description
                      </h5>
                      <div className="text-dark lead" style={{ lineHeight: '1.8' }}>
                        {selectedJob.description}
                      </div>
                    </Card.Body>
                  </Card>

                  {/* Requirements */}
                  {selectedJob.requirements?.length > 0 && (
                    <Card className="mb-4 border-0 bg-light">
                      <Card.Body className="p-4">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-3">
                          <div className="bg-primary bg-opacity-10 p-2 rounded">
                            <FiCheckCircle className="text-primary" size={20} />
                          </div>
                          Requirements
                        </h5>
                        <ul className="list-unstyled mb-0">
                          {selectedJob.requirements.map((req, idx) => (
                            <li key={idx} className="mb-3 d-flex align-items-start">
                              <FiChevronRight className="text-primary mt-1 me-3 flex-shrink-0" />
                              <span className="lead">{req}</span>
                            </li>
                          ))}
                        </ul>
                      </Card.Body>
                    </Card>
                  )}

                  {/* Skills */}
                  {selectedJob.skills?.length > 0 && (
                    <Card className="mb-4 border-0 bg-light">
                      <Card.Body className="p-4">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-3">
                          <div className="bg-primary bg-opacity-10 p-2 rounded">
                            <FiTool className="text-primary" size={20} />
                          </div>
                          Skills Required
                        </h5>
                        <div className="d-flex flex-wrap gap-2">
                          {selectedJob.skills.map((skill, idx) => {
                            const isMatched = selectedJob.matchedSkills?.includes(skill.toLowerCase())
                            return (
                              <Badge 
                                key={idx} 
                                bg={isMatched ? 'success' : 'secondary'}
                                className="px-4 py-2 fw-normal d-flex align-items-center gap-2"
                                style={{ fontSize: '1rem' }}
                              >
                                {skill}
                                {isMatched && <FiCheckCircle size={16} />}
                              </Badge>
                            )
                          })}
                        </div>
                      </Card.Body>
                    </Card>
                  )}

                  {/* Benefits */}
                  {selectedJob.benefits?.length > 0 && (
                    <Card className="mb-4 border-0 bg-light">
                      <Card.Body className="p-4">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-3">
                          <div className="bg-primary bg-opacity-10 p-2 rounded">
                            <FiAward className="text-primary" size={20} />
                          </div>
                          Benefits & Perks
                        </h5>
                        <Row>
                          {selectedJob.benefits.map((benefit, idx) => (
                            <Col md={6} key={idx} className="mb-3">
                              <div className="d-flex align-items-start bg-white p-3 rounded">
                                <FiCheckCircle className="text-success mt-1 me-3 flex-shrink-0" size={20} />
                                <span className="lead">{benefit}</span>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </Card.Body>
                    </Card>
                  )}

                  {/* Company Info */}
                  {selectedJob.company.description && (
                    <Card className="border-0 bg-light">
                      <Card.Body className="p-4">
                        <h5 className="fw-bold mb-3 d-flex align-items-center gap-3">
                          <div className="bg-primary bg-opacity-10 p-2 rounded">
                            <FiBriefcase className="text-primary" size={20} />
                          </div>
                          About {selectedJob.companyName}
                        </h5>
                        <p className="text-dark lead mb-4">{selectedJob.company.description}</p>
                        {isValidWebsite(selectedJob.company.website) && (
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-primary"
                              onClick={(e) => handleExternalLink(selectedJob.company.website, e)}
                              className="d-inline-flex align-items-center gap-2 px-4 py-3"
                              title="Visit company website (opens in new tab)"
                            >
                              <FiExternalLink size={18} />
                              Visit Company Website
                            </Button>
                            <Button
                              variant="outline-secondary"
                              onClick={(e) => handleCompanyClick(selectedJob.company._id, e)}
                              className="d-inline-flex align-items-center gap-2 px-4 py-3"
                              title="View full company profile (opens in new tab)"
                            >
                              <FiBriefcase size={18} />
                              View Company Profile
                            </Button>
                          </div>
                        )}
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
  )
}
