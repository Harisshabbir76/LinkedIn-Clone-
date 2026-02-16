// app/company/[id]/jobs/[jobId]/page.tsx
'use client';

import { useState, useEffect, use } from 'react'; // Import 'use' from React
import { useParams, useRouter } from 'next/navigation';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Badge, 
  Button,
  ListGroup,
  Alert,
  Spinner,
  Modal,
  Form
} from 'react-bootstrap';
import { 
  FaMapMarkerAlt, 
  FaDollarSign, 
  FaClock, 
  FaCalendarAlt,
  FaGraduationCap,
  FaBriefcase,
  FaUsers,
  FaBuilding,
  FaArrowLeft,
  FaShareAlt,
  FaBookmark,
  FaRegBookmark,
  FaExternalLinkAlt,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaCheckCircle,
  FaExclamationCircle,
  FaUserFriends,
  FaChartLine,
  FaFileAlt,
  FaLightbulb,
  FaHandshake
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../../../../context/AuthContext';

const API_BASE_URL = 'http://localhost:5000/api';

interface Job {
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
}

interface Company {
  _id: string;
  name: string;
  logo: string;
  industry: string;
  location: string;
  size: string;
  description: string;
}

interface PageProps {
  params: Promise<{ id: string; jobId: string }>; // params is a Promise
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default function JobDetailsPage({ params }: PageProps) {
  // Unwrap the params Promise using React.use()
  const unwrappedParams = use(params);
  const { id: companyId, jobId } = unwrappedParams;
  
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [similarJobs, setSimilarJobs] = useState<any[]>([]);
  const [similarJobsLoading, setSimilarJobsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      fetchJobDetails();
      if (isAuthenticated) {
        checkUserActions();
      }
    }
  }, [companyId, jobId, isAuthenticated, authLoading]);

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

  const fetchJobDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      console.log('Fetching job:', jobId);
      
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        headers
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Job not found');
        }
        throw new Error('Failed to fetch job details');
      }
      
      const data = await response.json();
      console.log('Job data received:', data);
      setJob(data.job);
      setCompany(data.job.company);
      
      // Fetch similar jobs
      fetchSimilarJobs(data.job);
      
    } catch (error: any) {
      console.error('Error fetching job:', error);
      setError(error.message || 'Failed to load job details');
      toast.error(error.message || 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilarJobs = async (currentJob: Job) => {
    try {
      setSimilarJobsLoading(true);
      
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(
        `${API_BASE_URL}/jobs?search=${encodeURIComponent(currentJob.title)}&limit=4`,
        { headers }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Filter out current job and jobs from same company
        const filteredJobs = data.jobs.filter((job: any) => 
          job._id !== currentJob._id && job.company._id !== currentJob.company._id
        );
        setSimilarJobs(filteredJobs.slice(0, 3));
      }
    } catch (error) {
      console.error('Error fetching similar jobs:', error);
    } finally {
      setSimilarJobsLoading(false);
    }
  };

  const checkUserActions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const [bookmarkResponse, applicationResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/jobs/${jobId}/bookmark/check`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/jobs/${jobId}/application/check`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (bookmarkResponse.ok) {
        const data = await bookmarkResponse.json();
        setIsBookmarked(data.isBookmarked);
      }
      
      if (applicationResponse.ok) {
        const data = await applicationResponse.json();
        setHasApplied(data.hasApplied);
      }
    } catch (error) {
      console.error('Error checking user actions:', error);
    }
  };

  const handleBookmark = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to bookmark jobs');
      router.push(`/login?redirect=/company/${companyId}/jobs/${jobId}`);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/bookmark`, {
        method: isBookmarked ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setIsBookmarked(!isBookmarked);
        toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
      }
    } catch (error) {
      console.error('Error bookmarking job:', error);
      toast.error('Failed to update bookmark');
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: job?.title,
        text: `Check out this job: ${job?.title} at ${job?.company.name}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleApply = () => {
    if (!isAuthenticated) {
      toast.error('Please login to apply for this job');
      router.push(`/login?redirect=/company/${companyId}/jobs/${jobId}`);
      return;
    }
    
    if (hasApplied) {
      toast.error('You have already applied for this job');
      return;
    }
    
    setShowApplyModal(true);
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

  const getExperienceText = (experience: any) => {
    if (!experience) return 'Not specified';
    
    const min = experience.minYears || 0;
    const max = experience.maxYears || 0;
    
    if (max === 0 || max === min) {
      return `${min}+ years`;
    }
    
    return `${min} - ${max} years`;
  };

  const isJobExpired = () => {
    if (!job?.applicationDeadline) return false;
    const deadline = new Date(job.applicationDeadline);
    const now = new Date();
    return now > deadline;
  };

  const getSizeLabel = (size: string) => {
    const labels: Record<string, string> = {
      '1-10': '1-10 employees',
      '11-50': '11-50 employees',
      '51-200': '51-200 employees',
      '201-500': '201-500 employees',
      '501-1000': '501-1,000 employees',
      '1000+': '1,000+ employees'
    };
    return labels[size] || size;
  };

  const renderSimilarJobs = () => {
    if (similarJobsLoading) {
      return (
        <div className="text-center py-4">
          <Spinner animation="border" size="sm" variant="primary" />
          <div className="mt-2 text-muted small">Finding similar jobs...</div>
        </div>
      );
    }
    
    if (similarJobs.length > 0) {
      return (
        <ListGroup variant="flush">
          {similarJobs.map(similarJob => (
            <ListGroup.Item 
              key={similarJob._id} 
              className="border-0 py-3 cursor-pointer hover-bg-light"
              onClick={() => router.push(`/company/${similarJob.company._id}/jobs/${similarJob._id}`)}
            >
              <div className="d-flex align-items-start">
                <div 
                  className="rounded-circle me-3 d-flex align-items-center justify-content-center"
                  style={{ 
                    width: '48px', 
                    height: '48px',
                    backgroundColor: '#f8f9fa',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}
                >
                  {similarJob.company?.logo ? (
                    <img
                      src={getImageUrl(similarJob.company.logo)}
                      alt={similarJob.company.name}
                      className="rounded-circle object-fit-cover"
                      style={{ width: '100%', height: '100%' }}
                    />
                  ) : (
                    <FaBuilding className="text-primary" />
                  )}
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <h6 className="fw-bold mb-0">{similarJob.title}</h6>
                    <Badge bg="light" text="dark" className="small">
                      {formatSalary(similarJob.salary)}
                    </Badge>
                  </div>
                  <div className="d-flex flex-wrap gap-2 mb-2">
                    <Badge bg="light" text="dark" className="small">
                      <FaMapMarkerAlt className="me-1" size={10} />
                      {similarJob.isRemote ? 'Remote' : similarJob.location}
                    </Badge>
                    <Badge bg="light" text="dark" className="small">
                      {similarJob.employmentType}
                    </Badge>
                  </div>
                  <small className="text-muted d-block">
                    {similarJob.company?.name}
                  </small>
                </div>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      );
    } else {
      return (
        <div className="text-center py-4">
          <p className="text-muted small">
            No similar jobs found
          </p>
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => router.push('/jobs')}
          >
            Browse All Jobs
          </Button>
        </div>
      );
    }
  };

  // Check if params are still being unwrapped
  if (authLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Spinner animation="border" variant="primary" />
        <span className="ms-2">Loading job details...</span>
      </div>
    );
  }

  if (error || !job || !company) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error loading job</Alert.Heading>
          <p>{error || 'Job not found'}</p>
          <div className="d-flex gap-2">
            <Button variant="outline-danger" onClick={() => router.push(`/company/${companyId}`)}>
              Back to Company
            </Button>
            <Button variant="primary" onClick={() => router.push('/jobs')}>
              Browse Jobs
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  const isOwner = isAuthenticated && user?._id === job.postedBy._id;
  const isExpired = isJobExpired();
  const canApply = !isOwner && !hasApplied && !isExpired && job.status === 'active';

  return (
    <>
      <Toaster position="top-right" />
      
      {/* Apply Modal */}
      <Modal show={showApplyModal} onHide={() => setShowApplyModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Apply for {job.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            You'll be redirected to the application page where you can submit your resume and cover letter.
          </Alert>
          <div className="mb-4">
            <h6>Application Requirements:</h6>
            <ul className="mb-0">
              <li>Updated resume/CV</li>
              <li>Cover letter (optional but recommended)</li>
              <li>Portfolio links (if applicable)</li>
            </ul>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApplyModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setShowApplyModal(false);
              router.push(`/company/${companyId}/jobs/${jobId}/apply`);
            }}
          >
            Continue to Application
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
            onClick={() => router.push(`/company/${companyId}`)}
          >
            <FaArrowLeft className="me-2" />
            Back to Company
          </Button>

          <Row>
            {/* Main Content */}
            <Col lg={8}>
              <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="p-4">
                  {/* Job Header */}
                  <div className="d-flex justify-content-between align-items-start mb-4">
                    <div>
                      <div className="d-flex align-items-center mb-2">
                        <h1 className="display-6 fw-bold mb-0">{job.title}</h1>
                        {job.isUrgent && (
                          <Badge bg="danger" className="ms-3">
                            Urgent Hiring
                          </Badge>
                        )}
                        {job.isFeatured && (
                          <Badge bg="warning" text="dark" className="ms-2">
                            Featured
                          </Badge>
                        )}
                      </div>
                      
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <div className="d-flex align-items-center">
                          <FaBuilding className="text-primary me-2" />
                          <span className="fw-bold">{job.company.name}</span>
                        </div>
                        <div className="d-flex align-items-center">
                          <FaMapMarkerAlt className="text-muted me-2" />
                          <span>{job.isRemote ? 'Remote' : job.location}</span>
                        </div>
                        <div className="d-flex align-items-center">
                          <FaClock className="text-muted me-2" />
                          <span>{getDaysAgo(job.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="d-flex gap-2">
                      <Button 
                        variant={isBookmarked ? "warning" : "outline-warning"}
                        size="sm"
                        onClick={handleBookmark}
                        title={isBookmarked ? "Remove bookmark" : "Bookmark"}
                      >
                        {isBookmarked ? <FaBookmark /> : <FaRegBookmark />}
                      </Button>
                      
                      <Button 
                        variant="outline-secondary"
                        size="sm"
                        onClick={handleShare}
                        title="Share"
                      >
                        <FaShareAlt />
                      </Button>
                    </div>
                  </div>

                  {/* Job Stats */}
                  <div className="row mb-4">
                    <div className="col-md-3 col-6 mb-3">
                      <div className="text-center p-3 border rounded">
                        <div className="h4 fw-bold text-primary mb-1">
                          {formatSalary(job.salary)}
                        </div>
                        <div className="text-muted small">Salary</div>
                      </div>
                    </div>
                    
                    <div className="col-md-3 col-6 mb-3">
                      <div className="text-center p-3 border rounded">
                        <div className="h4 fw-bold text-success mb-1">
                          {job.employmentType}
                        </div>
                        <div className="text-muted small">Employment Type</div>
                      </div>
                    </div>
                    
                    <div className="col-md-3 col-6 mb-3">
                      <div className="text-center p-3 border rounded">
                        <div className="h4 fw-bold text-info mb-1">
                          {getExperienceText(job.experience)}
                        </div>
                        <div className="text-muted small">Experience</div>
                      </div>
                    </div>
                    
                    <div className="col-md-3 col-6 mb-3">
                      <div className="text-center p-3 border rounded">
                        <div className="h4 fw-bold text-warning mb-1">
                          {job.education || 'Any'}
                        </div>
                        <div className="text-muted small">Education</div>
                      </div>
                    </div>
                  </div>

                  {/* Application Info */}
                  {isExpired ? (
                    <Alert variant="danger" className="mb-4">
                      <FaExclamationCircle className="me-2" />
                      <strong>Application Closed:</strong> The deadline for this job has passed.
                    </Alert>
                  ) : job.applicationDeadline ? (
                    <Alert variant="info" className="mb-4">
                      <FaCalendarAlt className="me-2" />
                      <strong>Apply by:</strong> {new Date(job.applicationDeadline).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Alert>
                  ) : null}

                  {/* Job Description */}
                  <div className="mb-5">
                    <h4 className="fw-bold mb-3">
                      <FaFileAlt className="me-2" />
                      Job Description
                    </h4>
                    <div className="job-description">
                      {job.description.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-3">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Responsibilities */}
                  {job.responsibilities && job.responsibilities.length > 0 && (
                    <div className="mb-5">
                      <h4 className="fw-bold mb-3">
                        <FaHandshake className="me-2" />
                        Responsibilities
                      </h4>
                      <ListGroup variant="flush">
                        {job.responsibilities.map((responsibility, index) => (
                          <ListGroup.Item key={index} className="border-0 py-2">
                            <FaCheckCircle className="text-success me-2" size={14} />
                            {responsibility}
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </div>
                  )}

                  {/* Requirements */}
                  {job.requirements && job.requirements.length > 0 && (
                    <div className="mb-5">
                      <h4 className="fw-bold mb-3">
                        <FaLightbulb className="me-2" />
                        Requirements
                      </h4>
                      <ListGroup variant="flush">
                        {job.requirements.map((requirement, index) => (
                          <ListGroup.Item key={index} className="border-0 py-2">
                            <FaCheckCircle className="text-success me-2" size={14} />
                            {requirement}
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </div>
                  )}

                  {/* Skills */}
                  {job.skills && job.skills.length > 0 && (
                    <div className="mb-5">
                      <h4 className="fw-bold mb-3">
                        <FaChartLine className="me-2" />
                        Skills Required
                      </h4>
                      <div className="d-flex flex-wrap gap-2">
                        {job.skills.map((skill, index) => (
                          <Badge key={index} bg="primary" className="px-3 py-2">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Benefits */}
                  {job.benefits && job.benefits.length > 0 && (
                    <div className="mb-5">
                      <h4 className="fw-bold mb-3">
                        <FaUsers className="me-2" />
                        Benefits
                      </h4>
                      <div className="row">
                        {job.benefits.map((benefit, index) => (
                          <div key={index} className="col-md-6 mb-2">
                            <div className="d-flex align-items-center">
                              <FaCheckCircle className="text-success me-2" />
                              {benefit}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="d-flex gap-3">
                    {canApply ? (
                      <Button 
                        variant="primary" 
                        size="lg"
                        className="flex-grow-1 py-3"
                        onClick={handleApply}
                      >
                        <FaBriefcase className="me-2" />
                        Apply Now
                      </Button>
                    ) : hasApplied ? (
                      <Button 
                        variant="success" 
                        size="lg"
                        className="flex-grow-1 py-3"
                        disabled
                      >
                        <FaCheckCircle className="me-2" />
                        Already Applied
                      </Button>
                    ) : isExpired ? (
                      <Button 
                        variant="secondary" 
                        size="lg"
                        className="flex-grow-1 py-3"
                        disabled
                      >
                        Application Closed
                      </Button>
                    ) : isOwner ? (
                      <Button 
                        variant="info" 
                        size="lg"
                        className="flex-grow-1 py-3"
                        onClick={() => router.push(`/company/${companyId}/jobs/${jobId}/edit`)}
                      >
                        Edit Job Posting
                      </Button>
                    ) : null}
                    
                    {!isAuthenticated && (
                      <Button 
                        variant="primary" 
                        size="lg"
                        className="flex-grow-1 py-3"
                        onClick={() => router.push(`/login?redirect=/company/${companyId}/jobs/${jobId}`)}
                      >
                        Login to Apply
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>

              {/* Company Info Card */}
              <Card className="border-0 shadow-sm">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <Card.Title className="h5 fw-bold mb-0">
                      About the Company
                    </Card.Title>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => router.push(`/company/${companyId}`)}
                    >
                      View Company Profile
                    </Button>
                  </div>
                  
                  <div className="d-flex align-items-start mb-4">
                    <div 
                      className="rounded-circle me-4 d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '80px', 
                        height: '80px',
                        backgroundColor: '#f8f9fa',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}
                    >
                      {company.logo ? (
                        <img
                          src={getImageUrl(company.logo)}
                          alt={company.name}
                          className="rounded-circle object-fit-cover"
                          style={{ width: '100%', height: '100%' }}
                        />
                      ) : (
                        <FaBuilding className="text-primary" size={32} />
                      )}
                    </div>
                    
                    <div className="flex-grow-1">
                      <h5 className="fw-bold mb-2">{company.name}</h5>
                      <div className="d-flex flex-wrap gap-2 mb-3">
                        <Badge bg="light" text="dark">
                          <FaMapMarkerAlt className="me-2" />
                          {company.location}
                        </Badge>
                        <Badge bg="light" text="dark">
                          <FaBriefcase className="me-2" />
                          {company.industry}
                        </Badge>
                        <Badge bg="light" text="dark">
                          <FaUsers className="me-2" />
                          {getSizeLabel(company.size)}
                        </Badge>
                      </div>
                      <p className="text-muted mb-0">
                        {company.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="d-flex gap-2">
                    {job.company.website && (
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => window.open(job.company.website, '_blank')}
                      >
                        <FaGlobe className="me-2" />
                        Website
                      </Button>
                    )}
                    
                    {job.company.email && (
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => window.location.href = `mailto:${job.company.email}`}
                      >
                        <FaEnvelope className="me-2" />
                        Email
                      </Button>
                    )}
                    
                    {job.company.phone && (
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => window.location.href = `tel:${job.company.phone}`}
                      >
                        <FaPhone className="me-2" />
                        Call
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Sidebar */}
            <Col lg={4}>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky-top"
                style={{ top: '20px' }}
              >
                {/* Job Summary */}
                <Card className="border-0 shadow-sm mb-4">
                  <Card.Body className="p-4">
                    <Card.Title className="h5 fw-bold mb-3">
                      Job Summary
                    </Card.Title>
                    
                    <ListGroup variant="flush">
                      <ListGroup.Item className="border-0 py-3 d-flex justify-content-between">
                        <div className="text-muted">Posted Date</div>
                        <div className="fw-bold">
                          {new Date(job.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </ListGroup.Item>
                      
                      <ListGroup.Item className="border-0 py-3 d-flex justify-content-between">
                        <div className="text-muted">Job Type</div>
                        <div className="fw-bold">{job.employmentType}</div>
                      </ListGroup.Item>
                      
                      <ListGroup.Item className="border-0 py-3 d-flex justify-content-between">
                        <div className="text-muted">Location</div>
                        <div className="fw-bold">
                          {job.isRemote ? 'Remote' : job.location}
                        </div>
                      </ListGroup.Item>
                      
                      <ListGroup.Item className="border-0 py-3 d-flex justify-content-between">
                        <div className="text-muted">Experience</div>
                        <div className="fw-bold">{getExperienceText(job.experience)}</div>
                      </ListGroup.Item>
                      
                      <ListGroup.Item className="border-0 py-3 d-flex justify-content-between">
                        <div className="text-muted">Education</div>
                        <div className="fw-bold">{job.education || 'Any'}</div>
                      </ListGroup.Item>
                      
                      <ListGroup.Item className="border-0 py-3 d-flex justify-content-between">
                        <div className="text-muted">Salary</div>
                        <div className="fw-bold">{formatSalary(job.salary)}</div>
                      </ListGroup.Item>
                      
                      <ListGroup.Item className="border-0 py-3 d-flex justify-content-between">
                        <div className="text-muted">Status</div>
                        <Badge bg={
                          job.status === 'active' ? 'success' :
                          job.status === 'closed' ? 'danger' :
                          job.status === 'draft' ? 'warning' : 'secondary'
                        }>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Badge>
                      </ListGroup.Item>
                      
                      {job.applicationsCount > 0 && (
                        <ListGroup.Item className="border-0 py-3 d-flex justify-content-between">
                          <div className="text-muted">Applications</div>
                          <div className="fw-bold">{job.applicationsCount}</div>
                        </ListGroup.Item>
                      )}
                      
                      {job.views > 0 && (
                        <ListGroup.Item className="border-0 py-3 d-flex justify-content-between">
                          <div className="text-muted">Views</div>
                          <div className="fw-bold">{job.views}</div>
                        </ListGroup.Item>
                      )}
                    </ListGroup>
                  </Card.Body>
                </Card>

                {/* Similar Jobs */}
                <Card className="border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <Card.Title className="h5 fw-bold mb-3">
                      Similar Jobs
                    </Card.Title>
                    {renderSimilarJobs()}
                    
                    <div className="mt-3">
                      <Button 
                        variant="outline-primary" 
                        className="w-100 rounded-pill"
                        onClick={() => router.push('/jobs')}
                      >
                        Browse More Jobs
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </motion.div>
            </Col>
          </Row>
        </motion.div>
      </Container>

      <style jsx>{`
        .hover-bg-light:hover {
          background-color: #f8f9fa !important;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .sticky-top {
          position: sticky;
        }
        .object-fit-cover {
          object-fit: cover;
        }
        .job-description {
          line-height: 1.8;
          color: #333;
        }
        .job-description p {
          margin-bottom: 1rem;
        }
      `}</style>
    </>
  );
}