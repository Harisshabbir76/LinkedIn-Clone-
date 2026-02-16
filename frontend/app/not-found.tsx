// app/not-found.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { 
  FaHome, 
  FaBuilding, 
  FaSearch, 
  FaExclamationTriangle,
  FaArrowLeft
} from 'react-icons/fa';
import { motion } from 'framer-motion';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" 
         style={{
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
           color: 'white'
         }}>
      <Container>
        <Row className="justify-content-center">
          <Col lg={8} className="text-center">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Animated Icon */}
              <div className="mb-4">
                <motion.div
                  animate={{ 
                    rotate: [0, 10, -10, 10, 0],
                    scale: [1, 1.1, 1.1, 1.1, 1]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                  className="d-inline-block"
                >
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center mb-3"
                    style={{
                      width: '120px',
                      height: '120px',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      border: '4px solid rgba(255, 255, 255, 0.3)',
                      margin: '0 auto'
                    }}
                  >
                    <FaExclamationTriangle 
                      size={48} 
                      className="text-white"
                    />
                  </div>
                </motion.div>
              </div>

              {/* 404 Text */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <h1 
                  className="display-1 fw-bold mb-3"
                  style={{
                    textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
                    background: 'linear-gradient(45deg, #ffffff, #e6e6e6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  404
                </h1>
              </motion.div>

              {/* Message */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <h2 className="h3 fw-bold mb-3" style={{ color: '#f8f9fa' }}>
                  Page Not Found
                </h2>
                <p className="lead mb-4" style={{ color: '#e9ecef' }}>
                  Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>
              </motion.div>

              {/* Action Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                <Row className="g-4 mb-4">
                  <Col md={4}>
                    <Card 
                      className="border-0 shadow-lg h-100 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => router.push('/')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }}
                    >
                      <Card.Body className="text-center p-4 d-flex flex-column align-items-center">
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center mb-3"
                          style={{
                            width: '60px',
                            height: '60px',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          <FaHome size={24} className="text-white" />
                        </div>
                        <Card.Title className="h5 fw-bold mb-2 text-white">
                          Go Home
                        </Card.Title>
                        <Card.Text className="small text-white-50">
                          Return to the main dashboard
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={4}>
                    <Card 
                      className="border-0 shadow-lg h-100 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => router.push('/companies')}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }}
                    >
                      <Card.Body className="text-center p-4 d-flex flex-column align-items-center">
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center mb-3"
                          style={{
                            width: '60px',
                            height: '60px',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          <FaBuilding size={24} className="text-white" />
                        </div>
                        <Card.Title className="h5 fw-bold mb-2 text-white">
                          Browse Companies
                        </Card.Title>
                        <Card.Text className="small text-white-50">
                          Explore all registered companies
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={4}>
                    <Card 
                      className="border-0 shadow-lg h-100 cursor-pointer"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => router.back()}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }}
                    >
                      <Card.Body className="text-center p-4 d-flex flex-column align-items-center">
                        <div 
                          className="rounded-circle d-flex align-items-center justify-content-center mb-3"
                          style={{
                            width: '60px',
                            height: '60px',
                            backgroundColor: 'rgba(255, 255, 255, 0.2)'
                          }}
                        >
                          <FaArrowLeft size={24} className="text-white" />
                        </div>
                        <Card.Title className="h5 fw-bold mb-2 text-white">
                          Go Back
                        </Card.Title>
                        <Card.Text className="small text-white-50">
                          Return to the previous page
                        </Card.Text>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="d-flex flex-wrap gap-3 justify-content-center"
              >
                <Button
                  variant="light"
                  size="lg"
                  className="rounded-pill px-4 d-flex align-items-center"
                  onClick={() => router.push('/')}
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    color: '#667eea',
                    fontWeight: '600'
                  }}
                >
                  <FaHome className="me-2" />
                  Home Page
                </Button>

                <Button
                  variant="outline-light"
                  size="lg"
                  className="rounded-pill px-4 d-flex align-items-center"
                  onClick={() => router.push('/companies')}
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    color: 'white'
                  }}
                >
                  <FaBuilding className="me-2" />
                  Browse Companies
                </Button>

                <Button
                  variant="outline-light"
                  size="lg"
                  className="rounded-pill px-4 d-flex align-items-center"
                  onClick={() => router.back()}
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    color: 'white'
                  }}
                >
                  <FaArrowLeft className="me-2" />
                  Go Back
                </Button>
              </motion.div>

              {/* Additional Help */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="mt-5 pt-4"
                style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <p className="small text-white-50 mb-2">
                  Need help? Here are some things you can try:
                </p>
                <div className="d-flex flex-wrap justify-content-center gap-3 small">
                  <span 
                    className="badge rounded-pill px-3 py-2"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: '#e9ecef'
                    }}
                  >
                    Check the URL for typos
                  </span>
                  <span 
                    className="badge rounded-pill px-3 py-2"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: '#e9ecef'
                    }}
                  >
                    Use the search function
                  </span>
                  <span 
                    className="badge rounded-pill px-3 py-2"
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: '#e9ecef'
                    }}
                  >
                    Contact support
                  </span>
                </div>
              </motion.div>
            </motion.div>
          </Col>
        </Row>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="text-center mt-5 pt-5"
        >
          <p className="small text-white-50 mb-0">
            &copy; {new Date().getFullYear()} Company Platform. All rights reserved.
          </p>
          <p className="small text-white-50">
            Error Code: 404 | Page Not Found
          </p>
        </motion.div>
      </Container>

      {/* Background Pattern */}
      <div 
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ 
          opacity: 0.1,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          pointerEvents: 'none'
        }}
      />

      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}