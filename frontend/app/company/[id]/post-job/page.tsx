'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../../../context/AuthContext'
import axios from 'axios'
import { toast, Toaster } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Form, Button as BootstrapButton, Container, Row, Col, Alert } from 'react-bootstrap'
import { FiBriefcase, FiDollarSign, FiMapPin, FiType, FiCalendar, FiUsers, FiFileText, FiPlus, FiX, FiCheck, FiChevronRight, FiUpload, FiStar, FiClock, FiGlobe } from 'react-icons/fi'

// Create a motion-wrapped Button component
const MotionButton = motion(BootstrapButton)

interface Company {
  _id: string
  name: string
  industry: string
  location: string
  logo?: string
  owner: string
  teamMembers: Array<{
    user: string
    role: string
  }>
}

interface JobFormData {
  title: string
  description: string
  location: string
  type: string
  employmentType: string
  salary: {
    min: string
    max: string
    currency: string
    isNegotiable: boolean
    payPeriod: string
  }
  requirements: string[]
  responsibilities: string[]
  skills: string[]
  experience: {
    minYears: string
    maxYears: string
  }
  education: string
  benefits: string[]
  applicationInstructions: string
  applicationDeadline: string
  tags: string[]
  isRemote: boolean
  isUrgent: boolean
  isFeatured: boolean
  status: 'draft' | 'active'
  companyName: string
}

// Simple TextEditor Component
const TextEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const applyFormat = (format: string) => {
    if (!textareaRef.current) return

    const start = textareaRef.current.selectionStart
    const end = textareaRef.current.selectionEnd
    const selectedText = value.substring(start, end)

    let newText = value
    let newCursorPos = end

    switch (format) {
      case 'bold':
        if (selectedText) {
          newText = value.substring(0, start) + `**${selectedText}**` + value.substring(end)
          newCursorPos = end + 4
        } else {
          newText = value.substring(0, start) + '**bold text**' + value.substring(end)
          newCursorPos = start + 13
        }
        break
      case 'italic':
        if (selectedText) {
          newText = value.substring(0, start) + `*${selectedText}*` + value.substring(end)
          newCursorPos = end + 2
        } else {
          newText = value.substring(0, start) + '*italic text*' + value.substring(end)
          newCursorPos = start + 12
        }
        break
      case 'bullet':
        newText = value + (value.endsWith('\n') ? '' : '\n') + '• '
        newCursorPos = newText.length
        break
      case 'number':
        const lines = value.split('\n')
        const lineCount = lines.filter(l => l.trim()).length
        newText = value + (value.endsWith('\n') ? '' : '\n') + `${lineCount + 1}. `
        newCursorPos = newText.length
        break
    }

    onChange(newText)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 border-b border-gray-300">
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Bold"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => applyFormat('italic')}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Italic"
        >
          <em>I</em>
        </button>
        <div className="w-px h-6 bg-gray-300"></div>
        <button
          type="button"
          onClick={() => applyFormat('bullet')}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Bullet List"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => applyFormat('number')}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          title="Numbered List"
        >
          1.
        </button>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 min-h-[200px] resize-y focus:outline-none bg-white"
        placeholder="Describe the job position, responsibilities, qualifications, and company culture..."
      />
    </div>
  )
}

