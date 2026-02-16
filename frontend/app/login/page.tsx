// app/login/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { Form, Button, Container, Row, Col, Alert } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { toast, Toaster } from 'react-hot-toast';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface Notification {
  type: 'success' | 'error' | null;
  message: string;
}

const API_BASE_URL = 'http://localhost:5000/api';

export default function LoginForm() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: true,
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState<Notification>({ type: null, message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login: authLogin, setUser } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setNotification({ type: null, message: '' });

    try {
      // Call backend login API
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error response
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: any) => err.msg).join(', ');
          throw new Error(errorMessages);
        } else if (data.message) {
          throw new Error(data.message);
        } else {
          throw new Error(`Login failed: ${response.status} ${response.statusText}`);
        }
      }

      // Success - save token and user data
      const { token, user } = data;
      
      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update auth context
      setUser(user);
      
      if (formData.rememberMe) {
        // Optional: Set longer expiration for "remember me"
        localStorage.setItem('rememberMe', 'true');
      }

      setNotification({ 
        type: 'success', 
        message: 'Login successful! Redirecting...' 
      });

      toast.success('Login successful!');

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/');
        router.refresh(); // Refresh the page to update auth state
      }, 1000);

    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Invalid credentials. Please try again.';
      setNotification({ 
        type: 'error', 
        message: errorMessage 
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push('/forgot-password');
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
      y: 20,
      filter: "blur(10px)"
    },
    visible: { 
      opacity: 1, 
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        damping: 15,
        stiffness: 100
      }
    }
  };

  const cardVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: "spring",
        damping: 20,
        stiffness: 100,
        delay: 0.2
      }
    }
  };

  const logoVariants = {
    hidden: { rotate: -180, scale: 0 },
    visible: { 
      rotate: 0, 
      scale: 1,
      transition: {
        type: "spring",
        damping: 12,
        stiffness: 100,
        delay: 0.4
      }
    }
  };

  const inputVariants = {
    hidden: { x: -30, opacity: 0 },
    visible: (i: number) => ({
      x: 0,
      opacity: 1,
      transition: {
        delay: 0.5 + (i * 0.1),
        type: "spring",
        damping: 15
      }
    })
  };

  const buttonVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: {
        delay: 0.9,
        type: "spring",
        damping: 15
      }
    },
    hover: {
      scale: 1.05,
      boxShadow: "0 10px 30px rgba(29, 78, 216, 0.3)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: {
      scale: 0.98
    }
  };

  const notificationVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        damping: 20
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3
      }
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-vh-100 d-flex align-items-center justify-content-center p-4"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}
      >
        <Container fluid className="px-3 px-md-4">
          <Row className="justify-content-center w-100">
            <Col xs={12} md={8} lg={6} xl={5}>
              <motion.div
                variants={cardVariants}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="p-4 p-md-5"
                style={{ 
                  background: 'white',
                  borderRadius: '1.5rem',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                  width: '100%',
                  maxWidth: '500px',
                  margin: '0 auto',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                {/* Header */}
                <motion.div 
                  className="text-center mb-5"
                  variants={itemVariants}
                >
                  <div className="d-flex justify-content-center align-items-center gap-3 mb-4">
                    <motion.div 
                      variants={logoVariants}
                      animate={{ 
                        rotate: [0, 360],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                        scale: { duration: 2, repeat: Infinity, repeatType: "reverse" }
                      }}
                      className="d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '48px', 
                        height: '48px', 
                        background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', 
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                      }}
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" style={{ width: '24px', height: '24px' }}>
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        <path d="M12 11l4 2-4 2-4-2 4-2z"></path>
                      </svg>
                    </motion.div>
                    <motion.span 
                      className="fs-2 fw-bold"
                      style={{ 
                        background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                      animate={{ 
                        backgroundPosition: ['0% 0%', '100% 100%'],
                      }}
                      transition={{ 
                        duration: 3,
                        repeat: Infinity,
                        repeatType: "reverse"
                      }}
                    >
                      JobConnect
                    </motion.span>
                  </div>
                  <motion.h1 
                    className="h2 fw-bold text-dark mb-3"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Welcome Back!
                  </motion.h1>
                  <p className="text-muted" style={{ fontSize: '1.05rem' }}>
                    Sign in to continue your journey
                  </p>
                </motion.div>

                {/* Dynamic Notification */}
                <AnimatePresence>
                  {notification.type && (
                    <motion.div
                      variants={notificationVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <Alert 
                        variant={notification.type} 
                        className="d-flex align-items-center border-0 shadow-sm mb-4 rounded-3"
                        style={{ 
                          backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444',
                          color: 'white'
                        }}
                      >
                        <motion.div 
                          className="rounded-circle d-flex align-items-center justify-content-center me-3"
                          style={{ width: '28px', height: '28px', backgroundColor: 'rgba(255, 255, 255, 0.3)' }}
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          {notification.type === 'success' ? (
                            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path clipRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" fillRule="evenodd"></path>
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"></path>
                            </svg>
                          )}
                        </motion.div>
                        <span className="fw-medium">{notification.message}</span>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Login Form */}
                <Form onSubmit={handleSubmit}>
                  {/* Email Input */}
                  <motion.div
                    custom={0}
                    variants={inputVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-medium text-dark">Email Address</Form.Label>
                      <div className="position-relative">
                        <motion.div 
                          className="position-absolute top-50 start-0 translate-middle-y ps-3"
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        >
                          <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" strokeLinecap="round" strokeLinejoin="round"></path>
                          </svg>
                        </motion.div>
                        <Form.Control
                          type="email"
                          name="email"
                          placeholder="Enter your email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="ps-5 py-3 border-1"
                          style={{ 
                            borderRadius: '12px',
                            borderColor: '#e5e7eb',
                            backgroundColor: '#f9fafb',
                            transition: 'all 0.3s ease'
                          }}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </Form.Group>
                  </motion.div>

                  {/* Password Input */}
                  <motion.div
                    custom={1}
                    variants={inputVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-medium text-dark">Password</Form.Label>
                      <div className="position-relative">
                        <motion.div 
                          className="position-absolute top-50 start-0 translate-middle-y ps-3"
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                        >
                          <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" strokeLinecap="round" strokeLinejoin="round"></path>
                          </svg>
                        </motion.div>
                        <Form.Control
                          type={showPassword ? "text" : "password"}
                          name="password"
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="ps-5 pe-5 py-3 border-1"
                          style={{ 
                            borderRadius: '12px',
                            borderColor: '#e5e7eb',
                            backgroundColor: '#f9fafb',
                            transition: 'all 0.3s ease'
                          }}
                          required
                          disabled={isLoading}
                        />
                        <motion.button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="btn btn-link position-absolute top-50 end-0 translate-middle-y pe-3"
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.9 }}
                          disabled={isLoading}
                        >
                          <motion.div
                            animate={{ rotate: showPassword ? 180 : 0 }}
                            transition={{ type: "spring", stiffness: 200 }}
                          >
                            <svg className="w-5 h-5 text-secondary" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              {showPassword ? (
                                <path d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round"></path>
                              ) : (
                                <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" strokeLinecap="round" strokeLinejoin="round"></path>
                              )}
                              <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                          </motion.div>
                        </motion.button>
                      </div>
                    </Form.Group>
                  </motion.div>

                  {/* Remember Me & Forgot Password */}
                  <motion.div
                    custom={2}
                    variants={inputVariants}
                    initial="hidden"
                    animate="visible"
                    className="d-flex justify-content-between align-items-center mb-4"
                  >
                    <Form.Check
                      type="checkbox"
                      id="remember-me"
                      label="Remember Me"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleInputChange}
                      className="text-muted"
                      disabled={isLoading}
                    />
                    <motion.button 
                      type="button"
                      className="text-decoration-none fw-medium border-0 bg-transparent p-0"
                      style={{ color: '#2563EB' }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleForgotPassword}
                      disabled={isLoading}
                    >
                      Forgot Password?
                    </motion.button>
                  </motion.div>

                  {/* Login Button */}
                  <motion.div
                    variants={buttonVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    <Button
                      as={motion.button}
                      type="submit"
                      className="w-100 py-3 fw-semibold border-0"
                      style={{ 
                        background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                        borderRadius: '12px',
                        fontSize: '1.1rem',
                        boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)',
                      }}
                      disabled={isLoading}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Logging in...
                        </>
                      ) : (
                        'Login'
                      )}
                    </Button>
                  </motion.div>
                </Form>

                {/* Sign Up Link */}
                <motion.p 
                  className="text-center mt-4 text-muted mb-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  Don't have an account?{' '}
                  <motion.a 
                    href="/register"
                    className="text-decoration-none fw-semibold"
                    style={{ color: '#2563EB' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Sign up
                    <svg className="ms-1" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                    </svg>
                  </motion.a>
                </motion.p>

                {/* Decorative Elements */}
                <motion.div
                  className="position-absolute top-0 end-0 me-4 mt-4"
                  animate={{ 
                    rotate: [0, 360],
                  }}
                  transition={{ 
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                >
                  <div className="rounded-circle" style={{ 
                    width: '20px', 
                    height: '20px', 
                    background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
                    opacity: 0.3
                  }}></div>
                </motion.div>

                <motion.div
                  className="position-absolute bottom-0 start-0 ms-4 mb-4"
                  animate={{ 
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <div className="rounded-circle" style={{ 
                    width: '15px', 
                    height: '15px', 
                    background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
                    opacity: 0.3
                  }}></div>
                </motion.div>
              </motion.div>
            </Col>
          </Row>

          {/* Footer Note */}
          <motion.div 
            className="text-center mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <small className="text-white opacity-75">
              © {new Date().getFullYear()} JobConnect. Your career journey starts here.
            </small>
          </motion.div>
        </Container>
      </motion.div>
    </>
  );
}