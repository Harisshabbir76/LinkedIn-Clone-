'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Spinner,
  Badge
} from 'react-bootstrap';
import {
  FaEnvelope,
  FaClock,
  FaPaperPlane,
  FaCheckCircle,
  FaComments,
  FaUser,
  FaUserTag,
  FaQuestionCircle,
  FaHeadset,
  FaStar,
  FaShieldAlt,
  FaHandshake
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:5000/api';

export default function ContactPage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    
    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    try {
      setLoading(true);
      setSuccess(false);
      
      const response = await fetch(`${API_BASE_URL}/contact-us`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          category: 'Other' // Default category
        })
      });
      
      if (response.ok) {
        setSuccess(true);
        setFormData({
          name: '',
          email: '',
          subject: '',
          message: ''
        });
        
        toast.success('Message sent successfully! We\'ll get back to you soon.', {
          duration: 5000,
          position: 'top-right',
          icon: '✅',
          style: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 20px rgba(102, 126, 234, 0.2)',
          },
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Error sending contact form:', error);
      toast.error(error.message || 'Failed to send message. Please try again.', {
        duration: 4000,
        position: 'top-right',
        icon: '❌',
        style: {
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 20px rgba(240, 147, 251, 0.2)',
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const commonSubjects = [
    'Account Help',
    'Technical Support',
    'Feedback & Suggestions',
    'Report a Bug',
    'Feature Request',
    'Privacy Concerns',
    'Partnership Inquiry',
    'Other'
  ];

  const contactInfo = [
    {
      icon: <FaClock className="text-warning" size={28} />,
      title: 'Support Hours',
      details: ['Monday - Friday: 9AM - 6PM', 'Saturday: 10AM - 2PM'],
      description: 'Based on your local timezone',
      gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
      iconBg: 'bg-warning bg-opacity-15'
    }
  ];

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
      
      <Container className="py-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header Section with Gradient */}
          <div className="text-center mb-5">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-4"
            >
              <div className="position-relative d-inline-block">
                <div 
                  className="contact-header-icon p-4 rounded-circle shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  }}
                >
                  <FaHeadset className="text-white" size={48} />
                </div>
                <Badge 
                  bg="primary" 
                  pill 
                  className="position-absolute top-0 end-0 mt-2 me-2 px-3 py-2 shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    border: 'none',
                  }}
                >
                  <FaStar className="me-1" /> 24/7 Support
                </Badge>
              </div>
            </motion.div>
            
            <motion.h1 
              className="display-5 fw-bold mb-3 gradient-text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Contact Us
            </motion.h1>
            
            <motion.p 
              className="lead text-muted mb-4 mx-auto max-width-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              We're here to help! Get in touch with our support team for any questions or concerns.
            </motion.p>
          </div>

          <Row className="g-4">
            {/* Contact Form Column */}
            <Col lg={8}>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Card className="border-0 shadow-lg contact-form-card">
                  <Card.Body className="p-4 p-md-5">
                    <div className="d-flex align-items-center mb-4">
                      <div className="contact-form-icon me-3">
                        <FaComments className="text-white" size={24} />
                      </div>
                      <Card.Title className="h3 fw-bold mb-0">
                        Send us a Message
                      </Card.Title>
                    </div>
                    
                    {success && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                      >
                        <Alert 
                          variant="success" 
                          className="mb-4 border-0 shadow-sm"
                          style={{
                            background: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)',
                            color: '#0f5132',
                            border: 'none',
                          }}
                        >
                          <div className="d-flex align-items-center">
                            <FaCheckCircle className="me-3" size={24} />
                            <div>
                              <strong>Thank you for contacting us!</strong> We've received your message and will get back to you as soon as possible.
                            </div>
                          </div>
                        </Alert>
                      </motion.div>
                    )}
                    
                    <Form onSubmit={handleSubmit}>
                      <Row className="g-4">
                        <Col md={6}>
                          <Form.Group controlId="name" className="mb-4">
                            <Form.Label className="fw-semibold mb-2">
                              <FaUser className="me-2 text-primary" />
                              Full Name *
                            </Form.Label>
                            <Form.Control
                              type="text"
                              name="name"
                              placeholder="Enter your full name"
                              value={formData.name}
                              onChange={handleChange}
                              isInvalid={!!errors.name}
                              disabled={loading}
                              className="py-3 px-4 form-control-lg border-2"
                              style={{
                                borderRadius: '12px',
                                borderColor: errors.name ? '#dc3545' : '#e9ecef',
                                transition: 'all 0.3s ease',
                              }}
                            />
                            {errors.name && (
                              <div className="text-danger small mt-2">
                                {errors.name}
                              </div>
                            )}
                          </Form.Group>
                        </Col>
                        
                        <Col md={6}>
                          <Form.Group controlId="email" className="mb-4">
                            <Form.Label className="fw-semibold mb-2">
                              <FaEnvelope className="me-2 text-primary" />
                              Email Address *
                            </Form.Label>
                            <Form.Control
                              type="email"
                              name="email"
                              placeholder="Enter your email"
                              value={formData.email}
                              onChange={handleChange}
                              isInvalid={!!errors.email}
                              disabled={loading}
                              className="py-3 px-4 form-control-lg border-2"
                              style={{
                                borderRadius: '12px',
                                borderColor: errors.email ? '#dc3545' : '#e9ecef',
                                transition: 'all 0.3s ease',
                              }}
                            />
                            {errors.email && (
                              <div className="text-danger small mt-2">
                                {errors.email}
                              </div>
                            )}
                          </Form.Group>
                        </Col>
                        
                        <Col md={12}>
                          <Form.Group controlId="subject" className="mb-4">
                            <Form.Label className="fw-semibold mb-2">
                              <FaUserTag className="me-2 text-primary" />
                              Subject *
                            </Form.Label>
                            <Form.Select
                              name="subject"
                              value={formData.subject}
                              onChange={handleChange}
                              isInvalid={!!errors.subject}
                              disabled={loading}
                              className="py-3 px-4 form-select-lg border-2"
                              style={{
                                borderRadius: '12px',
                                borderColor: errors.subject ? '#dc3545' : '#e9ecef',
                                transition: 'all 0.3s ease',
                              }}
                            >
                              <option value="">Select a subject</option>
                              {commonSubjects.map((subject, index) => (
                                <option key={index} value={subject}>
                                  {subject}
                                </option>
                              ))}
                            </Form.Select>
                            {errors.subject && (
                              <div className="text-danger small mt-2">
                                {errors.subject}
                              </div>
                            )}
                          </Form.Group>
                        </Col>
                        
                        <Col md={12}>
                          <Form.Group controlId="message" className="mb-4">
                            <Form.Label className="fw-semibold mb-2">
                              <FaQuestionCircle className="me-2 text-primary" />
                              Message *
                            </Form.Label>
                            <Form.Control
                              as="textarea"
                              name="message"
                              rows={6}
                              placeholder="Please describe your issue or question in detail..."
                              value={formData.message}
                              onChange={handleChange}
                              isInvalid={!!errors.message}
                              disabled={loading}
                              className="py-3 px-4 form-control-lg border-2"
                              style={{
                                borderRadius: '12px',
                                borderColor: errors.message ? '#dc3545' : '#e9ecef',
                                transition: 'all 0.3s ease',
                                resize: 'vertical',
                              }}
                            />
                            {errors.message && (
                              <div className="text-danger small mt-2">
                                {errors.message}
                              </div>
                            )}
                            <Form.Text className="text-muted mt-2 d-block">
                              Please provide as much detail as possible so we can help you better.
                            </Form.Text>
                          </Form.Group>
                        </Col>
                        
                        <Col md={12}>
                          <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                            <div className="text-muted small">
                              * Required fields
                            </div>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                variant="primary"
                                type="submit"
                                disabled={loading}
                                className="px-5 py-3 btn-lg shadow-sm"
                                style={{
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  border: 'none',
                                  borderRadius: '12px',
                                  fontWeight: '600',
                                  letterSpacing: '0.5px',
                                  transition: 'all 0.3s ease',
                                }}
                              >
                                {loading ? (
                                  <>
                                    <Spinner
                                      as="span"
                                      animation="border"
                                      size="sm"
                                      role="status"
                                      aria-hidden="true"
                                      className="me-2"
                                    />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <FaPaperPlane className="me-2" />
                                    Send Message
                                  </>
                                )}
                              </Button>
                            </motion.div>
                          </div>
                        </Col>
                      </Row>
                    </Form>
                  </Card.Body>
                </Card>
              </motion.div>
            </Col>

            {/* Contact Information Column */}
            <Col lg={4}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="sticky-top"
                style={{ top: '20px' }}
              >
                <Card className="border-0 shadow-lg mb-4 info-card">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-4">
                      <div className="info-card-icon me-3">
                        <FaEnvelope className="text-white" size={24} />
                      </div>
                      <Card.Title className="h4 fw-bold mb-0">
                        Contact Information
                      </Card.Title>
                    </div>
                    
                    {contactInfo.map((info, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + index * 0.1, duration: 0.3 }}
                      >
                        <div className="mb-4 pb-3 border-bottom">
                          <div className="d-flex align-items-start">
                            <div 
                              className={`rounded-circle p-3 me-3 ${info.iconBg}`}
                              style={{
                                background: info.gradient,
                                width: '60px',
                                height: '60px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {info.icon}
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="fw-bold mb-2" style={{ color: '#333' }}>
                                {info.title}
                              </h6>
                              {info.details.map((detail, idx) => (
                                <p key={idx} className="mb-1 text-muted" style={{ fontSize: '0.9rem' }}>
                                  {detail}
                                </p>
                              ))}
                              <small className="text-muted d-block mt-2" style={{ fontSize: '0.85rem' }}>
                                {info.description}
                              </small>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.9, duration: 0.5 }}
                      className="mt-3"
                    >
                      <Alert 
                        variant="light" 
                        className="border-0 shadow-sm"
                        style={{
                          background: 'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)',
                          borderRadius: '12px',
                          border: 'none',
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <FaShieldAlt className="me-3 text-success" size={20} />
                          <div>
                            <small className="fw-semibold d-block" style={{ color: '#333' }}>
                              Secure & Confidential
                            </small>
                            <small className="text-muted">
                              Your information is protected with 256-bit encryption
                            </small>
                          </div>
                        </div>
                      </Alert>
                    </motion.div>
                  </Card.Body>
                </Card>

                {/* Response Time Info Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0, duration: 0.5 }}
                >
                  <Card className="border-0 shadow-lg response-time-card">
                    <Card.Body className="p-4 text-center">
                      <div className="mb-4">
                        <div 
                          className="response-time-icon mx-auto mb-3"
                          style={{
                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 25px rgba(79, 172, 254, 0.3)',
                          }}
                        >
                          <FaClock className="text-white" size={32} />
                        </div>
                        <h5 className="fw-bold mb-2 gradient-text">Response Time</h5>
                        <p className="text-muted mb-0" style={{ fontSize: '0.95rem' }}>
                          We strive to respond to all inquiries within <strong className="text-primary">24-48 hours</strong> during business days.
                        </p>
                      </div>
                      
                      <Badge 
                        bg="light" 
                        text="dark" 
                        className="px-3 py-2 mt-2 border"
                        style={{
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: '500',
                        }}
                      >
                        <FaHandshake className="me-2 text-primary" />
                        Committed to Quality Support
                      </Badge>
                    </Card.Body>
                  </Card>
                </motion.div>
              </motion.div>
            </Col>
          </Row>

          {/* Additional Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            className="mt-5"
          >
            <Card className="border-0 shadow-lg additional-info-card">
              <Card.Body className="p-4 p-md-5">
                <Row className="align-items-center">
                  <Col md={8}>
                    <h5 className="fw-bold mb-2 gradient-text">
                      Can't find what you're looking for?
                    </h5>
                    <p className="text-muted mb-0" style={{ fontSize: '1.05rem' }}>
                      Our support team is always ready to help you with any questions or concerns about our job portal platform.
                    </p>
                  </Col>
                  <Col md={4} className="text-md-end mt-3 mt-md-0">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Badge 
                        bg="light" 
                        text="dark" 
                        className="px-4 py-3 border"
                        style={{
                          background: 'linear-gradient(135deg, #fdfcfb 0%, #e2d1c3 100%)',
                          borderRadius: '12px',
                          fontSize: '0.95rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <FaQuestionCircle className="me-2 text-primary" />
                        Need Immediate Help?
                      </Badge>
                    </motion.div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </motion.div>
        </motion.div>
      </Container>

      <style jsx global>{`
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .contact-form-card {
          border-radius: 20px !important;
          overflow: hidden;
          background: #ffffff;
        }
        
        .contact-form-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .info-card {
          border-radius: 20px !important;
          background: #ffffff;
        }
        
        .info-card-icon {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        
        .response-time-card {
          border-radius: 20px !important;
          background: #ffffff;
        }
        
        .additional-info-card {
          border-radius: 20px !important;
          background: linear-gradient(135deg, #fdfcfb 0%, #f5f7fa 100%);
          border: none;
        }
        
        .contact-header-icon {
          width: 100px;
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .max-width-600 {
          max-width: 600px;
        }
        
        .form-control-lg:focus, .form-select-lg:focus {
          border-color: #667eea !important;
          box-shadow: 0 0 0 0.25rem rgba(102, 126, 234, 0.25) !important;
        }
        
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3) !important;
        }
        
        .btn-primary:disabled {
          opacity: 0.7;
          transform: none !important;
          box-shadow: none !important;
        }
        
        .border-2 {
          border-width: 2px !important;
        }
        
        @media (max-width: 768px) {
          .contact-header-icon {
            width: 80px;
            height: 80px;
          }
          
          .contact-header-icon svg {
            width: 36px;
            height: 36px;
          }
          
          .display-5 {
            font-size: 2.5rem;
          }
          
          .lead {
            font-size: 1.1rem;
          }
        }
        
        ::placeholder {
          color: #adb5bd !important;
          opacity: 0.8;
        }
        
        textarea {
          min-height: 150px;
        }
        
        .form-control-lg, .form-select-lg {
          font-size: 1rem !important;
        }
        
        .text-muted {
          color: #6c757d !important;
        }
        
        .text-primary {
          color: #667eea !important;
        }
        
        .text-success {
          color: #28a745 !important;
        }
        
        .text-warning {
          color: #ffc107 !important;
        }
        
        .text-danger {
          color: #dc3545 !important;
        }
        
        .bg-warning {
          background-color: #ffc107 !important;
        }
        
        .bg-primary {
          background-color: #667eea !important;
        }
      `}</style>
    </>
  );
}