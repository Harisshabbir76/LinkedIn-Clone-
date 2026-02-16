// app/register/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { Form, Button as BootstrapButton, Container, Row, Col, Alert } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { toast, Toaster } from 'react-hot-toast';

// Create a motion-wrapped Button component
const MotionButton = motion(BootstrapButton);

const API_BASE_URL = 'http://localhost:5000/api';

interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: string;
  role: string;
}

export default function SignupForm() {
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    role: 'Looking for job',
  });
  
  const [errors, setErrors] = useState<Partial<SignupFormData & { general: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { setUser } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'age') {
      // Only allow numbers for age
      const numericValue = value.replace(/\D/g, '');
      setFormData({
        ...formData,
        [name]: numericValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      });
    }
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof SignupFormData]) {
      setErrors({
        ...errors,
        [name]: undefined,
      });
    }
  };

  const toggleRole = (role: string) => {
    setFormData({
      ...formData,
      role,
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<SignupFormData & { general: string }> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else if (isNaN(Number(formData.age)) || Number(formData.age) < 16 || Number(formData.age) > 100) {
      newErrors.age = 'Age must be between 16 and 100';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Call backend registration API
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          age: Number(formData.age),
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors from backend
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: any) => err.msg).join(', ');
          throw new Error(errorMessages);
        } else if (data.message) {
          throw new Error(data.message);
        } else {
          throw new Error(`Registration failed: ${response.status} ${response.statusText}`);
        }
      }

      // Success - automatically log the user in
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        // Registration successful but login failed
        setSubmitSuccess(true);
        setErrors({
          general: 'Account created successfully! Please login with your credentials.'
        });
        
        toast.success('Account created! Please login.');
        
        // Redirect to login after delay
        setTimeout(() => {
          router.push('/login');
        }, 3000);
        return;
      }

      // Save token and user data to localStorage and context
      localStorage.setItem('token', loginData.token);
      localStorage.setItem('user', JSON.stringify(loginData.user));
      setUser(loginData.user);
      
      setSubmitSuccess(true);
      toast.success('Account created and logged in successfully!');

      // Redirect to home page after successful registration and login
      setTimeout(() => {
        router.push('/');
        router.refresh(); // Refresh to update auth state
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMessage = error.message || 'Registration failed. Please try again.';
      setErrors({
        general: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants for Framer Motion
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

  return (
    <>
      <Toaster position="top-right" />
      <div 
        className="min-vh-100 d-flex align-items-center justify-content-center p-3" 
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          overflow: 'hidden'
        }}
      >
        <Container fluid className="px-3 px-md-5">
          <Row className="justify-content-between align-items-center">
            {/* Left Side Content */}
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
                    Join the Largest 
                    <span className="d-block" style={{ 
                      background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      Job Platform
                    </span>
                  </h1>
                </motion.div>

                {/* Description */}
                <motion.div variants={itemVariants}>
                  <p className="lead mb-5 opacity-90" style={{ fontSize: '1.25rem' }}>
                    Where talented professionals meet visionary companies. 
                    Start your journey towards your dream career today.
                  </p>
                </motion.div>

                {/* Stats Grid */}
                <motion.div 
                  className="row g-4 mb-5"
                  variants={containerVariants}
                >
                  {[
                    { number: "5000+", label: "Companies Worldwide", icon: "🏢", color: "#3B82F6" },
                    { number: "1M+", label: "Users Worldwide", icon: "👥", color: "#10B981" },
                    { number: "200K+", label: "Jobs Posted", icon: "💼", color: "#8B5CF6" },
                    { number: "95%", label: "Success Rate", icon: "📈", color: "#F59E0B" },
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
                          background: 'rgba(255, 255, 255, 0.1)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
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

                {/* Features List */}
                <motion.div variants={itemVariants}>
                  <h3 className="h4 mb-4 fw-semibold">Why Choose JobConnect?</h3>
                  <div className="row g-3">
                    {[
                      { text: "AI-powered job matching", icon: "🤖" },
                      { text: "Instant job alerts", icon: "🔔" },
                      { text: "Resume builder tool", icon: "📝" },
                      { text: "Career growth resources", icon: "🚀" },
                      { text: "24/7 Support", icon: "🛡️" },
                      { text: "Global opportunities", icon: "🌍" },
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

                {/* Testimonial */}
                <motion.div 
                  variants={itemVariants}
                  className="mt-5 pt-4"
                  style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}
                >
                  <div className="d-flex align-items-center">
                    <motion.div 
                      className="rounded-circle me-3"
                      style={{ 
                        width: '60px', 
                        height: '60px', 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        overflow: 'hidden',
                        border: '3px solid white'
                      }}
                      animate={{ 
                        rotate: [0, 360],
                      }}
                      transition={{ 
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                    >
                      <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                        <span className="fs-3">👨‍💼</span>
                      </div>
                    </motion.div>
                    <div>
                      <p className="mb-1 fst-italic opacity-90">
                        "JobConnect helped me land my dream job in just 2 weeks! The platform is incredibly intuitive."
                      </p>
                      <div className="d-flex align-items-center">
                        <div className="text-warning me-2">★★★★★</div>
                        <span className="opacity-75">- Alex Johnson, Product Manager</span>
                      </div>
                    </div>
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

                {/* Signup Form Card */}
                <motion.div 
                  className="bg-white p-4 p-md-5 rounded-4 shadow-lg position-relative"
                  style={{ 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {/* JobConnect Header */}
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
                          background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', 
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
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
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                          <path d="M12 11l4 2-4 2-4-2 4-2z"></path>
                        </svg>
                      </motion.div>
                      <span className="fs-2 fw-bold" style={{ 
                        background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}>JobConnect</span>
                    </div>
                    <motion.h1 
                      className="h2 fw-bold text-dark mb-3"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Join the Future of Hiring
                    </motion.h1>
                    <p className="text-muted" style={{ fontSize: '1.05rem' }}>
                      Create your account and unlock amazing opportunities
                    </p>
                  </motion.div>

                  {/* Role Toggle */}
                  <motion.div 
                    className="d-flex justify-content-center mb-5"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <div className="bg-light rounded-4 p-1 d-inline-flex shadow-sm" style={{ backgroundColor: '#f8f9fa' }}>
                      <motion.button
                        type="button"
                        className={`btn ${formData.role === 'Looking for job' ? 'btn-primary' : 'btn-light'} rounded-3 px-4 py-3 fw-semibold`}
                        onClick={() => toggleRole('Looking for job')}
                        style={{
                          minWidth: '140px',
                          background: formData.role === 'Looking for job' ? 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' : 'transparent',
                          border: 'none',
                          transition: 'all 0.3s ease'
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isLoading}
                      >
                        <div className="d-flex flex-column align-items-center">
                          <svg className="mb-1" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path fill={formData.role === 'Looking for job' ? "white" : "#6c757d"} d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                          </svg>
                          Job Seeker
                        </div>
                      </motion.button>
                      <motion.button
                        type="button"
                        className={`btn ${formData.role === 'Hiring job' ? 'btn-primary' : 'btn-light'} rounded-3 px-4 py-3 fw-semibold ms-1`}
                        onClick={() => toggleRole('Hiring job')}
                        style={{
                          minWidth: '140px',
                          background: formData.role === 'Hiring job' ? 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)' : 'transparent',
                          border: 'none',
                          transition: 'all 0.3s ease'
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        disabled={isLoading}
                      >
                        <div className="d-flex flex-column align-items-center">
                          <svg className="mb-1" width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                            <path fill={formData.role === 'Hiring job' ? "white" : "#6c757d"} d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                          </svg>
                          Recruiter
                        </div>
                      </motion.button>
                    </div>
                  </motion.div>

                  {/* Signup Form */}
                  <Form onSubmit={handleSubmit}>
                    {['name', 'email', 'age', 'password', 'confirmPassword'].map((field, index) => (
                      <motion.div
                        key={field}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.9 + (index * 0.1) }}
                      >
                        <Form.Group className="mb-4">
                          <div className="position-relative">
                            <div className="position-absolute top-50 start-0 translate-middle-y ps-3">
                              {field === 'name' && (
                                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                              )}
                              {field === 'email' && (
                                <svg className="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"></path>
                                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"></path>
                                </svg>
                              )}
                              {field === 'age' && (
                                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                              )}
                              {field === 'password' && (
                                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                              )}
                              {field === 'confirmPassword' && (
                                <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                              )}
                            </div>
                            <Form.Control
                              type={
                                field === 'email' ? 'email' :
                                field === 'password' || field === 'confirmPassword' ? (showPassword ? 'text' : 'password') :
                                field === 'age' ? 'text' : 'text'
                              }
                              name={field}
                              placeholder={
                                field === 'name' ? 'Full Name' :
                                field === 'email' ? 'Email Address' :
                                field === 'age' ? 'Age' :
                                field === 'password' ? 'Password' :
                                'Confirm Password'
                              }
                              value={formData[field as keyof SignupFormData] as string}
                              onChange={handleInputChange}
                              className="ps-5 py-3 border-1"
                              style={{ 
                                borderRadius: '10px',
                                borderColor: errors[field as keyof SignupFormData] ? '#ef4444' : '#e5e7eb',
                                backgroundColor: '#f9fafb',
                                transition: 'all 0.3s ease'
                              }}
                              required
                              disabled={isLoading}
                            />
                            {(field === 'password' || field === 'confirmPassword') && (
                              <button
                                type="button"
                                className="position-absolute top-50 end-0 translate-middle-y pe-3 btn btn-link"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ color: '#6b7280' }}
                                disabled={isLoading}
                              >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                              </button>
                            )}
                          </div>
                          {errors[field as keyof SignupFormData] && (
                            <motion.div 
                              className="d-flex align-items-center mt-2 text-danger"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                            >
                              <svg className="me-1" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM8 4a.905.905 0 0 0-.9.995l.35 3.507a.552.552 0 0 0 1.1 0l.35-3.507A.905.905 0 0 0 8 4zm.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"/>
                              </svg>
                              <small>{errors[field as keyof SignupFormData]}</small>
                            </motion.div>
                          )}
                        </Form.Group>
                      </motion.div>
                    ))}

                    {/* Password Requirements */}
                    <motion.div 
                      className="mb-4 p-3 rounded"
                      style={{ backgroundColor: '#f8f9fa', fontSize: '0.85rem' }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.3 }}
                    >
                      <small className="text-muted">Password must contain:</small>
                      <div className="d-flex flex-wrap gap-3 mt-2">
                        {[
                          { condition: formData.password.length >= 6, text: 'At least 6 characters' },
                          { condition: formData.password.length > 0, text: 'Any characters allowed' },
                        ].map((req, idx) => (
                          <motion.span 
                            key={idx}
                            className={`d-flex align-items-center ${req.condition ? 'text-success' : 'text-muted'}`}
                            animate={{ scale: req.condition ? [1, 1.1, 1] : 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <svg className="me-1" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                              {req.condition ? (
                                <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                              ) : (
                                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                              )}
                            </svg>
                            {req.text}
                          </motion.span>
                        ))}
                      </div>
                    </motion.div>

                    {/* Submit Button */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.4 }}
                    >
                      <MotionButton
                        type="submit"
                        className="w-100 py-3 mb-3 fw-semibold border-0"
                        style={{ 
                          background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                          borderRadius: '10px',
                          fontSize: '1.1rem',
                          boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
                        }}
                        disabled={isLoading}
                        whileHover={{ 
                          scale: 1.05,
                          boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {isLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            Creating Account...
                          </>
                        ) : (
                          <>
                            Create Account
                            <svg className="ms-2" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                            </svg>
                          </>
                        )}
                      </MotionButton>
                    </motion.div>
                  </Form>

                  {/* Terms */}
                  <motion.p 
                    className="text-center text-sm text-muted mb-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                  >
                    By creating an account, you agree to our{' '}
                    <a href="#" className="text-decoration-none fw-medium" style={{ color: '#2563EB' }}>Privacy Policy</a> and{' '}
                    <a href="#" className="text-decoration-none fw-medium" style={{ color: '#2563EB' }}>Terms of Service</a>.
                  </motion.p>

                  {/* Login Link */}
                  <motion.p 
                    className="text-center text-sm text-muted mb-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.6 }}
                  >
                    Already have an account?{' '}
                    <motion.a 
                      href="/login" 
                      className="text-decoration-none fw-semibold" 
                      style={{ color: '#2563EB' }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Log in here
                      <svg className="ms-1" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                      </svg>
                    </motion.a>
                  </motion.p>
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
                <h4 className="mb-4">Join 1M+ professionals worldwide</h4>
                <div className="row g-3">
                  {[
                    { number: "5000+", label: "Companies" },
                    { number: "1M+", label: "Users" },
                    { number: "200K+", label: "Jobs" },
                    { number: "95%", label: "Success Rate" },
                  ].map((stat, idx) => (
                    <motion.div 
                      key={idx} 
                      className="col-6"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6 + (idx * 0.1), type: "spring" }}
                    >
                      <div className="p-3 rounded-3" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
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
              © {new Date().getFullYear()} JobConnect. Connecting talent with opportunities.
            </small>
          </motion.div>
        </Container>
      </div>
    </>
  );
}