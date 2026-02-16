// app/company/create/PremiumCompanyForm.tsx
'use client';

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Form, Button as BootstrapButton, Container, Row, Col, Alert } from 'react-bootstrap';
import { toast, Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// Create a motion-wrapped Button component
const MotionButton = motion(BootstrapButton);

interface TeamMember {
  user: string;
  role: 'admin' | 'recruiter' | 'manager';
  email: string;
}

interface CompanyFormData {
  name: string;
  email: string;
  description: string;
  website: string;
  location: string;
  industry: string;
  size: string;
  foundedYear: string;
  phone: string;
  linkedin: string;
  twitter: string;
  facebook: string;
  instagram: string;
  teamMembers: TeamMember[];
}

export const PremiumCompanyForm = ({ onSubmit }: { onSubmit: (formData: FormData) => Promise<boolean> }) => {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    email: '',
    description: '',
    website: '',
    location: '',
    industry: '',
    size: '',
    foundedYear: '',
    phone: '',
    linkedin: '',
    twitter: '',
    facebook: '',
    instagram: '',
    teamMembers: []
  });

  const [newTeamMember, setNewTeamMember] = useState<TeamMember>({
    user: '',
    role: 'recruiter',
    email: ''
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [errors, setErrors] = useState<Partial<CompanyFormData & { general: string }>>({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const router = useRouter();

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Retail',
    'Manufacturing',
    'Real Estate',
    'Entertainment',
    'Transportation',
    'Hospitality',
    'Energy',
    'Agriculture',
    'Construction',
    'Media',
    'Telecommunications',
    'Other'
  ];

  const companySizes = [
    "1-10",
    "11-50",
    "51-200",
    "201-500",
    "501-1000",
    "1000+"
  ];

  const teamRoles = [
    { value: 'admin', label: 'Admin', description: 'Full company access' },
    { value: 'manager', label: 'Manager', description: 'Manage jobs and team' },
    { value: 'recruiter', label: 'Recruiter', description: 'Post and manage jobs' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name as keyof CompanyFormData]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
  };

  const handleTeamMemberChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTeamMember(prev => ({ ...prev, [name]: value }));
  };

  const addTeamMember = () => {
    if (!newTeamMember.email || !newTeamMember.role) {
      toast.error('Please fill in team member email and select a role');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newTeamMember.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check for duplicate email
    if (formData.teamMembers.some(member => member.email === newTeamMember.email)) {
      toast.error('This team member is already added');
      return;
    }

    setFormData(prev => ({
      ...prev,
      teamMembers: [...prev.teamMembers, { ...newTeamMember, user: newTeamMember.email }]
    }));

    setNewTeamMember({
      user: '',
      role: 'recruiter',
      email: ''
    });

    toast.success('Team member added');
  };

  const removeTeamMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((_, i) => i !== index)
    }));
    toast.success('Team member removed');
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CompanyFormData & { general: string }> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 50) {
      newErrors.description = 'Description must be at least 50 characters';
    }

    if (!formData.industry) {
      newErrors.industry = 'Industry is required';
    }

    if (!formData.size) {
      newErrors.size = 'Company size is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    // Phone validation (optional but must be valid if provided)
    if (formData.phone && !/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Founded year validation
    if (formData.foundedYear) {
      const year = parseInt(formData.foundedYear);
      const currentYear = new Date().getFullYear();
      if (year < 1800 || year > currentYear) {
        newErrors.foundedYear = `Founded year must be between 1800 and ${currentYear}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    const formDataToSend = new FormData();
    
    // Add all form fields
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'teamMembers') {
        // Send team members as JSON array
        formDataToSend.append(key, JSON.stringify(value));
      } else if (value) {
        formDataToSend.append(key, value.toString());
      }
    });

    // Add social links as JSON
    const socialLinks = {
      linkedin: formData.linkedin || '',
      twitter: formData.twitter || '',
      facebook: formData.facebook || '',
      instagram: formData.instagram || ''
    };
    formDataToSend.append('socialLinks', JSON.stringify(socialLinks));

    // Add files
    if (logoFile) formDataToSend.append('logo', logoFile);
    if (coverFile) formDataToSend.append('coverImage', coverFile);

    try {
      const success = await onSubmit(formDataToSend);
      if (success) {
        setSubmitSuccess(true);
        toast.success('Company profile created successfully!');
        setTimeout(() => {
          router.push('/company/dashboard');
        }, 2000);
      } else {
        setErrors({
          general: 'Failed to create company profile. Please try again.'
        });
        toast.error('Failed to create company profile.');
      }
    } catch (error) {
      setErrors({
        general: 'An error occurred. Please try again.'
      });
      toast.error('An error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

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
  };

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
  };

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
  };

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
  };

  const currentYear = new Date().getFullYear();

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
                    Build Your
                    <span className="d-block" style={{ 
                      background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      Company Empire
                    </span>
                  </h1>
                </motion.div>

                {/* Stats Grid */}
                <motion.div 
                  className="row g-4 mb-5"
                  variants={containerVariants}
                >
                  {[
                    { number: "10K+", label: "Premium Companies", icon: "🏢", color: "#06b6d4" },
                    { number: "95%", label: "Success Rate", icon: "📈", color: "#10b981" },
                    { number: "24/7", label: "Enterprise Support", icon: "🛡️", color: "#8b5cf6" },
                    { number: "A+", label: "Security Rating", icon: "🔒", color: "#3b82f6" },
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

                {/* Features */}
                <motion.div variants={itemVariants}>
                  <div className="row g-3">
                    {[
                      { text: "Complete company profile setup", icon: "🏢" },
                      { text: "Team management dashboard", icon: "👥" },
                      { text: "Social media integration", icon: "🔗" },
                      { text: "File upload management", icon: "📁" },
                      { text: "Advanced validation", icon: "✓" },
                      { text: "Real-time preview", icon: "👁️" },
                    ].map((feature, index) => (
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
                            <span className="fs-4">{feature.icon}</span>
                          </motion.div>
                          <span className="opacity-90">{feature.text}</span>
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
                  {errors.general && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mb-4"
                    >
                      <Alert variant={submitSuccess ? "success" : "danger"} className="text-center shadow-sm border-0 rounded-3">
                        <div className="d-flex align-items-center justify-content-center">
                          <svg className="bi me-2" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            {submitSuccess ? (
                              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                            ) : (
                              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                            )}
                          </svg>
                          {errors.general}
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
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                          <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4"></path>
                        </svg>
                      </motion.div>
                      <span className="fs-2 fw-bold" style={{ 
                        background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>Enterprise Profile</span>
                    </div>
                    <motion.h1 
                      className="h2 fw-bold text-dark mb-3"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Complete Company Setup
                    </motion.h1>
                  </motion.div>

                  {/* Company Form */}
                  <Form onSubmit={handleSubmit}>
                    {/* Basic Information Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="mb-4"
                    >
                      <h5 className="mb-4 fw-semibold text-dark border-bottom pb-2">
                        <svg className="me-2" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                        </svg>
                        Basic Information
                      </h5>
                      
                      <div className="row g-4">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">Company Name *</Form.Label>
                            <div className="position-relative">
                              <Form.Control
                                type="text"
                                name="name"
                                placeholder="Enter company name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="py-3 border-1"
                                style={{ 
                                  borderRadius: '10px',
                                  borderColor: errors.name ? '#ef4444' : '#e5e7eb',
                                  backgroundColor: '#f9fafb'
                                }}
                                required
                                disabled={isLoading}
                              />
                            </div>
                            {errors.name && (
                              <div className="d-flex align-items-center mt-2 text-danger">
                                <svg className="me-1" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                                </svg>
                                <small>{errors.name}</small>
                              </div>
                            )}
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">Corporate Email *</Form.Label>
                            <div className="position-relative">
                              <Form.Control
                                type="email"
                                name="email"
                                placeholder="contact@company.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="py-3 border-1"
                                style={{ 
                                  borderRadius: '10px',
                                  borderColor: errors.email ? '#ef4444' : '#e5e7eb',
                                  backgroundColor: '#f9fafb'
                                }}
                                required
                                disabled={isLoading}
                              />
                            </div>
                            {errors.email && (
                              <div className="d-flex align-items-center mt-2 text-danger">
                                <svg className="me-1" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                                </svg>
                                <small>{errors.email}</small>
                              </div>
                            )}
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">Industry *</Form.Label>
                            <Form.Select
                              name="industry"
                              value={formData.industry}
                              onChange={handleInputChange}
                              className="py-3 border-1"
                              style={{ 
                                borderRadius: '10px',
                                borderColor: errors.industry ? '#ef4444' : '#e5e7eb',
                                backgroundColor: '#f9fafb'
                              }}
                              required
                              disabled={isLoading}
                            >
                              <option value="">Select Industry</option>
                              {industries.map(industry => (
                                <option key={industry} value={industry}>{industry}</option>
                              ))}
                            </Form.Select>
                            {errors.industry && (
                              <div className="d-flex align-items-center mt-2 text-danger">
                                <svg className="me-1" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                                </svg>
                                <small>{errors.industry}</small>
                              </div>
                            )}
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">Company Size *</Form.Label>
                            <Form.Select
                              name="size"
                              value={formData.size}
                              onChange={handleInputChange}
                              className="py-3 border-1"
                              style={{ 
                                borderRadius: '10px',
                                borderColor: errors.size ? '#ef4444' : '#e5e7eb',
                                backgroundColor: '#f9fafb'
                              }}
                              required
                              disabled={isLoading}
                            >
                              <option value="">Select Company Size</option>
                              {companySizes.map(size => (
                                <option key={size} value={size}>{size}</option>
                              ))}
                            </Form.Select>
                            {errors.size && (
                              <div className="d-flex align-items-center mt-2 text-danger">
                                <svg className="me-1" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                                </svg>
                                <small>{errors.size}</small>
                              </div>
                            )}
                          </Form.Group>
                        </Col>
                      </div>
                    </motion.div>

                    {/* Contact & Location Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 }}
                      className="mb-4"
                    >
                      <h5 className="mb-4 fw-semibold text-dark border-bottom pb-2">
                        <svg className="me-2" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                        </svg>
                        Contact & Location
                      </h5>
                      
                      <div className="row g-4">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">Headquarters Location *</Form.Label>
                            <Form.Control
                              type="text"
                              name="location"
                              placeholder="City, State, Country"
                              value={formData.location}
                              onChange={handleInputChange}
                              className="py-3 border-1"
                              style={{ 
                                borderRadius: '10px',
                                borderColor: errors.location ? '#ef4444' : '#e5e7eb',
                                backgroundColor: '#f9fafb'
                              }}
                              required
                              disabled={isLoading}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">Phone Number</Form.Label>
                            <Form.Control
                              type="tel"
                              name="phone"
                              placeholder="+1 (555) 123-4567"
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="py-3 border-1"
                              style={{ 
                                borderRadius: '10px',
                                borderColor: errors.phone ? '#ef4444' : '#e5e7eb',
                                backgroundColor: '#f9fafb'
                              }}
                              disabled={isLoading}
                            />
                            {errors.phone && (
                              <div className="d-flex align-items-center mt-2 text-danger">
                                <svg className="me-1" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                                </svg>
                                <small>{errors.phone}</small>
                              </div>
                            )}
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">Company Website</Form.Label>
                            <Form.Control
                              type="url"
                              name="website"
                              placeholder="https://company.com"
                              value={formData.website}
                              onChange={handleInputChange}
                              className="py-3 border-1"
                              style={{ 
                                borderRadius: '10px',
                                backgroundColor: '#f9fafb'
                              }}
                              disabled={isLoading}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">Founded Year</Form.Label>
                            <Form.Control
                              type="number"
                              name="foundedYear"
                              placeholder="e.g., 2020"
                              value={formData.foundedYear}
                              onChange={handleInputChange}
                              min="1800"
                              max={currentYear}
                              className="py-3 border-1"
                              style={{ 
                                borderRadius: '10px',
                                borderColor: errors.foundedYear ? '#ef4444' : '#e5e7eb',
                                backgroundColor: '#f9fafb'
                              }}
                              disabled={isLoading}
                            />
                            {errors.foundedYear && (
                              <div className="d-flex align-items-center mt-2 text-danger">
                                <svg className="me-1" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                                </svg>
                                <small>{errors.foundedYear}</small>
                              </div>
                            )}
                          </Form.Group>
                        </Col>
                      </div>
                    </motion.div>

                    {/* Description Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.0 }}
                      className="mb-4"
                    >
                      <h5 className="mb-4 fw-semibold text-dark border-bottom pb-2">
                        <svg className="me-2" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                        </svg>
                        Company Description *
                      </h5>
                      
                      <Form.Group>
                        <Form.Control
                          as="textarea"
                          name="description"
                          placeholder="Describe your company's mission, vision, culture, and values. Minimum 50 characters."
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={5}
                          className="py-3 border-1"
                          style={{ 
                            borderRadius: '10px',
                            borderColor: errors.description ? '#ef4444' : '#e5e7eb',
                            backgroundColor: '#f9fafb',
                            resize: 'none'
                          }}
                          required
                          disabled={isLoading}
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
                          <small className={`ms-auto ${formData.description.length >= 50 ? 'text-success' : 'text-muted'}`}>
                            {formData.description.length}/50 characters
                          </small>
                        </div>
                      </Form.Group>
                    </motion.div>

                    {/* Social Media Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 }}
                      className="mb-4"
                    >
                      <h5 className="mb-4 fw-semibold text-dark border-bottom pb-2">
                        <svg className="me-2" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/>
                          <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/>
                        </svg>
                        Social Media Links
                      </h5>
                      
                      <div className="row g-4">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">
                              <svg className="me-2" width="16" height="16" fill="#0077b5" viewBox="0 0 24 24">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                              </svg>
                              LinkedIn
                            </Form.Label>
                            <Form.Control
                              type="url"
                              name="linkedin"
                              placeholder="https://linkedin.com/company/your-company"
                              value={formData.linkedin}
                              onChange={handleInputChange}
                              className="py-3 border-1"
                              style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                              disabled={isLoading}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">
                              <svg className="me-2" width="16" height="16" fill="#1DA1F2" viewBox="0 0 24 24">
                                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.213c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                              </svg>
                              Twitter
                            </Form.Label>
                            <Form.Control
                              type="url"
                              name="twitter"
                              placeholder="https://twitter.com/your-company"
                              value={formData.twitter}
                              onChange={handleInputChange}
                              className="py-3 border-1"
                              style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                              disabled={isLoading}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">
                              <svg className="me-2" width="16" height="16" fill="#1877F2" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                              Facebook
                            </Form.Label>
                            <Form.Control
                              type="url"
                              name="facebook"
                              placeholder="https://facebook.com/your-company"
                              value={formData.facebook}
                              onChange={handleInputChange}
                              className="py-3 border-1"
                              style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                              disabled={isLoading}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium">
                              <svg className="me-2" width="16" height="16" fill="#E4405F" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                              </svg>
                              Instagram
                            </Form.Label>
                            <Form.Control
                              type="url"
                              name="instagram"
                              placeholder="https://instagram.com/your-company"
                              value={formData.instagram}
                              onChange={handleInputChange}
                              className="py-3 border-1"
                              style={{ borderRadius: '10px', backgroundColor: '#f9fafb' }}
                              disabled={isLoading}
                            />
                          </Form.Group>
                        </Col>
                      </div>
                    </motion.div>

                    {/* Team Members Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 }}
                      className="mb-4"
                    >
                      <h5 className="mb-4 fw-semibold text-dark border-bottom pb-2">
                        <svg className="me-2" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                        </svg>
                        Team Members
                      </h5>
                      
                      <div className="mb-4 p-4 rounded-3" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
                        <h6 className="mb-3 fw-medium">Add Team Member</h6>
                        <div className="row g-3 align-items-end">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-medium">Email Address</Form.Label>
                              <Form.Control
                                type="email"
                                name="email"
                                placeholder="team.member@company.com"
                                value={newTeamMember.email}
                                onChange={handleTeamMemberChange}
                                className="py-3 border-1"
                                style={{ borderRadius: '10px', backgroundColor: '#fff' }}
                                disabled={isLoading}
                              />
                            </Form.Group>
                          </Col>
                          
                          <Col md={4}>
                            <Form.Group>
                              <Form.Label className="fw-medium">Role</Form.Label>
                              <Form.Select
                                name="role"
                                value={newTeamMember.role}
                                onChange={handleTeamMemberChange}
                                className="py-3 border-1"
                                style={{ borderRadius: '10px', backgroundColor: '#fff' }}
                                disabled={isLoading}
                              >
                                {teamRoles.map(role => (
                                  <option key={role.value} value={role.value}>
                                    {role.label}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          
                          <Col md={2}>
                            <MotionButton
                              type="button"
                              onClick={addTeamMember}
                              className="w-100 py-3 fw-medium"
                              style={{ 
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                border: 'none',
                                borderRadius: '10px'
                              }}
                              disabled={isLoading}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Add
                            </MotionButton>
                          </Col>
                        </div>
                      </div>

                      {/* Team Members List */}
                      {formData.teamMembers.length > 0 && (
                        <div className="mb-4">
                          <h6 className="mb-3 fw-medium">Added Team Members ({formData.teamMembers.length})</h6>
                          <div className="list-group">
                            {formData.teamMembers.map((member, index) => (
                              <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="list-group-item d-flex justify-content-between align-items-center border-0 rounded-3 mb-2"
                                style={{ backgroundColor: '#f8f9fa' }}
                              >
                                <div>
                                  <div className="fw-medium">{member.email}</div>
                                  <small className="text-muted">
                                    {teamRoles.find(r => r.value === member.role)?.label}
                                  </small>
                                </div>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => removeTeamMember(index)}
                                  disabled={isLoading}
                                >
                                  Remove
                                </Button>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {/* File Upload Section */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.3 }}
                      className="mb-4"
                    >
                      <h5 className="mb-4 fw-semibold text-dark border-bottom pb-2">
                        <svg className="me-2" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"/>
                        </svg>
                        Brand Assets
                      </h5>
                      
                      <div className="row g-4">
                        <Col md={6}>
                          <div 
                            className="border-2 border-dashed rounded-3 p-4 text-center cursor-pointer h-100"
                            style={{ 
                              borderColor: '#e5e7eb',
                              backgroundColor: '#f9fafb',
                              minHeight: '200px'
                            }}
                            onClick={() => document.getElementById('logo-upload')?.click()}
                          >
                            <input
                              type="file"
                              id="logo-upload"
                              accept="image/*"
                              onChange={handleLogoChange}
                              className="d-none"
                            />
                            {logoPreview ? (
                              <div className="h-100 d-flex flex-column align-items-center justify-content-center">
                                <motion.img 
                                  src={logoPreview} 
                                  alt="Logo preview" 
                                  className="rounded-2 object-fit-contain mb-3"
                                  style={{ maxHeight: '120px', maxWidth: '100%' }}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring" }}
                                />
                                <div className="text-success">Logo uploaded ✓</div>
                                <small className="text-muted">Click to change</small>
                              </div>
                            ) : (
                              <div className="h-100 d-flex flex-column align-items-center justify-content-center">
                                <svg className="w-12 h-12 text-secondary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '48px', height: '48px' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                </svg>
                                <div className="text-secondary fw-medium">Company Logo</div>
                                <small className="text-muted">Recommended: 400×400px</small>
                                <small className="text-muted">SVG, PNG, JPG</small>
                              </div>
                            )}
                          </div>
                        </Col>

                        <Col md={6}>
                          <div 
                            className="border-2 border-dashed rounded-3 p-4 text-center cursor-pointer h-100"
                            style={{ 
                              borderColor: '#e5e7eb',
                              backgroundColor: '#f9fafb',
                              minHeight: '200px'
                            }}
                            onClick={() => document.getElementById('cover-upload')?.click()}
                          >
                            <input
                              type="file"
                              id="cover-upload"
                              accept="image/*"
                              onChange={handleCoverChange}
                              className="d-none"
                            />
                            {coverPreview ? (
                              <div className="h-100 d-flex flex-column align-items-center justify-content-center">
                                <motion.img 
                                  src={coverPreview} 
                                  alt="Cover preview" 
                                  className="rounded-2 object-fit-cover mb-3"
                                  style={{ maxHeight: '120px', maxWidth: '100%' }}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring" }}
                                />
                                <div className="text-success">Cover image uploaded ✓</div>
                                <small className="text-muted">Click to change</small>
                              </div>
                            ) : (
                              <div className="h-100 d-flex flex-column align-items-center justify-content-center">
                                <svg className="w-12 h-12 text-secondary mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '48px', height: '48px' }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                                </svg>
                                <div className="text-secondary fw-medium">Cover Image</div>
                                <small className="text-muted">Recommended: 1920×1080px</small>
                                <small className="text-muted">PNG, JPG</small>
                              </div>
                            )}
                          </div>
                        </Col>
                      </div>
                    </motion.div>

                    {/* Submit Button */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.4 }}
                    >
                      <div className="d-grid">
                        <MotionButton
                          type="submit"
                          className="w-100 py-3 mb-3 fw-semibold border-0"
                          style={{ 
                            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
                            borderRadius: '10px',
                            fontSize: '1.1rem',
                            boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                          }}
                          disabled={isLoading}
                          whileHover={{ 
                            scale: 1.05,
                            boxShadow: '0 6px 20px rgba(6, 182, 212, 0.4)',
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {isLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                              Creating Enterprise Profile...
                            </>
                          ) : (
                            <>
                              <svg className="me-2" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                              </svg>
                              Launch Enterprise Profile
                              <svg className="ms-2" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                              </svg>
                            </>
                          )}
                        </MotionButton>
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
                    { number: "10K+", label: "Premium Companies" },
                    { number: "95%", label: "Success Rate" },
                    { number: "24/7", label: "Support" },
                    { number: "A+", label: "Security" },
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

          {/* Footer Note */}
          <motion.div 
            className="text-center mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <small className="text-white opacity-75">
              © {new Date().getFullYear()} Enterprise Platform. All rights reserved.
            </small>
          </motion.div>
        </Container>
      </div>
    </>
  );
};