export default function PremiumPostJobPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const companyId = params.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [errors, setErrors] = useState<Partial<Record<keyof JobFormData, string>>>({})
  const [generalError, setGeneralError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    location: '',
    type: 'Full-time',
    employmentType: 'Full-time',
    salary: {
      min: '',
      max: '',
      currency: 'USD',
      isNegotiable: false,
      payPeriod: 'yearly'
    },
    requirements: [''],
    responsibilities: [''],
    skills: [],
    experience: {
      minYears: '',
      maxYears: ''
    },
    education: 'Any',
    benefits: [''],
    applicationInstructions: '',
    applicationDeadline: '',
    tags: [],
    isRemote: false,
    isUrgent: false,
    isFeatured: false,
    status: 'draft',
    companyName: ''
  })

  const [tempSkill, setTempSkill] = useState('')
  const [tempTag, setTempTag] = useState('')

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3
      }
    }
  }

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      x: -50,
      filter: "blur(10px)"
    },
    visible: { 
      opacity: 1, 
      x: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100
      }
    }
  }

  const formVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 100,
        delay: 0.5
      }
    }
  }

  const statItemVariants = {
    hidden: { scale: 0, rotate: -180 },
    visible: (i: number) => ({
      scale: 1,
      rotate: 0,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
        delay: 0.8 + (i * 0.1)
      }
    })
  }

  // Job types
  const jobTypes = [
    'Full-time',
    'Part-time',
    'Contract',
    'Internship',
    'Remote',
    'Temporary',
    'Freelance'
  ]

  const employmentTypes = [
    'Full-time',
    'Part-time',
    'Contract',
    'Temporary',
    'Internship',
    'Volunteer',
    'Other'
  ]

  const educationLevels = [
    'Any',
    'High School',
    'Associate',
    'Bachelor',
    'Master',
    'PhD'
  ]

  const payPeriods = [
    'hourly',
    'daily',
    'weekly',
    'monthly',
    'yearly'
  ]

  const currencies = [
    'USD',
    'EUR',
    'GBP',
    'CAD',
    'AUD',
    'INR'
  ]

  // Debug form data changes
  useEffect(() => {
    console.log("Form data updated - Status:", formData.status);
  }, [formData]);

  // Check authorization and fetch company data
  useEffect(() => {
    const checkAuthorization = async () => {
      if (authLoading) return
      
      if (!isAuthenticated || !user) {
        router.push('/login')
        return
      }

      try {
        const response = await axios.get(`http://localhost:5000/api/company/${companyId}`, {
          headers: { Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' }
        })

        const companyData = response.data.company
        
        if (companyData.owner === user._id || 
            companyData.teamMembers.some((member: any) => 
              member.user._id === user._id && ['admin', 'recruiter', 'manager'].includes(member.role)
            )) {
          setCompany(companyData)
          setIsAuthorized(true)
          
          // Pre-fill company location
          setFormData(prev => ({
            ...prev,
            location: companyData.location,
            companyName: companyData.name
          }))
        } else {
          router.push('/404')
        }
      } catch (error) {
        console.error('Error fetching company:', error)
        router.push('/404')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthorization()
  }, [companyId, user, isAuthenticated, authLoading, router])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof JobFormData],
          [child]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }))
    }
    
    // Clear error for this field
    if (errors[name as keyof JobFormData]) {
      setErrors({
        ...errors,
        [name]: undefined,
      })
    }
  }

  // Handle description change
  const handleDescriptionChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      description: value
    }))
  }

  // Handle array field changes
  const handleArrayFieldChange = (field: 'requirements' | 'responsibilities' | 'benefits', index: number, value: string) => {
    const updatedArray = [...formData[field]]
    updatedArray[index] = value
    setFormData(prev => ({
      ...prev,
      [field]: updatedArray
    }))
  }

  // Add new item to array field
  const addArrayFieldItem = (field: 'requirements' | 'responsibilities' | 'benefits') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }))
  }

  // Remove item from array field
  const removeArrayFieldItem = (field: 'requirements' | 'responsibilities' | 'benefits', index: number) => {
    const updatedArray = formData[field].filter((_, i) => i !== index)
    setFormData(prev => ({
      ...prev,
      [field]: updatedArray
    }))
  }

  // Add skill from temporary input
  const addSkill = () => {
    if (tempSkill.trim()) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, tempSkill.trim()]
      }))
      setTempSkill('')
    }
  }

  // Add tag from temporary input
  const addTag = () => {
    if (tempTag.trim()) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tempTag.trim()]
      }))
      setTempTag('')
    }
  }

  // Remove tag
  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  // Remove skill
  const removeSkill = (index: number) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }))
  }

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobFormData, string>> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Job title is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Job description is required'
    } else if (formData.description.replace(/\*\*|\*|\[.*?\]\(.*?\)/g, '').length < 50) {
      newErrors.description = 'Description must be at least 50 characters'
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required'
    }

    if (!formData.type) {
      newErrors.type = 'Job type is required'
    }

    if (!formData.employmentType) {
      newErrors.employmentType = 'Employment type is required'
    }

    // Salary validation
    if (formData.salary.min && formData.salary.max) {
      const min = parseFloat(formData.salary.min)
      const max = parseFloat(formData.salary.max)
      if (min > max) {
        newErrors.salary = 'Minimum salary cannot be greater than maximum salary'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'active' = 'draft') => {
    e.preventDefault();

    console.log("Submitting job with status:", status);
    
    if (!validateForm()) {
        toast.error('Please fix the errors in the form');
        return
    }

    setIsSubmitting(true);
    setGeneralError('');

    try {
        // Send complete salary object to match backend Job model
        const jobData = {
            title: formData.title,
            description: formData.description,
            location: formData.location,
            type: formData.type,
            employmentType: formData.employmentType,
            salary: {
                min: formData.salary.min ? parseFloat(formData.salary.min) : undefined,
                max: formData.salary.max ? parseFloat(formData.salary.max) : undefined,
                currency: formData.salary.currency,
                isNegotiable: formData.salary.isNegotiable,
                payPeriod: formData.salary.payPeriod
            },
            requirements: formData.requirements.filter(req => req.trim()),
            responsibilities: formData.responsibilities.filter(resp => resp.trim()),
            skills: formData.skills,
            experience: {
                minYears: formData.experience.minYears ? parseInt(formData.experience.minYears) : 0,
                maxYears: formData.experience.maxYears ? parseInt(formData.experience.maxYears) : undefined
            },
            education: formData.education,
            benefits: formData.benefits.filter(benefit => benefit.trim()),
            applicationInstructions: formData.applicationInstructions,
            applicationDeadline: formData.applicationDeadline || undefined,
            tags: formData.tags,
            isRemote: formData.isRemote,
            isUrgent: formData.isUrgent,
            isFeatured: formData.isFeatured,
            status: status,
            company: companyId,
            companyName: company?.name,
        };

        console.log("Sending job data:", jobData);

        const token = localStorage.getItem('token');
        const response = await axios.post('http://localhost:5000/api/jobs/post-jobs', jobData, {
            headers: {
                Authorization: token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json'
            }
        });

        console.log("Job created successfully:", response.data);
        setSubmitSuccess(true);
        toast.success(status === 'active' ? 'Job posted successfully!' : 'Job saved as draft');

        setTimeout(() => {
            router.push(`/company/${companyId}/jobs`);
        }, 2000);

    } catch (error: any) {
        console.error('Error posting job:', error);
        console.error('Error response:', error.response?.data);
        setGeneralError(error.response?.data?.error || 'Failed to post job');
        toast.error(error.response?.data?.error || 'Failed to post job');
    } finally {
        setIsSubmitting(false);
    }
};

  // Navigate to next step
  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  // Navigate to previous step
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  // Validate current step
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.title || !formData.description || !formData.location) {
          toast.error('Please fill in all required fields in step 1')
          return false
        }
        return true
      case 2:
        if (!formData.type || !formData.employmentType) {
          toast.error('Please fill in all required fields in step 2')
          return false
        }
        return true
      case 3:
        return true
      default:
        return true
    }
  }

  // Strip markdown for character count
  const getTextLength = (text: string) => {
    return text.replace(/\*\*|\*|\[.*?\]\(.*?\)/g, '').length
  }

  // Loading state
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)' 
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent"
        />
      </div>
    )
  }

  // Not authorized
  if (!isAuthorized || !company) {
    return null
  }

  return (
    <>
      <Toaster position="top-right" />
      <div 
        className="min-vh-100 d-flex align-items-center justify-content-center p-3" 
        style={{ 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          overflow: 'hidden'
        }}
      >
        {/* Animated Background Elements */}
        <motion.div
          className="absolute top-0 left-0 w-full h-1"
          style={{
            background: 'linear-gradient(to right, #06b6d4, #3b82f6, #8b5cf6)'
          }}
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        <motion.div
          className="position-absolute top-1/4 left-0 w-96 h-96 rounded-full"
          style={{ 
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(139, 92, 246, 0.1) 100%)',
            filter: 'blur(96px)'
          }}
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="position-absolute bottom-1/4 right-0 w-96 h-96 rounded-full"
          style={{ 
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(236, 72, 153, 0.05) 50%, rgba(239, 68, 68, 0.1) 100%)',
            filter: 'blur(96px)'
          }}
          animate={{
            x: [0, -100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        <Container fluid className="px-3 px-md-5 position-relative">
          <Row className="justify-content-between align-items-center">
            {/* Left Side Content - Premium Stats */}
            <Col lg={6} className="d-none d-lg-block">
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="text-white px-4 py-5"
                style={{ maxWidth: '600px', marginRight: 'auto' }}
              >
                {/* Main Heading */}
                <motion.div variants={itemVariants}>
                  <h1 className="display-4 fw-bold mb-4">
                    Post Your
                    <span className="d-block" style={{ 
                      background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      Dream Job
                    </span>
                  </h1>
                  <p className="fs-5 text-white opacity-75 mb-5">
                    Attract top talent with a compelling job listing. 
                    Posting as <span className="fw-semibold text-warning">{company.name}</span>
                  </p>
                </motion.div>

                {/* Stats Grid */}
                <motion.div 
                  className="row g-4 mb-5"
                  variants={containerVariants}
                >
                  {[
                    { number: "85%", label: "Higher Visibility", icon: "👁️", color: "#06b6d4" },
                    { number: "3x", label: "More Applicants", icon: "📈", color: "#10b981" },
                    { number: "48h", label: "Fast Response", icon: "⚡", color: "#8b5cf6" },
                    { number: "A+", label: "Quality Score", icon: "⭐", color: "#f59e0b" },
                  ].map((stat, index) => (
                    <motion.div 
                      key={index} 
                      className="col-6"
                      custom={index}
                      variants={statItemVariants}
                    >
                      <div 
                        className="p-4 rounded-4"
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.05)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <div className="d-flex align-items-center mb-2">
                          <motion.div 
                            className="rounded-3 d-flex align-items-center justify-content-center me-3"
                            style={{ 
                              width: '50px', 
                              height: '50px', 
                              background: `linear-gradient(135deg, ${stat.color}20 0%, ${stat.color}40 100%)`,
                              border: `2px solid ${stat.color}`
                            }}
                            animate={{ 
                              rotate: [0, 10, -10, 0],
                            }}
                            transition={{ 
                              duration: 2,
                              repeat: Infinity,
                              repeatType: "reverse"
                            }}
                          >
                            <span className="fs-3">{stat.icon}</span>
                          </motion.div>
                          <div>
                            <motion.div 
                              className="fs-1 fw-bold"
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ 
                                duration: 2,
                                repeat: Infinity,
                                repeatDelay: 3
                              }}
                            >
                              {stat.number}
                            </motion.div>
                            <div className="text-white opacity-75">{stat.label}</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Tips */}
                <motion.div variants={itemVariants}>
                  <h3 className="h4 fw-semibold mb-4">Tips for Success</h3>
                  <div className="row g-3">
                    {[
                      { text: "Use clear, descriptive job titles", icon: "🎯" },
                      { text: "Include specific requirements", icon: "📋" },
                      { text: "Mention salary range", icon: "💰" },
                      { text: "Add company culture info", icon: "🏢" },
                      { text: "Use relevant skills & tags", icon: "🏷️" },
                      { text: "Set realistic deadlines", icon: "⏰" },
                    ].map((tip, index) => (
                      <motion.div 
                        key={index} 
                        className="col-6"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 + (index * 0.1) }}
                      >
                        <div className="d-flex align-items-center mb-3">
                          <motion.div 
                            className="me-3"
                            animate={{ 
                              scale: [1, 1.2, 1],
                              rotate: [0, 360]
                            }}
                            transition={{ 
                              duration: 2,
                              delay: index * 0.5,
                              repeat: Infinity,
                              repeatDelay: 5
                            }}
                          >
                            <span className="fs-4">{tip.icon}</span>
                          </motion.div>
                          <span className="opacity-90">{tip.text}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </Col>

            {/* Right Side Form */}
            <Col lg={6} xl={5} className="mx-auto">
              <motion.div
                variants={formVariants}
                initial="hidden"
                animate="visible"
              >
                {/* Error Message */}
                <AnimatePresence>
                  {(generalError || submitSuccess) && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mb-4"
                    >
                      <Alert variant={submitSuccess ? "success" : "danger"} className="text-center shadow-sm border-0 rounded-3">
                        <div className="d-flex align-items-center justify-content-center">
                          {submitSuccess ? (
                            <>
                              <FiCheck className="me-2" />
                              {formData.status === 'active' ? 'Job posted successfully!' : 'Job saved as draft!'}
                            </>
                          ) : (
                            <>
                              <svg className="bi me-2" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                              </svg>
                              {generalError}
                            </>
                          )}
                        </div>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Form Card */}
                <motion.div 
                  className="bg-white p-4 p-md-5 rounded-4 shadow-lg position-relative overflow-hidden"
                  style={{ 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {/* Form Header */}
                  <motion.div 
                    className="text-center mb-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="d-flex justify-content-center align-items-center gap-3 mb-4">
                      <motion.div 
                        className="d-flex align-items-center justify-content-center"
                        style={{ 
                          width: '48px', 
                          height: '48px', 
                          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)', 
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(6, 182, 212, 0.3)'
                        }}
                        animate={{ 
                          rotate: [0, 360],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                          scale: { duration: 2, repeat: Infinity, repeatType: "reverse" }
                        }}
                      >
                        <FiBriefcase className="w-6 h-6 text-white" style={{ width: '24px', height: '24px' }} />
                      </motion.div>
                      <span className="fs-2 fw-bold" style={{ 
                        background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>Premium Job Post</span>
                    </div>
                    <motion.h1 
                      className="h2 fw-bold text-dark mb-3"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Create Job Listing
                    </motion.h1>
                  </motion.div>

                  {/* Progress Steps */}
                  <motion.div 
                    className="mb-5"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <div className="d-flex justify-content-between align-items-center position-relative">
                      {[1, 2, 3, 4].map((step) => (
                        <div key={step} className="d-flex flex-column align-items-center position-relative z-2">
                          <motion.div 
                            className={`rounded-circle d-flex align-items-center justify-content-center mb-2 ${currentStep >= step ? 'bg-primary text-white' : 'bg-light text-secondary'}`}
                            style={{ 
                              width: '40px', 
                              height: '40px',
                              border: '2px solid #3b82f6'
                            }}
                            animate={currentStep >= step ? { scale: [1, 1.1, 1] } : {}}
                            transition={{ duration: 0.5 }}
                          >
                            {step}
                          </motion.div>
                          <span className={`text-sm fw-medium ${currentStep >= step ? 'text-primary' : 'text-secondary'}`}>
                            {step === 1 ? 'Details' : step === 2 ? 'Requirements' : step === 3 ? 'Benefits' : 'Review'}
                          </span>
                        </div>
                      ))}
                      <div className="position-absolute top-5 start-0 end-0 h-2 bg-light" style={{ zIndex: 1 }}></div>
                      <motion.div 
                        className="position-absolute top-5 start-0 h-2 bg-primary"
                        style={{ zIndex: 2 }}
                        animate={{ width: `${(currentStep - 1) * 33.33}%` }}
                        transition={{ duration: 0.5 }}
                      ></motion.div>
                    </div>
                  </motion.div>

                  {/* Job Form */}
                  <Form onSubmit={(e) => handleSubmit(e, formData.status)}>
                    {/* Step 1: Job Details */}
                    {currentStep === 1 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <h5 className="mb-4 fw-semibold text-dark border-bottom pb-2">
                          <FiBriefcase className="me-2" />
                          Job Details
                        </h5>
                        
                        {/* Job Title */}
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-medium">Job Title *</Form.Label>
                          <Form.Control
                            type="text"
                            name="title"
                            placeholder="e.g., Senior Frontend Developer"
                            value={formData.title}
                            onChange={handleInputChange}
                            className="py-3 border-1"
                            style={{ 
                              borderRadius: '10px',
                              borderColor: errors.title ? '#ef4444' : '#e5e7eb',
                              backgroundColor: '#f9fafb'
                            }}
                            required
                            disabled={isSubmitting}
                          />
                          {errors.title && (
                            <div className="d-flex align-items-center mt-2 text-danger">
                              <svg className="me-1" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                              </svg>
                              <small>{errors.title}</small>
                            </div>
                          )}
                        </Form.Group>

                        {/* Job Description */}
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-medium">Job Description *</Form.Label>
                          <TextEditor
                            value={formData.description}
                            onChange={handleDescriptionChange}
                          />
                          <div className="d-flex justify-content-between align-items-center mt-2">
                            {errors.description && (
                              <div className="d-flex align-items-center text-danger">
                                <svg className="me-1" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                                </svg>
                                <small>{errors.description}</small>
                              </div>
                            )}
                            <small className={`ms-auto ${getTextLength(formData.description) >= 50 ? 'text-success' : 'text-muted'}`}>
                              {getTextLength(formData.description)}/50 characters
                            </small>
                          </div>
                        </Form.Group>

                        {/* Location */}
                        <Row className="g-4 mb-4">
                          <Col md={8}>
                            <Form.Group>
                              <Form.Label className="fw-medium">Location *</Form.Label>
                              <Form.Control
                                type="text"
                                name="location"
                                placeholder="e.g., San Francisco, CA or Remote"
                                value={formData.location}
                                onChange={handleInputChange}
                                className="py-3 border-1"
                                style={{ 
                                  borderRadius: '10px',
                                  borderColor: errors.location ? '#ef4444' : '#e5e7eb',
                                  backgroundColor: '#f9fafb'
                                }}
                                required
                                disabled={isSubmitting}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={4} className="d-flex align-items-end">
                            <Form.Check
                              type="checkbox"
                              id="isRemote"
                              label={
                                <>
                                  <FiGlobe className="me-2" />
                                  Remote Position
                                </>
                              }
                              checked={formData.isRemote}
                              onChange={(e) => setFormData(prev => ({ ...prev, isRemote: e.target.checked }))}
                              className="mt-3"
                            />
                          </Col>
                        </Row>
                      </motion.div>
                    )}

                    {/* Step 2: Requirements & Salary */}
                    {currentStep === 2 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <h5 className="mb-4 fw-semibold text-dark border-bottom pb-2">
                          <FiUsers className="me-2" />
                          Requirements & Salary
                        </h5>

                        {/* Job Type and Employment Type */}
                        <Row className="g-4 mb-4">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-medium">Job Type *</Form.Label>
                              <Form.Select
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className="py-3 border-1"
                                style={{ 
                                  borderRadius: '10px',
                                  borderColor: errors.type ? '#ef4444' : '#e5e7eb',
                                  backgroundColor: '#f9fafb'
                                }}
                                required
                                disabled={isSubmitting}
                              >
                                <option value="">Select Job Type</option>
                                {jobTypes.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-medium">Employment Type *</Form.Label>
                              <Form.Select
                                name="employmentType"
                                value={formData.employmentType}
                                onChange={handleInputChange}
                                className="py-3 border-1"
                                style={{ 
                                  borderRadius: '10px',
                                  borderColor: errors.employmentType ? '#ef4444' : '#e5e7eb',
                                  backgroundColor: '#f9fafb'
                                }}
                                required
                                disabled={isSubmitting}
                              >
                                <option value="">Select Employment Type</option>
                                {employmentTypes.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>

                        {/* Salary Information */}
                        <div className="bg-gray-50 p-4 rounded-3 mb-4">
                          <h6 className="fw-semibold mb-3">
                            <FiDollarSign className="me-2" />
                            Salary Information
                          </h6>
                          
                          <Row className="g-4 mb-3">
                            <Col md={4}>
                              <Form.Group>
                                <Form.Label className="fw-medium">Currency</Form.Label>
                                <Form.Select
                                  name="salary.currency"
                                  value={formData.salary.currency}
                                  onChange={handleInputChange}
                                  className="py-3 border-1"
                                  style={{ borderRadius: '10px', backgroundColor: '#fff' }}
                                  disabled={isSubmitting}
                                >
                                  {currencies.map(currency => (
                                    <option key={currency} value={currency}>{currency}</option>
                                  ))}
                                </Form.Select>
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group>
                                <Form.Label className="fw-medium">Min Salary</Form.Label>
                                <Form.Control
                                  type="number"
                                  name="salary.min"
                                  placeholder="e.g., 50000"
                                  value={formData.salary.min}
                                  onChange={handleInputChange}
                                  className="py-3 border-1"
                                  style={{ borderRadius: '10px', backgroundColor: '#fff' }}
                                  disabled={isSubmitting}
                                />
                              </Form.Group>
                            </Col>
                            <Col md={4}>
                              <Form.Group>
                                <Form.Label className="fw-medium">Max Salary</Form.Label>
                                <Form.Control
                                  type="number"
                                  name="salary.max"
                                  placeholder="e.g., 120000"
                                  value={formData.salary.max}
                                  onChange={handleInputChange}
                                  className="py-3 border-1"
                                  style={{ borderRadius: '10px', backgroundColor: '#fff' }}
                                  disabled={isSubmitting}
                                />
                              </Form.Group>
                            </Col>
                          </Row>

                          <Row className="g-4">
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label className="fw-medium">Pay Period</Form.Label>
                                <Form.Select
                                  name="salary.payPeriod"
                                  value={formData.salary.payPeriod}
                                  onChange={handleInputChange}
                                  className="py-3 border-1"
                                  style={{ borderRadius: '10px', backgroundColor: '#fff' }}
                                  disabled={isSubmitting}
                                >
                                  {payPeriods.map(period => (
                                    <option key={period} value={period}>
                                      {period.charAt(0).toUpperCase() + period.slice(1)}
                                    </option>
                                  ))}
                                </Form.Select>
                              </Form.Group>
                            </Col>
                            <Col md={6} className="d-flex align-items-end">
                              <Form.Check
                                type="checkbox"
                                id="isNegotiable"
                                label="Salary Negotiable"
                                checked={formData.salary.isNegotiable}
                                onChange={(e) => setFormData(prev => ({
                                  ...prev,
                                  salary: { ...prev.salary, isNegotiable: e.target.checked }
                                }))}
                                className="mt-3"
                              />
                            </Col>
                          </Row>
                        </div>

                        {/* Experience */}
                        <Row className="g-4 mb-4">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-medium">Min Experience (Years)</Form.Label>
                              <Form.Control
                                type="number"
                                name="experience.minYears"
                                placeholder="e.g., 3"
                                value={formData.experience.minYears}
                                onChange={handleInputChange}
                                className="py-3 border-1"
                                style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                                disabled={isSubmitting}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-medium">Max Experience (Years)</Form.Label>
                              <Form.Control
                                type="number"
                                name="experience.maxYears"
                                placeholder="e.g., 10"
                                value={formData.experience.maxYears}
                                onChange={handleInputChange}
                                className="py-3 border-1"
                                style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                                disabled={isSubmitting}
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        {/* Education */}
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-medium">Education Requirement</Form.Label>
                          <Form.Select
                            name="education"
                            value={formData.education}
                            onChange={handleInputChange}
                            className="py-3 border-1"
                            style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                            disabled={isSubmitting}
                          >
                            {educationLevels.map(level => (
                              <option key={level} value={level}>{level}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>

                        {/* Skills */}
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-medium">Required Skills</Form.Label>
                          <div className="d-flex gap-2 mb-3">
                            <Form.Control
                              type="text"
                              placeholder="e.g., React, Node.js"
                              value={tempSkill}
                              onChange={(e) => setTempSkill(e.target.value)}
                              className="py-3 border-1"
                              style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                              disabled={isSubmitting}
                            />
                            <MotionButton
                              type="button"
                              onClick={addSkill}
                              className="py-3"
                              style={{ 
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                border: 'none',
                                borderRadius: '10px',
                                minWidth: '80px'
                              }}
                              disabled={isSubmitting}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <FiPlus className="me-1" /> Add
                            </MotionButton>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {formData.skills.map((skill, index) => (
                              <motion.div
                                key={index}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="badge bg-primary bg-gradient d-flex align-items-center"
                                style={{ 
                                  padding: '8px 12px',
                                  fontSize: '0.875rem',
                                  borderRadius: '20px'
                                }}
                              >
                                {skill}
                                <button
                                  type="button"
                                  onClick={() => removeSkill(index)}
                                  className="btn-close btn-close-white ms-2"
                                  style={{ fontSize: '0.5rem' }}
                                  disabled={isSubmitting}
                                />
                              </motion.div>
                            ))}
                          </div>
                        </Form.Group>
                      </motion.div>
                    )}

                    {/* Step 3: Additional Details */}
                    {currentStep === 3 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <h5 className="mb-4 fw-semibold text-dark border-bottom pb-2">
                          <FiFileText className="me-2" />
                          Additional Details
                        </h5>

                        {/* Responsibilities */}
                        <Form.Group className="mb-4">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <Form.Label className="fw-medium">Responsibilities</Form.Label>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => addArrayFieldItem('responsibilities')}
                              disabled={isSubmitting}
                            >
                              <FiPlus className="me-1" /> Add
                            </Button>
                          </div>
                          {formData.responsibilities.map((item, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="d-flex gap-2 mb-2"
                            >
                              <Form.Control
                                type="text"
                                value={item}
                                onChange={(e) => handleArrayFieldChange('responsibilities', index, e.target.value)}
                                placeholder={`Responsibility ${index + 1}`}
                                className="py-3 border-1"
                                style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                                disabled={isSubmitting}
                              />
                              {formData.responsibilities.length > 1 && (
                                <Button
                                  variant="outline-danger"
                                  onClick={() => removeArrayFieldItem('responsibilities', index)}
                                  disabled={isSubmitting}
                                  style={{ borderRadius: '10px', minWidth: '40px' }}
                                >
                                  <FiX />
                                </Button>
                              )}
                            </motion.div>
                          ))}
                        </Form.Group>

                        {/* Requirements */}
                        <Form.Group className="mb-4">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <Form.Label className="fw-medium">Requirements</Form.Label>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => addArrayFieldItem('requirements')}
                              disabled={isSubmitting}
                            >
                              <FiPlus className="me-1" /> Add
                            </Button>
                          </div>
                          {formData.requirements.map((item, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="d-flex gap-2 mb-2"
                            >
                              <Form.Control
                                type="text"
                                value={item}
                                onChange={(e) => handleArrayFieldChange('requirements', index, e.target.value)}
                                placeholder={`Requirement ${index + 1}`}
                                className="py-3 border-1"
                                style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                                disabled={isSubmitting}
                              />
                              {formData.requirements.length > 1 && (
                                <Button
                                  variant="outline-danger"
                                  onClick={() => removeArrayFieldItem('requirements', index)}
                                  disabled={isSubmitting}
                                  style={{ borderRadius: '10px', minWidth: '40px' }}
                                >
                                  <FiX />
                                </Button>
                              )}
                            </motion.div>
                          ))}
                        </Form.Group>

                        {/* Benefits */}
                        <Form.Group className="mb-4">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <Form.Label className="fw-medium">Benefits & Perks</Form.Label>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => addArrayFieldItem('benefits')}
                              disabled={isSubmitting}
                            >
                              <FiPlus className="me-1" /> Add
                            </Button>
                          </div>
                          {formData.benefits.map((item, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="d-flex gap-2 mb-2"
                            >
                              <Form.Control
                                type="text"
                                value={item}
                                onChange={(e) => handleArrayFieldChange('benefits', index, e.target.value)}
                                placeholder={`Benefit ${index + 1}`}
                                className="py-3 border-1"
                                style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                                disabled={isSubmitting}
                              />
                              {formData.benefits.length > 1 && (
                                <Button
                                  variant="outline-danger"
                                  onClick={() => removeArrayFieldItem('benefits', index)}
                                  disabled={isSubmitting}
                                  style={{ borderRadius: '10px', minWidth: '40px' }}
                                >
                                  <FiX />
                                </Button>
                              )}
                            </motion.div>
                          ))}
                        </Form.Group>

                        {/* Application Instructions */}
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-medium">Application Instructions</Form.Label>
                          <Form.Control
                            as="textarea"
                            name="applicationInstructions"
                            value={formData.applicationInstructions}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="Provide instructions for applicants..."
                            className="py-3 border-1"
                            style={{ 
                              borderRadius: '10px',
                              backgroundColor: '#f9fafb',
                              resize: 'none'
                            }}
                            disabled={isSubmitting}
                          />
                        </Form.Group>

                        {/* Application Deadline */}
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-medium">
                            <FiCalendar className="me-2" />
                            Application Deadline
                          </Form.Label>
                          <Form.Control
                            type="date"
                            name="applicationDeadline"
                            value={formData.applicationDeadline}
                            onChange={handleInputChange}
                            min={new Date().toISOString().split('T')[0]}
                            className="py-3 border-1"
                            style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                            disabled={isSubmitting}
                          />
                        </Form.Group>

                        {/* Tags */}
                        <Form.Group className="mb-4">
                          <Form.Label className="fw-medium">Tags (for search optimization)</Form.Label>
                          <div className="d-flex gap-2 mb-3">
                            <Form.Control
                              type="text"
                              placeholder="e.g., remote, frontend, react"
                              value={tempTag}
                              onChange={(e) => setTempTag(e.target.value)}
                              className="py-3 border-1"
                              style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                              disabled={isSubmitting}
                            />
                            <MotionButton
                              type="button"
                              onClick={addTag}
                              className="py-3"
                              style={{ 
                                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                border: 'none',
                                borderRadius: '10px',
                                minWidth: '80px'
                              }}
                              disabled={isSubmitting}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <FiPlus className="me-1" /> Add
                            </MotionButton>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            {formData.tags.map((tag, index) => (
                              <motion.div
                                key={index}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="badge bg-secondary bg-gradient d-flex align-items-center"
                                style={{ 
                                  padding: '8px 12px',
                                  fontSize: '0.875rem',
                                  borderRadius: '20px'
                                }}
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => removeTag(index)}
                                  className="btn-close ms-2"
                                  style={{ fontSize: '0.5rem' }}
                                  disabled={isSubmitting}
                                />
                              </motion.div>
                            ))}
                          </div>
                        </Form.Group>

                        {/* Additional Options */}
                        <div className="p-4 bg-gray-50 rounded-3">
                          <h6 className="fw-semibold mb-3">Additional Options</h6>
                          <div className="space-y-3">
                            <Form.Check
                              type="checkbox"
                              id="isUrgent"
                              label={
                                <>
                                  <FiClock className="me-2" />
                                  Mark as Urgent Hiring
                                </>
                              }
                              checked={formData.isUrgent}
                              onChange={(e) => setFormData(prev => ({ ...prev, isUrgent: e.target.checked }))}
                            />
                            <Form.Check
                              type="checkbox"
                              id="isFeatured"
                              label={
                                <>
                                  <FiStar className="me-2" />
                                  Feature this Job (increases visibility)
                                </>
                              }
                              checked={formData.isFeatured}
                              onChange={(e) => setFormData(prev => ({ ...prev, isFeatured: e.target.checked }))}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Step 4: Review */}
                    {currentStep === 4 && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                      >
                        <h5 className="mb-4 fw-semibold text-dark border-bottom pb-2">
                          <FiCheck className="me-2" />
                          Review & Submit
                        </h5>

                        {/* Company Info */}
                        <div className="d-flex align-items-center gap-4 p-4 bg-gray-50 rounded-3 mb-4">
                          {company.logo ? (
                            <motion.img 
                              src={company.logo} 
                              alt={company.name}
                              className="rounded-2 object-fit-contain"
                              style={{ width: '80px', height: '80px' }}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring" }}
                            />
                          ) : (
                            <div className="rounded-2 d-flex align-items-center justify-content-center bg-primary bg-gradient"
                              style={{ width: '80px', height: '80px' }}>
                              <FiBriefcase className="text-white" size={32} />
                            </div>
                          )}
                          <div>
                            <h6 className="fw-bold">{company.name}</h6>
                            <p className="text-muted mb-1">{company.industry}</p>
                            <p className="text-muted mb-0">{company.location}</p>
                          </div>
                        </div>

                        {/* Job Preview */}
                        <div className="space-y-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <h6 className="fw-bold">{formData.title || 'Job Title'}</h6>
                            <div className="d-flex gap-2">
                              <span className="badge bg-primary">{formData.type}</span>
                              {formData.isRemote && <span className="badge bg-success">Remote</span>}
                              {formData.isUrgent && <span className="badge bg-danger">Urgent</span>}
                            </div>
                          </div>

                          <div className="row g-3">
                            <div className="col-6">
                              <div className="d-flex align-items-center text-muted">
                                <FiMapPin className="me-2" />
                                <span>{formData.location}</span>
                              </div>
                            </div>
                            {formData.salary.min && (
                              <div className="col-6">
                                <div className="d-flex align-items-center text-muted">
                                  <FiDollarSign className="me-2" />
                                  <span>
                                    {formData.salary.currency} {formData.salary.min}
                                    {formData.salary.max && ` - ${formData.salary.max}`}
                                    {formData.salary.isNegotiable && ' (Negotiable)'}
                                  </span>
                                </div>
                              </div>
                            )}
                            {formData.experience.minYears && (
                              <div className="col-6">
                                <div className="d-flex align-items-center text-muted">
                                  <FiUsers className="me-2" />
                                  <span>
                                    {formData.experience.minYears} 
                                    {formData.experience.maxYears ? `-${formData.experience.maxYears}` : '+'} years
                                  </span>
                                </div>
                              </div>
                            )}
                            {formData.applicationDeadline && (
                              <div className="col-6">
                                <div className="d-flex align-items-center text-muted">
                                  <FiCalendar className="me-2" />
                                  <span>
                                    Apply by {new Date(formData.applicationDeadline).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Skills Preview */}
                          {formData.skills.length > 0 && (
                            <div className="mt-3">
                              <h6 className="fw-semibold mb-2">Required Skills</h6>
                              <div className="d-flex flex-wrap gap-2">
                                {formData.skills.slice(0, 8).map((skill, index) => (
                                  <span key={index} className="badge bg-light text-dark">
                                    {skill}
                                  </span>
                                ))}
                                {formData.skills.length > 8 && (
                                  <span className="badge bg-light text-dark">
                                    +{formData.skills.length - 8} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Status Selection */}
                        <Form.Group className="mt-4">
                          <Form.Label className="fw-medium">Publication Status</Form.Label>
                          <div className="d-flex gap-3">
                            <Form.Check
                              type="radio"
                              id="draft"
                              name="status"
                              label="Save as Draft"
                              checked={formData.status === 'draft'}
                              onChange={() => setFormData(prev => ({ ...prev, status: 'draft' }))}
                              inline
                            />
                            <Form.Check
                              type="radio"
                              id="active"
                              name="status"
                              label="Publish Immediately"
                              checked={formData.status === 'active'}
                              onChange={() => setFormData(prev => ({ ...prev, status: 'active' }))}
                              inline
                            />
                          </div>
                        </Form.Group>
                      </motion.div>
                    )}

                    {/* Navigation Buttons */}
                    <motion.div 
                      className="d-flex justify-content-between align-items-center mt-5"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <div>
                        {currentStep > 1 && (
                          <Button
                            variant="outline-secondary"
                            onClick={prevStep}
                            disabled={isSubmitting}
                            className="py-3 px-4 fw-medium"
                            style={{ borderRadius: '10px' }}
                          >
                            ← Previous
                          </Button>
                        )}
                      </div>

                      <div className="d-flex gap-3">
                        {currentStep < 4 ? (
                          <>
                            <Button
                              variant="outline-primary"
                              onClick={(e) => {
                                e.preventDefault()
                                handleSubmit(e, 'draft')
                              }}
                              disabled={isSubmitting}
                              className="py-3 px-4 fw-medium"
                              style={{ borderRadius: '10px' }}
                            >
                              Save Draft
                            </Button>
                            <MotionButton
                              onClick={nextStep}
                              className="py-3 px-4 fw-medium"
                              style={{ 
                                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                                border: 'none',
                                borderRadius: '10px'
                              }}
                              disabled={isSubmitting}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Next Step <FiChevronRight className="ms-1" />
                            </MotionButton>
                          </>
                        ) : (
                          <MotionButton
                            type="submit"
                            className="py-3 px-5 fw-semibold"
                            style={{ 
                              background: formData.status === 'active' 
                                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                : 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                              border: 'none',
                              borderRadius: '10px',
                              fontSize: '1.1rem',
                              boxShadow: formData.status === 'active' 
                                ? '0 4px 15px rgba(16, 185, 129, 0.3)'
                                : '0 4px 15px rgba(139, 92, 246, 0.3)',
                            }}
                            disabled={isSubmitting}
                            whileHover={{ 
                              scale: 1.05,
                              boxShadow: formData.status === 'active'
                                ? '0 6px 20px rgba(16, 185, 129, 0.4)'
                                : '0 6px 20px rgba(139, 92, 246, 0.4)',
                            }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {isSubmitting ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                {formData.status === 'draft' ? 'Saving Draft...' : 'Publishing Job...'}
                              </>
                            ) : (
                              <>
                                <FiUpload className="me-2" />
                                {formData.status === 'draft' ? 'Save as Draft' : 'Publish Job'}
                              </>
                            )}
                          </MotionButton>
                        )}
                      </div>
                    </motion.div>
                  </Form>
                </motion.div>
              </motion.div>
            </Col>
          </Row>

          {/* Mobile View Stats */}
          <motion.div 
            className="row d-lg-none mt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Col xs={12}>
              <div className="text-white text-center">
                <div className="row g-3">
                  {[
                    { number: "85%", label: "Visibility" },
                    { number: "3x", label: "Applicants" },
                    { number: "48h", label: "Response" },
                    { number: "A+", label: "Quality" },
                  ].map((stat, idx) => (
                    <motion.div 
                      key={idx} 
                      className="col-6"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 + (idx * 0.1), type: "spring" }}
                    >
                      <div className="p-3 rounded-3" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                        <div className="fs-4 fw-bold">{stat.number}</div>
                        <div className="opacity-75">{stat.label}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Col>
          </motion.div>
        </Container>
      </div>
    </>
  )
}

// Button Component (since we're using Bootstrap Button)
const Button = BootstrapButton;