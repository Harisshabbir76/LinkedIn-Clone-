'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
  Form,
  Spinner,
  Alert,
  Badge,
  ProgressBar,
  Image,
  Modal
} from 'react-bootstrap'
import {
  FiArrowLeft,
  FiUpload,
  FiCheckCircle,
  FiBriefcase,
  FiFileText,
  FiUser,
  FiMail,
  FiPhone,
  FiMapPin,
  FiGlobe,
  FiLinkedin,
  FiGithub,
  FiExternalLink,
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiAlertCircle,
  FiLogIn,
  FiPlus,
  FiTrash2,
  FiLink,
  FiCheck,
  FiX
} from 'react-icons/fi'

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
}

interface PortfolioLink {
  _id?: string
  title?: string
  url: string
  description?: string
  type?: string
  isPrimary?: boolean
}

interface UserProfile {
  _id: string
  name: string
  email: string
  phone?: string
  location?: string
  profileImage?: string
  resume?: string
  skills: Array<{
    name: string
    proficiency: string
    yearsOfExperience?: number
  }>
  education: Array<{
    institution: string
    degree: string
    fieldOfStudy?: string
    startYear: number
    endYear?: number
    isCurrentlyStudying?: boolean
  }>
  experience: Array<{
    title: string
    company: string
    location?: string
    startDate: string
    endDate?: string
    currentlyWorking?: boolean
    description?: string
  }>
  portfolioLinks?: PortfolioLink[]
}

interface ApplicationData {
  jobId: string
  resume: File | null
  resumeUrl: string
  coverLetter: string
  portfolioLinks: PortfolioLink[]
  additionalInfo: string
  questions: Array<{
    question: string
    answer: string
  }>
}

