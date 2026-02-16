'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Badge, 
  Button,
  Alert,
  Spinner,
  Modal,
  Form,
  Pagination
} from 'react-bootstrap';
import { 
  FaMapMarkerAlt, 
  FaDollarSign, 
  FaClock,
  FaBuilding,
  FaBookmark,
  FaTrash,
  FaSearch,
  FaArrowLeft
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';

const API_BASE_URL = 'http://localhost:5000/api';

interface SavedJob {
  job: {
    _id: string;
    title: string;
    description: string;
    location: string;
    employmentType: string;
    type: string;
    salary: {
      min: number;
      max: number;
      currency: string;
      payPeriod: string;
      isNegotiable: boolean;
    };
    company: {
      _id: string;
      name: string;
      logo: string;
      description: string;
      location: string;
      website: string;
      industry: string;
      size: string;
      foundedYear: number;
      email: string;
      phone: string;
      socialLinks: any;
    };
    companyName: string;
    skills: string[];
    requirements: string[];
    responsibilities: string[];
    experience: {
      minYears: number;
      maxYears: number;
    };
    education: string;
    benefits: string[];
    tags: string[];
    isRemote: boolean;
    isUrgent: boolean;
    isFeatured: boolean;
    status: string;
    postedBy: {
      _id: string;
      name: string;
      email: string;
      profileImage: string;
    };
    createdAt: string;
    updatedAt: string;
    applicationDeadline: string;
    applicationsCount: number;
    views: number;
  };
  savedAt: string;
  _id: string;
}

export default function SavedJobsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingJobId, setRemovingJobId] = useState<string | null>(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<SavedJob | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const jobsPerPage = 10;
  
  // Filters
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'title'>('recent');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchSavedJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to view saved jobs');
        router.push('/login');
        return;
      }
      
      // Get current user
      const storedUser = localStorage.getItem('user');
      let currentUserId = '';
      
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          currentUserId = parsedUser._id;
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }
      
      // Use user from context if available
      if (user && user._id) {
        currentUserId = user._id;
      }
      
      if (!currentUserId) {
        toast.error('Please login to view saved jobs');
        router.push('/login');
        return;
      }
      
      // Fetch saved jobs
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: jobsPerPage.toString(),
        sort: sortBy,
        filter: filterStatus,
        ...(searchQuery && { search: searchQuery })
      });
      
      const response = await fetch(
        `${API_BASE_URL}/auth/${currentUserId}/saved-jobs?${params}`,
        { headers }
      );
      
      if (response.status === 401 || response.status === 403) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch saved jobs');
      }
      
      const data = await response.json();
      console.log('Saved jobs data:', data);
      
      setSavedJobs(data.savedJobs || []);
      setTotalPages(data.totalPages || 1);
      setTotalJobs(data.totalJobs || 0);
      
    } catch (error: any) {
      console.error('Error fetching saved jobs:', error);
      
      if (error.message?.includes('not found') || error.message?.includes('no saved')) {
        setSavedJobs([]);
        setTotalJobs(0);
        setTotalPages(1);
        toast.info('No saved jobs found. Start bookmarking jobs you\'re interested in!');
      } else {
        setError(error.message || 'Failed to load saved jobs');
        toast.error(error.message || 'Failed to load saved jobs');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchSavedJobs();
    }
  }, [authLoading, currentPage, sortBy, filterStatus, searchQuery]);

  const handleRemoveSavedJob = async (jobId: string) => {
    try {
      setRemovingJobId(jobId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to continue');
        router.push('/login');
        return;
      }
      
      console.log('Removing saved job:', jobId);
      
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/bookmark`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Remove response status:', response.status);
      
      const responseText = await response.text();
      console.log('Remove response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Invalid response from server');
      }
      
      if (response.status === 401 || response.status === 403) {
        toast.error('Session expired. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
        return;
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove saved job');
      }
      
      // Remove from local state
      setSavedJobs(prev => prev.filter(item => item.job._id !== jobId));
      setTotalJobs(prev => prev - 1);
      toast.success(data.message || 'Job removed from saved jobs', {
        duration: 3000,
        position: 'top-right',
        icon: '🗑️',
        style: {
          background: '#ef4444',
          color: 'white',
        },
      });
      setShowRemoveModal(false);
      setSelectedJob(null);
      
      // Refresh the list
      await fetchSavedJobs();
      
    } catch (error: any) {
      console.error('Error removing saved job:', error);
      toast.error(error.message || 'Failed to remove saved job');
    } finally {
      setRemovingJobId(null);
    }
  };

  const formatSalary = (salary: any) => {
    if (!salary) return 'Salary not disclosed';
    
    if (typeof salary === 'string') {
      return salary;
    }
    
    if (salary && typeof salary === 'object') {
      const min = salary.min || 0;
      const max = salary.max || 0;
      const currency = salary.currency || 'USD';
      const period = salary.payPeriod || 'yearly';
      
      const formatNumber = (num: number) => {
        return num.toLocaleString('en-US');
      };
      
      const periodMap: Record<string, string> = {
        'hourly': '/hr',
        'daily': '/day',
        'weekly': '/week',
        'monthly': '/month',
        'yearly': '/year'
      };
      
      const periodText = periodMap[period] || '';
      
      if (min === max) {
        return `$${formatNumber(min)}${periodText}`;
      }
      
      return `$${formatNumber(min)} - $${formatNumber(max)}${periodText}`;
    }
    
    return 'Salary not disclosed';
  };

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getImageUrl = (imagePath: string | undefined | null): string => {
    if (!imagePath || imagePath.trim() === '') {
      return '';
    }
    
    if (imagePath.startsWith('http://') || 
        imagePath.startsWith('https://') || 
        imagePath.startsWith('data:')) {
      return imagePath;
    }
    
    const normalizedPath = imagePath.replace(/\\/g, '/');
    
    if (normalizedPath.startsWith('uploads/')) {
      return `${API_BASE_URL.replace('/api', '')}/${normalizedPath}`;
    }
    
    if (!normalizedPath.includes('/')) {
      return `${API_BASE_URL.replace('/api', '')}/uploads/${normalizedPath}`;
    }
    
    return `${API_BASE_URL.replace('/api', '')}/${normalizedPath}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSortBy('recent');
    setFilterStatus('all');
    setCurrentPage(1);
  };

  const navigateBack = () => {
    router.push(`/profile/${user?._id || ''}`);
  };

  // Show loading states
  if (authLoading || loading) {
    return (
      <Container className="py-5">
        <div className="min-vh-50 d-flex flex-column align-items-center justify-content-center">
          <Spinner animation="border" variant="primary" size="lg" />
          <span className="mt-3">Loading saved jobs...</span>
        </div>
      </Container>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <Alert.Heading>Authentication Required</Alert.Heading>
          <p>Please login to view saved jobs.</p>
          <Button variant="primary" onClick={() => router.push('/login')}>
            Login Now
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            style: {
              background: '#10b981',
            },
          },
          error: {
            duration: 4000,
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      
      {/* Remove Confirmation Modal */}
      <Modal show={showRemoveModal} onHide={() => setShowRemoveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Remove Saved Job</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to remove this job from your saved list?
          {selectedJob && (
            <div className="mt-3 p-3 bg-light rounded">
              <strong>{selectedJob.job.title}</strong>
              <br />
              <small className="text-muted">{selectedJob.job.company.name}</small>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRemoveModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={() => selectedJob && handleRemoveSavedJob(selectedJob.job._id)}
            disabled={removingJobId === selectedJob?.job._id}
          >
            {removingJobId === selectedJob?.job._id ? 'Removing...' : 'Remove'}
          </Button>
        </Modal.Footer>
      </Modal>

      <Container className="py-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Back Button */}
          <Button 
            variant="outline-secondary" 
            className="mb-4 d-flex align-items-center"
            onClick={navigateBack}
          >
            <FaArrowLeft className="me-2" />
            Back to Profile
          </Button>

          {/* Error Display */}
          {error && (
            <Alert variant="danger" className="mb-4">
              <Alert.Heading>Error</Alert.Heading>
              <p>{error}</p>
              <Button variant="outline-danger" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </Alert>
          )}

          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="display-6 fw-bold mb-2">Saved Jobs</h1>
              <p className="text-muted mb-0">
                {totalJobs} {totalJobs === 1 ? 'job' : 'jobs'} saved
              </p>
            </div>
            <Button 
              variant="outline-primary"
              onClick={() => router.push('/jobs')}
            >
              <FaSearch className="me-2" />
              Browse More Jobs
            </Button>
          </div>

          {/* Filters & Search */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <Form onSubmit={handleSearch}>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group controlId="searchQuery">
                      <Form.Label>Search Saved Jobs</Form.Label>
                      <div className="input-group">
                        <Form.Control
                          type="text"
                          placeholder="Search by job title, company, or skills..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Button variant="primary" type="submit">
                          <FaSearch />
                        </Button>
                      </div>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group controlId="sortBy">
                      <Form.Label>Sort By</Form.Label>
                      <Form.Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                      >
                        <option value="recent">Recently Saved</option>
                        <option value="oldest">Oldest Saved</option>
                        <option value="title">Job Title (A-Z)</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group controlId="filterStatus">
                      <Form.Label>Job Status</Form.Label>
                      <Form.Select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active Jobs</option>
                        <option value="closed">Closed Jobs</option>
                        <option value="expired">Expired Jobs</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                {(searchQuery || sortBy !== 'recent' || filterStatus !== 'all') && (
                  <div className="mt-3">
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </Form>
            </Card.Body>
          </Card>

          {savedJobs.length === 0 ? (
            <Card className="border-0 shadow-sm text-center py-5">
              <Card.Body>
                <div className="mb-4">
                  <FaBookmark size={64} className="text-muted" />
                </div>
                <h4 className="fw-bold mb-3">No saved jobs yet</h4>
                <p className="text-muted mb-4">
                  {searchQuery || filterStatus !== 'all' 
                    ? 'No jobs match your search criteria'
                    : 'Start saving jobs you are interested in by clicking the bookmark icon on job listings.'}
                </p>
                <div className="d-flex justify-content-center gap-3">
                  <Button 
                    variant="primary" 
                    onClick={() => router.push('/jobs')}
                  >
                    Browse Jobs
                  </Button>
                  {(searchQuery || filterStatus !== 'all') && (
                    <Button 
                      variant="outline-primary" 
                      onClick={handleClearFilters}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </Card.Body>
            </Card>
          ) : (
            <>
              {/* Saved Jobs List */}
              <Row className="g-4">
                {savedJobs.map((savedJob) => {
                  const job = savedJob.job;
                  const isExpired = job.applicationDeadline && 
                    new Date(job.applicationDeadline) < new Date();
                  
                  return (
                    <Col key={savedJob._id} xs={12}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="border-0 shadow-sm hover-lift">
                          <Card.Body className="p-4">
                            <Row>
                              <Col md={2}>
                                <div 
                                  className="rounded-circle d-flex align-items-center justify-content-center mb-3 mb-md-0 mx-auto"
                                  style={{ 
                                    width: '80px', 
                                    height: '80px',
                                    backgroundColor: '#f8f9fa',
                                    overflow: 'hidden',
                                    flexShrink: 0
                                  }}
                                >
                                  {job.company.logo ? (
                                    <img
                                      src={getImageUrl(job.company.logo)}
                                      alt={job.company.name}
                                      className="rounded-circle object-fit-cover"
                                      style={{ width: '100%', height: '100%' }}
                                    />
                                  ) : (
                                    <FaBuilding className="text-primary" size={32} />
                                  )}
                                </div>
                              </Col>
                              
                              <Col md={8}>
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div>
                                    <h5 className="fw-bold mb-1">{job.title}</h5>
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                      <span className="text-muted">
                                        <FaBuilding className="me-1" />
                                        {job.company.name}
                                      </span>
                                      <span className="text-muted">
                                        <FaMapMarkerAlt className="me-1" />
                                        {job.isRemote ? 'Remote' : job.location}
                                      </span>
                                      <span className="text-muted">
                                        <FaClock className="me-1" />
                                        {getDaysAgo(savedJob.savedAt)}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Badge bg={
                                      job.status === 'active' ? 'success' :
                                      job.status === 'closed' ? 'danger' :
                                      job.status === 'draft' ? 'warning' : 'secondary'
                                    }>
                                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                    </Badge>
                                    {isExpired && (
                                      <Badge bg="danger" className="ms-1">
                                        Expired
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="d-flex flex-wrap gap-2 mb-3">
                                  <Badge bg="light" text="dark">
                                    <FaDollarSign className="me-1" />
                                    {formatSalary(job.salary)}
                                  </Badge>
                                  <Badge bg="light" text="dark">
                                    {job.employmentType}
                                  </Badge>
                                  {job.isRemote && (
                                    <Badge bg="light" text="dark">
                                      Remote
                                    </Badge>
                                  )}
                                  {job.isUrgent && (
                                    <Badge bg="danger">
                                      Urgent
                                    </Badge>
                                  )}
                                </div>
                                
                                <p className="text-muted mb-0">
                                  {job.description.substring(0, 200)}...
                                </p>
                              </Col>
                              
                              <Col md={2} className="d-flex flex-column justify-content-between">
                                <div className="d-flex flex-column gap-2">
                                  <Button 
                                    variant="primary" 
                                    size="sm"
                                    onClick={() => router.push(`/jobs/${job._id}`)}
                                    disabled={isExpired || job.status !== 'active'}
                                  >
                                    {isExpired || job.status !== 'active' ? 'Closed' : 'Apply Now'}
                                  </Button>
                                  
                                  <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedJob(savedJob);
                                      setShowRemoveModal(true);
                                    }}
                                    disabled={removingJobId === job._id}
                                  >
                                    <FaTrash className="me-2" />
                                    {removingJobId === job._id ? 'Removing...' : 'Remove'}
                                  </Button>
                                  
                                  <Button 
                                    variant="outline-secondary" 
                                    size="sm"
                                    onClick={() => router.push(`/jobs/${job._id}`)}
                                  >
                                    View Details
                                  </Button>
                                </div>
                              </Col>
                            </Row>
                          </Card.Body>
                        </Card>
                      </motion.div>
                    </Col>
                  );
                })}
              </Row>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-5">
                  <Pagination>
                    <Pagination.Prev 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    />
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Pagination.Item 
                          key={pageNum}
                          active={pageNum === currentPage}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Pagination.Item>
                      );
                    })}
                    
                    <Pagination.Next 
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </motion.div>
      </Container>

      <style jsx>{`
        .hover-lift {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
        }
        .object-fit-cover {
          object-fit: cover;
        }
      `}</style>
    </>
  );
}