export default function JobApplyPage() {
  const router = useRouter()
  const params = useParams()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  
  const [job, setJob] = useState<Job | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [hasApplied, setHasApplied] = useState<boolean>(false)
  const [checkingAppliedStatus, setCheckingAppliedStatus] = useState<boolean>(true)
  
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    jobId: '',
    resume: null,
    resumeUrl: '',
    coverLetter: '',
    portfolioLinks: [],
    additionalInfo: '',
    questions: []
  })
  
  const [resumeUploadProgress, setResumeUploadProgress] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [applicationQuestions, setApplicationQuestions] = useState<string[]>([])

  const jobId = params.id as string

  // Get token from localStorage
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token')
    }
    return null
  }

  // Clear token if invalid
  const clearInvalidToken = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      toast.error('Session expired. Please login again.')
      router.push(`/login?redirect=/jobs/${jobId}/apply`)
    }
  }

  // Check if user has already applied
  const checkApplicationStatus = async () => {
    try {
      setCheckingAppliedStatus(true)
      const token = getAuthToken()
      
      if (!token) {
        setCheckingAppliedStatus(false)
        return
      }
      
      // Try multiple endpoints to check application status
      try {
        // Try the main applications endpoint
        const response = await axios.get('http://localhost:5000/api/applications/my-applications', {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        let hasAppliedToThisJob = false
        
        if (response.data && response.data.applications) {
          // If response has applications array
          hasAppliedToThisJob = response.data.applications.some((app: any) => 
            app.job && app.job._id === jobId
          )
        } else if (Array.isArray(response.data)) {
          // If response is directly an array
          hasAppliedToThisJob = response.data.some((app: any) => 
            (app.job && app.job._id === jobId) || app._id === jobId
          )
        }
        
        setHasApplied(hasAppliedToThisJob)
        
      } catch (error: any) {
        console.log('First endpoint failed, trying alternative...')
        
        // Try alternative endpoint
        try {
          const altResponse = await axios.get(
            `http://localhost:5000/api/jobs/${jobId}/application-status`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          
          if (altResponse.data && altResponse.data.hasApplied !== undefined) {
            setHasApplied(altResponse.data.hasApplied)
          }
        } catch (altError) {
          console.log('Both endpoints failed, assuming not applied')
          setHasApplied(false)
        }
      }
    } catch (error) {
      console.error('Error checking application status:', error)
      setHasApplied(false)
    } finally {
      setCheckingAppliedStatus(false)
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error('Please login to apply for jobs')
      router.push(`/login?redirect=/jobs/${jobId}/apply`)
      return
    }

    if (jobId && isAuthenticated) {
      fetchJobDetails()
      fetchUserProfile()
      checkApplicationStatus()
    }
  }, [jobId, authLoading, isAuthenticated])

  const fetchJobDetails = async () => {
    try {
      setLoading(true)
      setAuthError(null)
      
      const token = getAuthToken()
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      
      const response = await axios.get(`http://localhost:5000/api/jobs/${jobId}`, config)
      const jobData = response.data.job || response.data
      
      if (!jobData) {
        throw new Error('Job not found')
      }
      
      setJob(jobData)
      setApplicationData(prev => ({ ...prev, jobId }))
      
      // Fetch application questions if any
      try {
        const questionsResponse = await axios.get(
          `http://localhost:5000/api/jobs/${jobId}/questions`, 
          config
        )
        if (questionsResponse.data.questions) {
          setApplicationQuestions(questionsResponse.data.questions)
          setApplicationData(prev => ({
            ...prev,
            questions: questionsResponse.data.questions.map((q: string) => ({ question: q, answer: '' }))
          }))
        }
      } catch (questionsError) {
        console.log('No custom questions for this job')
      }
    } catch (error: any) {
      console.error('Error fetching job:', error)
      
      if (error.response?.status === 401) {
        clearInvalidToken()
        return
      }
      
      toast.error(error.response?.data?.message || 'Failed to load job details')
      router.push('/jobs')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const token = getAuthToken()
      
      if (!token) {
        setAuthError('No authentication token found')
        clearInvalidToken()
        return
      }

      const response = await axios.get('http://localhost:5000/api/auth/user', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.data) {
        throw new Error('No user data received')
      }
      
      // Ensure we have the full name
      const userProfileData = response.data
      userProfileData.fullName = userProfileData.name || userProfileData.fullName
      
      setUserProfile(userProfileData)
      
      // Pre-fill form with user data
      setApplicationData(prev => ({
        ...prev,
        resumeUrl: userProfileData.resume || '',
        // Convert user's portfolioLinks to application format
        portfolioLinks: userProfileData.portfolioLinks?.map((link: any) => ({
          _id: link._id,
          title: link.title || '',
          url: link.url || '',
          description: link.description || '',
          type: link.type || 'website',
          isPrimary: link.isPrimary || false
        })) || [],
        coverLetter: generateDefaultCoverLetter(userProfileData)
      }))
      
    } catch (error: any) {
      console.error('Error fetching user profile:', error)
      
      if (error.response?.status === 401) {
        setAuthError('Your session has expired. Please login again.')
        clearInvalidToken()
      } else {
        setAuthError('Failed to load user profile. Please try again.')
      }
      
      toast.error(authError || 'Failed to load user profile')
    }
  }

  const generateDefaultCoverLetter = (profile: UserProfile) => {
    if (!job || !profile) return ''
    
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    let experienceText = ''
    if (profile.experience && profile.experience.length > 0) {
      const latestExp = profile.experience[0]
      experienceText = `Most recently, I worked as a ${latestExp.title} at ${latestExp.company}, where I gained valuable experience in ${job.skills.slice(0, 3).join(', ')}.`
    } else {
      experienceText = `I have developed strong skills in ${job.skills.slice(0, 3).join(', ')}, which align well with the requirements for this position.`
    }

    return `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.companyName}. ${experienceText}

I have attached my resume for your review, which provides further details about my qualifications and achievements. I am particularly drawn to this opportunity because [mention specific reason based on job description].

Thank you for considering my application. I would welcome the opportunity to discuss how my skills and experience can contribute to your team.

Sincerely,
${profile.name || profile.fullName || ''}
${profile.email}
${profile.phone ? `Phone: ${profile.phone}` : ''}`
  }

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a PDF or Word document (PDF, DOC, DOCX)')
        return
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB')
        return
      }
      
      // Simulate upload progress
      setResumeUploadProgress(0)
      const interval = setInterval(() => {
        setResumeUploadProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + 10
        })
      }, 100)
      
      setTimeout(() => {
        clearInterval(interval)
        setResumeUploadProgress(100)
        setApplicationData(prev => ({ ...prev, resume: file, resumeUrl: '' }))
        toast.success('Resume uploaded successfully!')
      }, 1000)
    }
  }

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...applicationData.questions]
    newQuestions[index].answer = value
    setApplicationData(prev => ({ ...prev, questions: newQuestions }))
  }

  // Portfolio links handlers
  const addPortfolioLink = () => {
    if (applicationData.portfolioLinks.length >= 3) {
      toast.error('Maximum 3 portfolio links allowed')
      return
    }
    
    setApplicationData(prev => ({
      ...prev,
      portfolioLinks: [
        ...prev.portfolioLinks,
        { title: '', url: '', description: '', type: 'website' }
      ]
    }))
  }
  
  const removePortfolioLink = (index: number) => {
    setApplicationData(prev => ({
      ...prev,
      portfolioLinks: prev.portfolioLinks.filter((_, i) => i !== index)
    }))
  }
  
  const updatePortfolioLink = (index: number, field: keyof PortfolioLink, value: string) => {
    const updatedLinks = [...applicationData.portfolioLinks]
    updatedLinks[index] = { ...updatedLinks[index], [field]: value }
    setApplicationData(prev => ({ ...prev, portfolioLinks: updatedLinks }))
  }
  
  const validatePortfolioLinks = () => {
    for (const link of applicationData.portfolioLinks) {
      if (!link.url.trim()) {
        toast.error('Please fill in all portfolio URLs')
        return false
      }
      
      try {
        new URL(link.url)
      } catch {
        toast.error(`Invalid URL: ${link.url}`)
        return false
      }
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if already applied
    if (hasApplied) {
      toast.error('You have already applied for this job!')
      return
    }
    
    // Check authentication
    const token = getAuthToken()
    if (!token) {
      toast.error('Please login to apply for jobs')
      router.push(`/login?redirect=/jobs/${jobId}/apply`)
      return
    }
    
    if (!applicationData.resume && !applicationData.resumeUrl) {
      toast.error('Please upload your resume')
      return
    }
    
    if (!applicationData.coverLetter.trim()) {
      toast.error('Please write a cover letter')
      return
    }
    
    // Validate portfolio links
    if (!validatePortfolioLinks()) {
      return
    }
    
    // Validate all questions are answered
    const unansweredQuestions = applicationData.questions.filter(q => !q.answer.trim())
    if (unansweredQuestions.length > 0) {
      toast.error('Please answer all application questions')
      return
    }
    
    setSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('jobId', jobId)
      formData.append('coverLetterText', applicationData.coverLetter)
      
      if (applicationData.resume) {
        formData.append('resume', applicationData.resume)
      } else if (applicationData.resumeUrl) {
        formData.append('resumeUrl', applicationData.resumeUrl)
      }
      
      // Add portfolio links
      if (applicationData.portfolioLinks.length > 0) {
        formData.append('portfolioLinks', JSON.stringify(applicationData.portfolioLinks))
      }
      
      if (applicationData.additionalInfo) formData.append('additionalInfo', applicationData.additionalInfo)
      
      if (applicationData.questions.length > 0) {
        formData.append('questions', JSON.stringify(applicationData.questions))
      }

      const response = await axios.post(
        `http://localhost:5000/api/jobs/${jobId}/apply`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total 
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0
            setResumeUploadProgress(progress)
          }
        }
      )

      toast.success('Application submitted successfully!')
      
      // Update applied status
      setHasApplied(true)
      
      // Redirect to jobs page with success message
      setTimeout(() => {
        router.push('/jobs')
      }, 1500)
      
    } catch (error: any) {
      console.error('Error submitting application:', error)
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.')
        clearInvalidToken()
        router.push(`/login?redirect=/jobs/${jobId}/apply`)
        return
      }
      
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to submit application'
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const getImageUrl = (imagePath: string | undefined | null) => {
    if (!imagePath) return ''
    if (imagePath.startsWith('http')) return imagePath
    return `http://localhost:5000/${imagePath.replace(/\\/g, '/')}`
  }

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

  const ApplicationStep = ({ number, title, active, completed }: { 
    number: number, 
    title: string, 
    active: boolean, 
    completed: boolean 
  }) => (
    <div className={`d-flex align-items-center mb-3 ${completed ? 'text-success' : active ? 'text-primary' : 'text-muted'}`}>
      <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${completed ? 'bg-success' : active ? 'bg-primary' : 'bg-secondary'} text-white`}
        style={{ width: '32px', height: '32px' }}>
        {completed ? <FiCheckCircle size={16} /> : number}
      </div>
      <span className="fw-semibold">{title}</span>
    </div>
  )

  // Timeline Component for Already Applied View
  const ApplicationTimeline = () => (
    <div className="timeline" style={{ position: 'relative', paddingLeft: '30px' }}>
      {/* Submitted Step */}
      <div className="timeline-item" style={{ position: 'relative', marginBottom: '20px' }}>
        <div className="timeline-marker" style={{ 
          position: 'absolute',
          left: '-30px',
          top: 0,
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#198754',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <FiCheck size={12} color="white" />
        </div>
        <div className="timeline-content">
          <h6 className="fw-bold mb-1">Application Submitted</h6>
          <p className="text-muted small mb-0">Your application has been received by the employer</p>
        </div>
      </div>
      
      {/* Under Review Step */}
      <div className="timeline-item" style={{ position: 'relative', marginBottom: '20px' }}>
        <div className="timeline-marker" style={{ 
          position: 'absolute',
          left: '-30px',
          top: 0,
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#0d6efd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <FiClock size={12} color="white" />
        </div>
        <div className="timeline-content">
          <h6 className="fw-bold mb-1">Under Review</h6>
          <p className="text-muted small mb-0">Employer is reviewing your application</p>
        </div>
      </div>
      
      {/* Shortlisted Step */}
      <div className="timeline-item" style={{ position: 'relative', marginBottom: '20px' }}>
        <div className="timeline-marker" style={{ 
          position: 'absolute',
          left: '-30px',
          top: 0,
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#f8f9fa',
          border: '2px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6c757d' }}></div>
        </div>
        <div className="timeline-content">
          <h6 className="fw-bold mb-1">Shortlisted</h6>
          <p className="text-muted small mb-0">You may be contacted for an interview</p>
        </div>
      </div>
      
      {/* Interview Step */}
      <div className="timeline-item" style={{ position: 'relative', marginBottom: '20px' }}>
        <div className="timeline-marker" style={{ 
          position: 'absolute',
          left: '-30px',
          top: 0,
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#f8f9fa',
          border: '2px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6c757d' }}></div>
        </div>
        <div className="timeline-content">
          <h6 className="fw-bold mb-1">Interview</h6>
          <p className="text-muted small mb-0">Schedule and conduct interviews</p>
        </div>
      </div>
      
      {/* Offer Step */}
      <div className="timeline-item" style={{ position: 'relative', marginBottom: '20px' }}>
        <div className="timeline-marker" style={{ 
          position: 'absolute',
          left: '-30px',
          top: 0,
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#f8f9fa',
          border: '2px solid #dee2e6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6c757d' }}></div>
        </div>
        <div className="timeline-content">
          <h6 className="fw-bold mb-1">Offer</h6>
          <p className="text-muted small mb-0">Receive job offer decision</p>
        </div>
      </div>
    </div>
  )

  // Loading states
  if (authLoading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Checking authentication...</p>
        </div>
      </Container>
    )
  }

  if (!isAuthenticated) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <Alert.Heading>Authentication Required</Alert.Heading>
          <p>You need to be logged in to apply for jobs.</p>
          <div className="d-flex gap-2">
            <Button variant="primary" onClick={() => router.push(`/login?redirect=/jobs/${jobId}/apply`)}>
              <FiLogIn className="me-2" />
              Login to Apply
            </Button>
            <Button variant="outline-secondary" onClick={() => router.push('/jobs')}>
              Back to Jobs
            </Button>
          </div>
        </Alert>
      </Container>
    )
  }

  if (authError) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Authentication Error</Alert.Heading>
          <p>{authError}</p>
          <Button variant="primary" onClick={() => router.push(`/login?redirect=/jobs/${jobId}/apply`)}>
            <FiLogIn className="me-2" />
            Login Again
          </Button>
        </Alert>
      </Container>
    )
  }

  if (checkingAppliedStatus) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Checking application status...</p>
        </div>
      </Container>
    )
  }

  // Already Applied View
  if (hasApplied && job) {
    return (
      <Container className="py-5">
        <Button
          variant="outline-secondary"
          className="mb-4 d-flex align-items-center gap-2"
          onClick={() => router.push(`/jobs/${jobId}`)}
        >
          <FiArrowLeft />
          Back to Job
        </Button>
        
        <Card className="border-0 shadow text-center py-5 my-5">
          <Card.Body>
            <FiCheckCircle size={64} className="text-success mb-4" />
            <h2 className="fw-bold mb-3">Already Applied!</h2>
            <p className="text-muted mb-4">
              You have already submitted your application for this position.
            </p>
            
            <div className="bg-light p-4 rounded mb-4 text-start mx-auto" style={{ maxWidth: '600px' }}>
              <h5 className="fw-bold mb-3">{job.title}</h5>
              <div className="d-flex align-items-center flex-wrap gap-3">
                <Badge bg="light" text="dark" className="px-3 py-2">
                  {job.type}
                </Badge>
                <span className="d-flex align-items-center gap-1 text-muted">
                  <FiMapPin size={14} />
                  {job.location}
                </span>
                <span className="d-flex align-items-center gap-1 text-muted">
                  <FiDollarSign size={14} />
                  {formatSalary(job.salary)}
                </span>
                <span className="d-flex align-items-center gap-1 text-muted">
                  <FiClock size={14} />
                  {getTimeAgo(job.createdAt)}
                </span>
              </div>
              <div className="mt-3">
                <span className="text-primary fw-semibold">{job.company.name}</span>
              </div>
            </div>
            
            <div className="d-flex flex-column flex-md-row gap-3 justify-content-center">
              <Button 
                variant="primary" 
                onClick={() => router.push('/jobs')}
                className="px-4"
              >
                <FiBriefcase className="me-2" />
                Browse Other Jobs
              </Button>
              <Button 
                variant="outline-primary" 
                onClick={() => router.push('/applications')}
                className="px-4"
              >
                <FiFileText className="me-2" />
                View My Applications
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => router.push(`/jobs/${jobId}`)}
                className="px-4"
              >
                <FiExternalLink className="me-2" />
                View Job Details
              </Button>
            </div>
          </Card.Body>
        </Card>
        
        {/* Application Status Timeline */}
        <Card className="border-0 shadow-sm mt-4">
          <Card.Body className="p-4">
            <h6 className="fw-bold mb-4">Your Application Status</h6>
            <ApplicationTimeline />
            
            <div className="mt-4 pt-3 border-top">
              <h6 className="fw-bold mb-3">What's Next?</h6>
              <div className="row g-3">
                <div className="col-md-4">
                  <div className="bg-light p-3 rounded text-center">
                    <FiClock size={24} className="text-primary mb-2" />
                    <h6 className="fw-bold mb-1">Wait for Review</h6>
                    <p className="text-muted small mb-0">The employer will review your application</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="bg-light p-3 rounded text-center">
                    <FiMail size={24} className="text-primary mb-2" />
                    <h6 className="fw-bold mb-1">Check Your Email</h6>
                    <p className="text-muted small mb-0">Watch for updates from the employer</p>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="bg-light p-3 rounded text-center">
                    <FiBriefcase size={24} className="text-primary mb-2" />
                    <h6 className="fw-bold mb-1">Keep Applying</h6>
                    <p className="text-muted small mb-0">Apply to other relevant positions</p>
                  </div>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Container>
    )
  }

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading application form...</p>
        </div>
      </Container>
    )
  }

  if (!job) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Job not found</Alert.Heading>
          <p>The job you're trying to apply for doesn't exist or has been removed.</p>
          <Button variant="outline-danger" onClick={() => router.push('/jobs')}>
            Back to Jobs
          </Button>
        </Alert>
      </Container>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      
      <Container className="py-5">
        {/* Back Button */}
        <Button
          variant="outline-secondary"
          className="mb-4 d-flex align-items-center gap-2"
          onClick={() => router.push(`/jobs/${jobId}`)}
        >
          <FiArrowLeft />
          Back to Job
        </Button>

        {/* Already Applied Warning */}
        {hasApplied && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Alert variant="warning" className="border-0 shadow-sm mb-4">
              <Alert.Heading>
                <FiAlertCircle className="me-2" />
                You have already applied for this job!
              </Alert.Heading>
              <p>Your application is currently under review. You cannot submit another application for this position.</p>
              <div className="d-flex gap-2">
                <Button variant="outline-primary" onClick={() => router.push('/applications')}>
                  View My Applications
                </Button>
                <Button variant="outline-secondary" onClick={() => router.push('/jobs')}>
                  Browse Other Jobs
                </Button>
              </div>
            </Alert>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-0 shadow mb-4 bg-primary bg-opacity-10">
            <Card.Body className="p-4">
              <Row className="align-items-center">
                <Col md={8}>
                  <h1 className="fw-bold mb-3">Apply for {job.title}</h1>
                  <div className="d-flex align-items-center flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-2">
                      {job.company.logo && (
                        <Image
                          src={getImageUrl(job.company.logo)}
                          alt={job.company.name}
                          rounded
                          style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company.name)}&background=3b82f6&color=fff&size=40`
                          }}
                        />
                      )}
                      <h5 className="text-primary mb-0">{job.company.name}</h5>
                    </div>
                    <Badge bg="light" text="dark" className="px-3 py-2">
                      {job.type}
                    </Badge>
                    <span className="d-flex align-items-center gap-1 text-muted">
                      <FiMapPin size={14} />
                      {job.location}
                    </span>
                    {job.isRemote && (
                      <Badge bg="success" className="px-3 py-2">
                        <FiGlobe size={14} className="me-1" />
                        Remote
                      </Badge>
                    )}
                  </div>
                </Col>
                <Col md={4} className="text-md-end mt-3 mt-md-0">
                  <div className="text-muted small">
                    Posted {getTimeAgo(job.createdAt)}
                  </div>
                  <div className="fw-bold text-success mt-1">
                    {formatSalary(job.salary)}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </motion.div>

        {/* Application Steps */}
        <Row className="mb-5">
          <Col lg={8} className="mx-auto">
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <h5 className="fw-bold mb-4">Application Process</h5>
                <Row>
                  <Col md={4}>
                    <ApplicationStep
                      number={1}
                      title="Personal Info"
                      active={true}
                      completed={!!userProfile}
                    />
                  </Col>
                  <Col md={4}>
                    <ApplicationStep
                      number={2}
                      title="Resume & Documents"
                      active={!!userProfile}
                      completed={!!(applicationData.resume || applicationData.resumeUrl)}
                    />
                  </Col>
                  <Col md={4}>
                    <ApplicationStep
                      number={3}
                      title="Review & Submit"
                      active={!!(applicationData.resume || applicationData.resumeUrl)}
                      completed={false}
                    />
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Show loading state while fetching user profile */}
        {!userProfile && !authError ? (
          <Row>
            <Col lg={8} className="mx-auto">
              <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-5">
                  <Spinner animation="border" variant="primary" className="mb-3" />
                  <p className="text-muted">Loading your profile information...</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        ) : (
          <Row className="g-4">
            {/* Left Column - Application Form */}
            <Col lg={8}>
              <Form onSubmit={handleSubmit}>
                {/* Personal Information */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Body className="p-4">
                      <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                        <FiUser />
                        Personal Information
                      </h5>
                      
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">Full Name</Form.Label>
                            <Form.Control 
                              type="text" 
                              value={userProfile?.name || userProfile?.fullName || user?.name || user?.fullName || ''}
                              readOnly
                              className="bg-light"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">Email Address</Form.Label>
                            <Form.Control 
                              type="email" 
                              value={userProfile?.email || user?.email || ''}
                              readOnly
                              className="bg-light"
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">Phone Number</Form.Label>
                            <Form.Control 
                              type="tel" 
                              value={userProfile?.phone || ''}
                              placeholder="Enter your phone number"
                              onChange={(e) => {
                                setUserProfile(prev => prev ? { ...prev, phone: e.target.value } : null)
                              }}
                            />
                            <Form.Text className="text-muted">
                              We'll use this to contact you about your application
                            </Form.Text>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-semibold">Location</Form.Label>
                            <Form.Control 
                              type="text" 
                              value={userProfile?.location || ''}
                              placeholder="Enter your current location"
                              onChange={(e) => {
                                setUserProfile(prev => prev ? { ...prev, location: e.target.value } : null)
                              }}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      
                      <Alert variant="info" className="mt-4">
                        <FiAlertCircle className="me-2" />
                        This information will be shared with the employer. 
                        <Button 
                          variant="link" 
                          className="p-0 ms-2"
                          onClick={() => router.push('/profile')}
                        >
                          Update profile
                        </Button>
                      </Alert>
                    </Card.Body>
                  </Card>
                </motion.div>

                {/* Resume Upload */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Body className="p-4">
                      <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                        <FiFileText />
                        Resume & Documents
                      </h5>
                      
                      {applicationData.resumeUrl && !applicationData.resume ? (
                        <Alert variant="success" className="mb-4">
                          <FiCheckCircle className="me-2" />
                          Using your uploaded resume from profile
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            className="ms-3"
                            onClick={() => setApplicationData(prev => ({ ...prev, resumeUrl: '' }))}
                          >
                            Upload New Resume
                          </Button>
                        </Alert>
                      ) : (
                        <>
                          <Form.Group className="mb-4">
                            <Form.Label className="fw-semibold">
                              Upload Resume <span className="text-danger">*</span>
                            </Form.Label>
                            <div className="border rounded p-4 text-center hover-bg-light cursor-pointer"
                              onClick={() => document.getElementById('resume-upload')?.click()}>
                              <FiUpload size={32} className="text-muted mb-3" />
                              <p className="mb-2 fw-semibold">
                                {applicationData.resume ? applicationData.resume.name : 'Click to upload your resume'}
                              </p>
                              <p className="text-muted small mb-0">
                                Supported formats: PDF, DOC, DOCX | Max size: 5MB
                              </p>
                              <Form.Control
                                type="file"
                                id="resume-upload"
                                accept=".pdf,.doc,.docx"
                                onChange={handleResumeChange}
                                className="d-none"
                              />
                            </div>
                            
                            {resumeUploadProgress > 0 && resumeUploadProgress < 100 && (
                              <div className="mt-3">
                                <ProgressBar now={resumeUploadProgress} label={`${resumeUploadProgress}%`} />
                                <small className="text-muted d-block mt-1">Uploading...</small>
                              </div>
                            )}
                            
                            {applicationData.resume && resumeUploadProgress === 100 && (
                              <Alert variant="success" className="mt-3">
                                <FiCheckCircle className="me-2" />
                                {applicationData.resume.name} ({Math.round(applicationData.resume.size / 1024)} KB)
                                <Button 
                                  variant="outline-danger" 
                                  size="sm" 
                                  className="ms-3"
                                  onClick={() => setApplicationData(prev => ({ ...prev, resume: null }))}
                                >
                                  Remove
                                </Button>
                              </Alert>
                            )}
                          </Form.Group>
                          
                          {/* Resume Preview Button */}
                          {applicationData.resume && (
                            <div className="mb-4">
                              <Button
                                variant="outline-info"
                                onClick={() => setShowPreview(true)}
                                className="d-flex align-items-center gap-2"
                              >
                                <FiExternalLink />
                                Preview Resume
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </Card.Body>
                  </Card>
                </motion.div>

                {/* Portfolio Links */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                >
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Body className="p-4">
                      <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                        <FiLink />
                        Portfolio Links (Max 3)
                      </h5>
                      
                      {applicationData.portfolioLinks.length === 0 ? (
                        <Alert variant="info" className="mb-4">
                          <FiAlertCircle className="me-2" />
                          No portfolio links added. Add links to showcase your work.
                        </Alert>
                      ) : (
                        applicationData.portfolioLinks.map((link, index) => (
                          <div key={index} className="mb-3 p-3 border rounded">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h6 className="mb-1">
                                  {link.title || `Portfolio Link ${index + 1}`}
                                  {link.type && (
                                    <Badge bg="info" className="ms-2">
                                      {link.type}
                                    </Badge>
                                  )}
                                </h6>
                                <a 
                                  href={link.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-decoration-none"
                                >
                                  {link.url}
                                </a>
                              </div>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => removePortfolioLink(index)}
                              >
                                <FiTrash2 />
                              </Button>
                            </div>
                            
                            <Row className="g-2 mt-2">
                              <Col md={4}>
                                <Form.Control
                                  type="text"
                                  placeholder="Title (e.g., My Portfolio)"
                                  value={link.title || ''}
                                  onChange={(e) => updatePortfolioLink(index, 'title', e.target.value)}
                                />
                              </Col>
                              <Col md={4}>
                                <Form.Control
                                  type="url"
                                  placeholder="URL"
                                  value={link.url}
                                  onChange={(e) => updatePortfolioLink(index, 'url', e.target.value)}
                                  required
                                />
                              </Col>
                              <Col md={4}>
                                <Form.Select
                                  value={link.type || 'website'}
                                  onChange={(e) => updatePortfolioLink(index, 'type', e.target.value)}
                                >
                                  <option value="website">Website</option>
                                  <option value="github">GitHub</option>
                                  <option value="linkedin">LinkedIn</option>
                                  <option value="behance">Behance</option>
                                  <option value="dribbble">Dribbble</option>
                                  <option value="other">Other</option>
                                </Form.Select>
                              </Col>
                              <Col md={12}>
                                <Form.Control
                                  as="textarea"
                                  rows={2}
                                  placeholder="Description (optional)"
                                  value={link.description || ''}
                                  onChange={(e) => updatePortfolioLink(index, 'description', e.target.value)}
                                />
                              </Col>
                            </Row>
                          </div>
                        ))
                      )}
                      
                      {applicationData.portfolioLinks.length < 3 && (
                        <Button
                          variant="outline-primary"
                          onClick={addPortfolioLink}
                          className="d-flex align-items-center gap-2"
                        >
                          <FiPlus />
                          Add Portfolio Link
                        </Button>
                      )}
                      
                      <Alert variant="info" className="mt-4">
                        <FiAlertCircle className="me-2" />
                        You can add up to 3 portfolio links. Include your website, GitHub, LinkedIn, or other relevant work samples.
                      </Alert>
                    </Card.Body>
                  </Card>
                </motion.div>

                {/* Cover Letter */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Body className="p-4">
                      <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                        <FiFileText />
                        Cover Letter <span className="text-danger">*</span>
                      </h5>
                      
                      <Form.Group>
                        <Form.Label className="fw-semibold">
                          Why are you interested in this position?
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={8}
                          value={applicationData.coverLetter}
                          onChange={(e) => setApplicationData(prev => ({ ...prev, coverLetter: e.target.value }))}
                          placeholder="Tell us why you're the perfect candidate for this role..."
                          className="mb-3"
                        />
                        <div className="d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            {applicationData.coverLetter.length}/2000 characters
                          </small>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => {
                              if (userProfile && job) {
                                setApplicationData(prev => ({
                                  ...prev,
                                  coverLetter: generateDefaultCoverLetter(userProfile)
                                }))
                              }
                            }}
                            disabled={!userProfile}
                          >
                            Use Template
                          </Button>
                        </div>
                      </Form.Group>
                      
                      <Alert variant="info" className="mt-4">
                        <FiAlertCircle className="me-2" />
                        A personalized cover letter can significantly increase your chances of getting an interview.
                      </Alert>
                    </Card.Body>
                  </Card>
                </motion.div>

                {/* Additional Questions */}
                {applicationData.questions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                  >
                    <Card className="border-0 shadow-sm mb-4">
                      <Card.Body className="p-4">
                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                          <FiFileText />
                          Additional Questions
                        </h5>
                        
                        {applicationData.questions.map((q, index) => (
                          <Form.Group key={index} className="mb-4">
                            <Form.Label className="fw-semibold">
                              {q.question} <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={4}
                              value={q.answer}
                              onChange={(e) => handleQuestionChange(index, e.target.value)}
                              placeholder={`Your answer to "${q.question}"`}
                            />
                          </Form.Group>
                        ))}
                      </Card.Body>
                    </Card>
                  </motion.div>
                )}

                {/* Additional Information */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Body className="p-4">
                      <h5 className="fw-bold mb-4">Additional Information</h5>
                      
                      <Form.Group>
                        <Form.Label className="fw-semibold">
                          Anything else you'd like to share with the employer?
                        </Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={4}
                          value={applicationData.additionalInfo}
                          onChange={(e) => setApplicationData(prev => ({ ...prev, additionalInfo: e.target.value }))}
                          placeholder="Additional notes, references, availability, or anything else relevant..."
                        />
                      </Form.Group>
                    </Card.Body>
                  </Card>
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 }}
                >
                  <Card className="border-0 shadow-sm">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <h6 className="fw-bold mb-2">Ready to submit your application?</h6>
                          <p className="text-muted mb-0">
                            Make sure all information is correct before submitting.
                          </p>
                        </div>
                        <div className="d-flex gap-3">
                          <Button
                            variant="outline-secondary"
                            onClick={() => router.back()}
                            className="px-4"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            type="submit"
                            disabled={submitting || (!applicationData.resume && !applicationData.resumeUrl) || !applicationData.coverLetter.trim() || hasApplied}
                            className="px-4"
                          >
                            {submitting ? (
                              <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Submitting...
                              </>
                            ) : (
                              'Submit Application'
                            )}
                          </Button>
                        </div>
                      </div>
                      {hasApplied && (
                        <Alert variant="warning" className="mt-3 mb-0">
                          <FiAlertCircle className="me-2" />
                          You cannot submit another application for this job as you have already applied.
                        </Alert>
                      )}
                    </Card.Body>
                  </Card>
                </motion.div>
              </Form>
            </Col>

            {/* Right Column - Job Summary & Tips */}
            <Col lg={4}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="sticky-top"
                style={{ top: '20px' }}
              >
                {/* Job Summary */}
                <Card className="border-0 shadow-sm mb-4">
                  <Card.Body className="p-4">
                    <h6 className="fw-bold mb-3">Job Summary</h6>
                    
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Experience</span>
                        <span className="fw-bold">
                          {job.experience.minYears}+ years
                        </span>
                      </div>
                      
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Salary</span>
                        <span className="fw-bold text-success">{formatSalary(job.salary)}</span>
                      </div>
                      
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Job Type</span>
                        <span className="fw-bold">{job.type}</span>
                      </div>
                      
                      <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Location</span>
                        <span className="fw-bold">{job.location}</span>
                      </div>
                      
                      {job.applicationDeadline && (
                        <div className="d-flex justify-content-between mb-2">
                          <span className="text-muted">Deadline</span>
                          <span className="fw-bold text-danger">
                            {new Date(job.applicationDeadline).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <hr />
                    
                    <h6 className="fw-bold mb-3">Required Skills</h6>
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {job.skills.slice(0, 8).map((skill, idx) => (
                        <Badge key={idx} bg="primary" className="px-3 py-2">
                          {skill}
                        </Badge>
                      ))}
                      {job.skills.length > 8 && (
                        <Badge bg="secondary" className="px-3 py-2">
                          +{job.skills.length - 8} more
                        </Badge>
                      )}
                    </div>
                  </Card.Body>
                </Card>

                {/* Application Tips */}
                <Card className="border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <h6 className="fw-bold mb-3">💡 Application Tips</h6>
                    
                    <div className="mb-3">
                      <div className="d-flex align-items-start mb-3">
                        <FiCheckCircle className="text-success mt-1 me-2 flex-shrink-0" />
                        <div>
                          <small className="fw-semibold">Customize your cover letter</small>
                          <p className="text-muted small mb-0">Tailor it specifically to this job</p>
                        </div>
                      </div>
                      
                      <div className="d-flex align-items-start mb-3">
                        <FiCheckCircle className="text-success mt-1 me-2 flex-shrink-0" />
                        <div>
                          <small className="fw-semibold">Update your resume</small>
                          <p className="text-muted small mb-0">Include relevant keywords from the job description</p>
                        </div>
                      </div>
                      
                      <div className="d-flex align-items-start mb-3">
                        <FiCheckCircle className="text-success mt-1 me-2 flex-shrink-0" />
                        <div>
                          <small className="fw-semibold">Add portfolio links</small>
                          <p className="text-muted small mb-0">Showcase your best work with relevant links</p>
                        </div>
                      </div>
                      
                      <div className="d-flex align-items-start">
                        <FiCheckCircle className="text-success mt-1 me-2 flex-shrink-0" />
                        <div>
                          <small className="fw-semibold">Review before submitting</small>
                          <p className="text-muted small mb-0">Double-check for typos and errors</p>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </motion.div>
            </Col>
          </Row>
        )}
      </Container>

      {/* Resume Preview Modal */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Resume Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {applicationData.resume && (
            <div className="text-center">
              <FiFileText size={48} className="text-primary mb-3" />
              <h5>{applicationData.resume.name}</h5>
              <p className="text-muted">
                Size: {(applicationData.resume.size / 1024).toFixed(2)} KB
              </p>
              <p className="text-muted">
                Type: {applicationData.resume.type}
              </p>
              <Alert variant="info">
                <FiAlertCircle className="me-2" />
                Resume preview requires the document to be uploaded. The employer will see the full document.
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={() => setShowPreview(false)}>
            Continue Application
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}