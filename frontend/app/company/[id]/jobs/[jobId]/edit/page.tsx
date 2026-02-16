// app/company/[id]/jobs/[jobId]/edit/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Alert, 
  Spinner,
  Modal,
  ListGroup,
  Badge
} from 'react-bootstrap';
import { 
  FaArrowLeft, 
  FaSave, 
  FaTrash, 
  FaEye,
  FaPlus, 
  FaTimes,
  FaBuilding,
  FaMapMarkerAlt,
  FaDollarSign,
  FaGraduationCap,
  FaBriefcase,
  FaUsers,
  FaCalendarAlt,
  FaLightbulb,
  FaHandshake,
  FaChartLine,
  FaEdit,
  FaTag,
  FaCertificate,
  FaTasks,
  FaInfoCircle
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../../../../../../context/AuthContext';
import axios from 'axios';

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
  };
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
  owner: string;
  teamMembers?: Array<{
    user: {
      _id: string;
    };
    role: string;
  }>;
}

interface PageProps {
  params: Promise<{ id: string; jobId: string }>;
  searchParams?: { [key: string]: string | string[] | undefined };
}

const employmentTypes = [
  'Full-time',
  'Part-time',
  'Contract',
  'Temporary',
  'Internship',
  'Volunteer',
  'Other'
];

const educationLevels = [
  'Any',
  'High School',
  'Associate',
  'Bachelor',
  'Master',
  'PhD'
];

const payPeriods = [
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly'
];

const currencies = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD'
];

const jobStatuses = [
  { value: 'draft', label: 'Draft', color: 'secondary' },
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'paused', label: 'Paused', color: 'warning' },
  { value: 'closed', label: 'Closed', color: 'danger' },
  { value: 'filled', label: 'Filled', color: 'info' },
  { value: 'archived', label: 'Archived', color: 'dark' }
];

const commonSkills = [
  'JavaScript',
  'React',
  'Node.js',
  'Python',
  'Java',
  'C#',
  'PHP',
  'TypeScript',
  'HTML/CSS',
  'SQL',
  'MongoDB',
  'AWS',
  'Docker',
  'Kubernetes',
  'Git',
  'Agile/Scrum',
  'REST API',
  'GraphQL',
  'UI/UX Design',
  'Project Management'
];

export default function EditJobPage({ params }: PageProps) {
  const unwrappedParams = use(params);
  const { id: companyId, jobId } = unwrappedParams;
  
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [job, setJob] = useState<Job | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [isRemote, setIsRemote] = useState(false);
  const [salaryMin, setSalaryMin] = useState<number | ''>('');
  const [salaryMax, setSalaryMax] = useState<number | ''>('');
  const [currency, setCurrency] = useState('USD');
  const [payPeriod, setPayPeriod] = useState('yearly');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [experienceMin, setExperienceMin] = useState(0);
  const [experienceMax, setExperienceMax] = useState<number | ''>('');
  const [education, setEducation] = useState('Any');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState('active');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  
  // Arrays - editable fields
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);
  const [newRequirement, setNewRequirement] = useState('');
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [newResponsibility, setNewResponsibility] = useState('');
  const [benefits, setBenefits] = useState<string[]>([]);
  const [newBenefit, setNewBenefit] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Check authorization and fetch data
  useEffect(() => {
    const checkAuthorizationAndFetchData = async () => {
      if (authLoading) return;
      
      if (!isAuthenticated || !user) {
        router.push('/login');
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication required');
        }

        // Fetch company data first to check authorization
        const companyResponse = await axios.get(`${API_BASE_URL}/company/${companyId}`, {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });

        const companyData = companyResponse.data.company;
        setCompany(companyData);
        
        // Check authorization
        const isOwner = companyData.owner === user._id;
        const isTeamMember = companyData.teamMembers?.some((member: any) => 
          member.user._id === user._id && ['admin', 'recruiter', 'manager'].includes(member.role)
        );

        if (!isOwner && !isTeamMember) {
          setError('You do not have permission to edit jobs for this company');
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        setIsAuthorized(true);
        
        // Now fetch the job data
        const jobResponse = await axios.get(`${API_BASE_URL}/jobs/${jobId}`, {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });

        const jobData = jobResponse.data.job;
        if (!jobData) {
          throw new Error('Job not found');
        }

        setJob(jobData);
        initializeForm(jobData);
        
      } catch (error: any) {
        console.error('Error fetching data:', error);
        
        if (error.response?.status === 404) {
          setError('Company or job not found');
        } else if (error.response?.status === 401) {
          setError('Authentication failed. Please login again.');
        } else if (error.response?.status === 403) {
          setError('You do not have permission to edit this job');
        } else {
          setError(error.message || 'Failed to load data');
        }
        
        toast.error(error.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    checkAuthorizationAndFetchData();
  }, [companyId, jobId, authLoading, user, isAuthenticated, router]);

  const initializeForm = (jobData: Job) => {
    setTitle(jobData.title || '');
    setDescription(jobData.description || '');
    setLocation(jobData.location || '');
    setEmploymentType(jobData.employmentType || 'Full-time');
    setIsRemote(jobData.isRemote || false);
    setSalaryMin(jobData.salary?.min || '');
    setSalaryMax(jobData.salary?.max || '');
    setCurrency(jobData.salary?.currency || 'USD');
    setPayPeriod(jobData.salary?.payPeriod || 'yearly');
    setIsNegotiable(jobData.salary?.isNegotiable || false);
    setExperienceMin(jobData.experience?.minYears || 0);
    setExperienceMax(jobData.experience?.maxYears || '');
    setEducation(jobData.education || 'Any');
    setIsUrgent(jobData.isUrgent || false);
    setIsFeatured(jobData.isFeatured || false);
    setStatus(jobData.status || 'active');
    
    if (jobData.applicationDeadline) {
      const deadline = new Date(jobData.applicationDeadline);
      setApplicationDeadline(deadline.toISOString().split('T')[0]);
    }
    
    setSkills(jobData.skills || []);
    setRequirements(jobData.requirements || []);
    setResponsibilities(jobData.responsibilities || []);
    setBenefits(jobData.benefits || []);
    setTags(jobData.tags || []);
  };

  // Handle adding and removing skills
  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  // Handle editing a skill
  const handleEditSkill = (index: number, newValue: string) => {
    const updatedSkills = [...skills];
    updatedSkills[index] = newValue;
    setSkills(updatedSkills);
  };

  // Handle requirements
  const handleAddRequirement = () => {
    if (newRequirement.trim() && !requirements.includes(newRequirement.trim())) {
      setRequirements([...requirements, newRequirement.trim()]);
      setNewRequirement('');
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };

  // Handle responsibilities
  const handleAddResponsibility = () => {
    if (newResponsibility.trim() && !responsibilities.includes(newResponsibility.trim())) {
      setResponsibilities([...responsibilities, newResponsibility.trim()]);
      setNewResponsibility('');
    }
  };

  const handleRemoveResponsibility = (index: number) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index));
  };

  // Handle benefits
  const handleAddBenefit = () => {
    if (newBenefit.trim() && !benefits.includes(newBenefit.trim())) {
      setBenefits([...benefits, newBenefit.trim()]);
      setNewBenefit('');
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefits(benefits.filter((_, i) => i !== index));
  };

  // Handle tags
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // Handle key press for adding items
  const handleKeyPress = (e: React.KeyboardEvent, callback: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      callback();
    }
  };

  const validateForm = (): string[] => {
    const errors: string[] = [];
    
    if (!title.trim()) errors.push('Job title is required');
    if (!description.trim()) errors.push('Job description is required');
    if (!location.trim()) errors.push('Location is required');
    if (salaryMin !== '' && salaryMax !== '' && Number(salaryMin) > Number(salaryMax)) {
      errors.push('Minimum salary cannot be greater than maximum salary');
    }
    if (experienceMax !== '' && Number(experienceMin) > Number(experienceMax)) {
      errors.push('Minimum experience cannot be greater than maximum experience');
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }
    
    try {
      setSaving(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      const jobData = {
        title,
        description,
        location,
        employmentType,
        isRemote,
        salary: {
          min: salaryMin === '' ? undefined : Number(salaryMin),
          max: salaryMax === '' ? undefined : Number(salaryMax),
          currency,
          payPeriod,
          isNegotiable
        },
        experience: {
          minYears: experienceMin,
          maxYears: experienceMax === '' ? undefined : Number(experienceMax)
        },
        education,
        skills,
        requirements,
        responsibilities,
        benefits,
        tags,
        isUrgent,
        isFeatured,
        status,
        applicationDeadline: applicationDeadline || undefined
      };
      
      await axios.put(`${API_BASE_URL}/jobs/${jobId}`, jobData, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      toast.success('Job updated successfully');
      router.push(`/company/${companyId}/jobs/${jobId}`);
      
    } catch (error: any) {
      console.error('Error updating job:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to update job');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async () => {
    try {
      setDeleting(true);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }
      
      await axios.delete(`${API_BASE_URL}/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      toast.success('Job deleted successfully');
      router.push(`/company/${companyId}/jobs`);
      
    } catch (error: any) {
      console.error('Error deleting job:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to delete job');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handlePreview = () => {
    setShowPreviewModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusObj = jobStatuses.find(s => s.value === status);
    return (
      <Badge 
        bg={statusObj?.color || 'secondary'} 
        className="px-3 py-1"
      >
        {statusObj?.label || status}
      </Badge>
    );
  };

  const formatSalary = () => {
    if (!salaryMin && !salaryMax) {
      return isNegotiable ? 'Negotiable' : 'Not specified';
    }
    
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
    
    const periodText = periodMap[payPeriod] || '';
    
    if (salaryMin && salaryMax && salaryMin === salaryMax) {
      return `${currency} ${formatNumber(Number(salaryMin))}${periodText}`;
    }
    
    let salaryText = '';
    if (salaryMin) salaryText += `${currency} ${formatNumber(Number(salaryMin))}`;
    if (salaryMin && salaryMax) salaryText += ' - ';
    if (salaryMax) salaryText += `${currency} ${formatNumber(Number(salaryMax))}`;
    
    return `${salaryText}${periodText}`;
  };

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading job details...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return (
      <Container className="py-5">
        <Alert variant="warning" className="border-0">
          <div className="d-flex align-items-center">
            <FaInfoCircle className="me-3 text-warning" />
            <div>
              <p className="mb-2">You need to be logged in to edit jobs.</p>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => router.push(`/login?redirect=/company/${companyId}/jobs/${jobId}/edit`)}
              >
                Login
              </Button>
            </div>
          </div>
        </Alert>
      </Container>
    );
  }

  // Show error state
  if (error || !job || !company) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="border-0">
          <div className="d-flex align-items-center">
            <FaInfoCircle className="me-3 text-danger" />
            <div>
              <p className="mb-2">{error || 'Job or company not found'}</p>
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => router.push(`/company/${companyId}`)}
                >
                  Back to Company
                </Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => router.push(`/company/${companyId}/jobs`)}
                >
                  View Jobs
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      </Container>
    );
  }

  // Check if user has permission
  if (!isAuthorized) {
    return (
      <Container className="py-5">
        <Alert variant="warning" className="border-0">
          <div className="d-flex align-items-center">
            <FaInfoCircle className="me-3 text-warning" />
            <div>
              <p className="mb-2">You do not have permission to edit jobs for this company.</p>
              <div className="d-flex gap-2">
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => router.push(`/company/${companyId}/jobs/${jobId}`)}
                >
                  View Job
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => router.push(`/company/${companyId}/jobs`)}
                >
                  All Jobs
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header className="border-0">
          <Modal.Title>Delete Job</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            <div className="rounded-circle bg-light d-inline-flex p-3 mb-3">
              <FaInfoCircle className="text-danger" size={24} />
            </div>
            <h5 className="mb-2">Are you sure you want to delete this job?</h5>
            <p className="text-muted mb-4">
              This action cannot be undone. All applications will also be deleted.
            </p>
            <div className="p-3 border rounded">
              <p className="mb-0">{job?.title}</p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteJob} 
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Job'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Preview Modal */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="lg" centered>
        <Modal.Header className="border-0">
          <Modal.Title>Job Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Card className="border-0">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                  <h4 className="mb-2">{title || 'Job Title'}</h4>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="d-flex align-items-center">
                      <FaBuilding className="text-primary me-2" />
                      <span>{company.name}</span>
                    </div>
                    <div className="d-flex align-items-center">
                      <FaMapMarkerAlt className="text-muted me-2" />
                      <span className={isRemote ? 'text-success' : ''}>
                        {isRemote ? 'Remote' : location || 'Location'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  {getStatusBadge(status)}
                </div>
              </div>
              
              <div className="row mb-4">
                <div className="col-md-3 col-6 mb-3">
                  <div className="text-center p-3 border rounded">
                    <div className="text-primary mb-1">
                      {formatSalary()}
                    </div>
                    <div className="text-muted small">Salary</div>
                  </div>
                </div>
                
                <div className="col-md-3 col-6 mb-3">
                  <div className="text-center p-3 border rounded">
                    <div className="text-success mb-1">
                      {employmentType}
                    </div>
                    <div className="text-muted small">Type</div>
                  </div>
                </div>
                
                <div className="col-md-3 col-6 mb-3">
                  <div className="text-center p-3 border rounded">
                    <div className="text-info mb-1">
                      {experienceMin}
                      {experienceMax ? ` - ${experienceMax}` : '+'} years
                    </div>
                    <div className="text-muted small">Experience</div>
                  </div>
                </div>
                
                <div className="col-md-3 col-6 mb-3">
                  <div className="text-center p-3 border rounded">
                    <div className="text-warning mb-1">
                      {education}
                    </div>
                    <div className="text-muted small">Education</div>
                  </div>
                </div>
              </div>
              
              <div className="mb-4">
                <h6 className="mb-3">Job Description</h6>
                <div className="p-3 bg-light rounded">
                  {description || 'No description provided'}
                </div>
              </div>
              
              {responsibilities.length > 0 && (
                <div className="mb-4">
                  <h6 className="mb-3">Responsibilities</h6>
                  <ListGroup variant="flush">
                    {responsibilities.map((responsibility, index) => (
                      <ListGroup.Item key={index} className="border-0 px-0 py-1">
                        <div className="d-flex align-items-start">
                          <FaHandshake className="text-success mt-1 me-3" size={14} />
                          <span>{responsibility}</span>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              )}
              
              {requirements.length > 0 && (
                <div className="mb-4">
                  <h6 className="mb-3">Requirements</h6>
                  <ListGroup variant="flush">
                    {requirements.map((requirement, index) => (
                      <ListGroup.Item key={index} className="border-0 px-0 py-1">
                        <div className="d-flex align-items-start">
                          <FaLightbulb className="text-warning mt-1 me-3" size={14} />
                          <span>{requirement}</span>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              )}
              
              {skills.length > 0 && (
                <div className="mb-4">
                  <h6 className="mb-3">Skills</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                      <Badge key={index} bg="light" text="dark" className="px-2 py-1 border">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button 
            variant="secondary" 
            onClick={() => setShowPreviewModal(false)}
          >
            Close Preview
          </Button>
        </Modal.Footer>
      </Modal>

      <Container className="py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-start mb-4">
              <div>
                <div className="d-flex align-items-center mb-2">
                  <Button 
                    variant="link" 
                    onClick={() => router.push(`/company/${companyId}/jobs/${jobId}`)}
                    className="text-muted p-0 me-3"
                    size="sm"
                  >
                    <FaArrowLeft className="me-1" />
                    Back
                  </Button>
                  <h1 className="h4 mb-0">Edit Job</h1>
                </div>
                <p className="text-muted">
                  {company.name} • Last updated: {new Date(job.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-primary"
                  onClick={handlePreview}
                  size="sm"
                  className="d-flex align-items-center"
                >
                  <FaEye className="me-2" />
                  Preview
                </Button>
                <Button 
                  variant="outline-danger"
                  onClick={() => setShowDeleteModal(true)}
                  size="sm"
                  className="d-flex align-items-center"
                >
                  <FaTrash className="me-2" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
          
          <Form onSubmit={handleSubmit}>
            <Row>
              {/* Left Column */}
              <Col lg={8}>
                {/* Basic Information */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-4">
                      <div className="bg-primary bg-opacity-10 rounded p-2 me-3">
                        <FaBriefcase className="text-primary" />
                      </div>
                      <div>
                        <h5 className="mb-1">Basic Information</h5>
                        <p className="text-muted small mb-0">Essential job details</p>
                      </div>
                    </div>
                    
                    <Form.Group className="mb-4">
                      <Form.Label>Job Title *</Form.Label>
                      <Form.Control
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Senior Frontend Developer"
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Label>Description *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={6}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe the job responsibilities, requirements, and company culture..."
                        required
                      />
                    </Form.Group>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-4">
                          <Form.Label>Location *</Form.Label>
                          <Form.Control
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="e.g., New York, NY"
                            required
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group className="mb-4">
                          <Form.Label>Employment Type</Form.Label>
                          <Form.Select
                            value={employmentType}
                            onChange={(e) => setEmploymentType(e.target.value)}
                          >
                            {employmentTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-4">
                          <Form.Label>Job Status</Form.Label>
                          <Form.Select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                          >
                            {jobStatuses.map(status => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group className="mb-4 pt-4">
                          <Form.Check
                            type="checkbox"
                            label="Remote position"
                            checked={isRemote}
                            onChange={(e) => setIsRemote(e.target.checked)}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
                
                {/* Salary Information */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-4">
                      <div className="bg-success bg-opacity-10 rounded p-2 me-3">
                        <FaDollarSign className="text-success" />
                      </div>
                      <div>
                        <h5 className="mb-1">Salary Information</h5>
                        <p className="text-muted small mb-0">Salary range and payment details</p>
                      </div>
                    </div>
                    
                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-4">
                          <Form.Label>Minimum Salary</Form.Label>
                          <Form.Control
                            type="number"
                            value={salaryMin}
                            onChange={(e) => setSalaryMin(e.target.value ? parseFloat(e.target.value) : '')}
                            placeholder="e.g., 60000"
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={4}>
                        <Form.Group className="mb-4">
                          <Form.Label>Maximum Salary</Form.Label>
                          <Form.Control
                            type="number"
                            value={salaryMax}
                            onChange={(e) => setSalaryMax(e.target.value ? parseFloat(e.target.value) : '')}
                            placeholder="e.g., 120000"
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={4}>
                        <Form.Group className="mb-4">
                          <Form.Label>Currency</Form.Label>
                          <Form.Select
                            value={currency}
                            onChange={(e) => setCurrency(e.target.value)}
                          >
                            {currencies.map(curr => (
                              <option key={curr} value={curr}>{curr}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-4">
                          <Form.Label>Pay Period</Form.Label>
                          <Form.Select
                            value={payPeriod}
                            onChange={(e) => setPayPeriod(e.target.value)}
                          >
                            {payPeriods.map(period => (
                              <option key={period} value={period}>
                                {period.charAt(0).toUpperCase() + period.slice(1)}
                              </option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group className="mb-4 pt-4">
                          <Form.Check
                            type="checkbox"
                            label="Salary is negotiable"
                            checked={isNegotiable}
                            onChange={(e) => setIsNegotiable(e.target.checked)}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
                
                {/* Requirements & Responsibilities */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-4">
                      <div className="bg-info bg-opacity-10 rounded p-2 me-3">
                        <FaTasks className="text-info" />
                      </div>
                      <div>
                        <h5 className="mb-1">Requirements & Responsibilities</h5>
                        <p className="text-muted small mb-0">Define role expectations</p>
                      </div>
                    </div>
                    
                    {/* Responsibilities */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">Responsibilities</h6>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={handleAddResponsibility}
                          className="d-flex align-items-center"
                        >
                          <FaPlus className="me-1" /> Add
                        </Button>
                      </div>
                      
                      <div className="d-flex mb-3">
                        <Form.Control
                          type="text"
                          value={newResponsibility}
                          onChange={(e) => setNewResponsibility(e.target.value)}
                          placeholder="Add responsibility (press Enter)"
                          onKeyPress={(e) => handleKeyPress(e, handleAddResponsibility)}
                        />
                      </div>
                      
                      <ListGroup variant="flush">
                        {responsibilities.map((responsibility, index) => (
                          <ListGroup.Item key={index} className="px-0 py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <span>{responsibility}</span>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => handleRemoveResponsibility(index)}
                                className="text-muted p-0"
                              >
                                <FaTimes size={14} />
                              </Button>
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </div>
                    
                    {/* Requirements */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">Requirements</h6>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={handleAddRequirement}
                          className="d-flex align-items-center"
                        >
                          <FaPlus className="me-1" /> Add
                        </Button>
                      </div>
                      
                      <div className="d-flex mb-3">
                        <Form.Control
                          type="text"
                          value={newRequirement}
                          onChange={(e) => setNewRequirement(e.target.value)}
                          placeholder="Add requirement (press Enter)"
                          onKeyPress={(e) => handleKeyPress(e, handleAddRequirement)}
                        />
                      </div>
                      
                      <ListGroup variant="flush">
                        {requirements.map((requirement, index) => (
                          <ListGroup.Item key={index} className="px-0 py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <span>{requirement}</span>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => handleRemoveRequirement(index)}
                                className="text-muted p-0"
                              >
                                <FaTimes size={14} />
                              </Button>
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              
              {/* Right Column */}
              <Col lg={4}>
                {/* Experience & Education */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-4">
                      <div className="bg-primary bg-opacity-10 rounded p-2 me-3">
                        <FaGraduationCap className="text-primary" />
                      </div>
                      <div>
                        <h5 className="mb-1">Requirements</h5>
                        <p className="text-muted small mb-0">Qualifications needed</p>
                      </div>
                    </div>
                    
                    <Form.Group className="mb-4">
                      <Form.Label>Minimum Experience (years)</Form.Label>
                      <Form.Control
                        type="number"
                        value={experienceMin}
                        onChange={(e) => setExperienceMin(parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Label>Maximum Experience (years)</Form.Label>
                      <Form.Control
                        type="number"
                        value={experienceMax}
                        onChange={(e) => setExperienceMax(e.target.value ? parseInt(e.target.value) : '')}
                        placeholder="Optional"
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Label>Education Level</Form.Label>
                      <Form.Select
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                      >
                        {educationLevels.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Label className="d-flex align-items-center">
                        <FaCalendarAlt className="me-2" />
                        Application Deadline
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={applicationDeadline}
                        onChange={(e) => setApplicationDeadline(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </Form.Group>
                  </Card.Body>
                </Card>
                
                {/* Skills */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-4">
                      <div className="bg-warning bg-opacity-10 rounded p-2 me-3">
                        <FaChartLine className="text-warning" />
                      </div>
                      <div>
                        <h5 className="mb-1">Skills Required</h5>
                        <p className="text-muted small mb-0">Technical and soft skills</p>
                      </div>
                    </div>
                    
                    <Form.Group className="mb-4">
                      <Form.Label>Add Skills</Form.Label>
                      <div className="d-flex mb-3">
                        <Form.Control
                          type="text"
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          placeholder="Type a skill"
                          list="common-skills"
                          onKeyPress={(e) => handleKeyPress(e, handleAddSkill)}
                        />
                        <Button 
                          variant="outline-primary" 
                          onClick={handleAddSkill}
                          className="ms-2"
                        >
                          <FaPlus />
                        </Button>
                      </div>
                      
                      <datalist id="common-skills">
                        {commonSkills.map(skill => (
                          <option key={skill} value={skill} />
                        ))}
                      </datalist>
                      
                      <div className="d-flex flex-wrap gap-2">
                        {skills.map((skill, index) => (
                          <div key={index} className="bg-light rounded px-3 py-1 d-flex align-items-center">
                            <span className="me-2">{skill}</span>
                            <FaTimes 
                              className="text-muted"
                              size={12}
                              onClick={() => handleRemoveSkill(index)}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        ))}
                      </div>
                    </Form.Group>
                  </Card.Body>
                </Card>
                
                {/* Benefits */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-4">
                      <div className="bg-success bg-opacity-10 rounded p-2 me-3">
                        <FaUsers className="text-success" />
                      </div>
                      <div>
                        <h5 className="mb-1">Benefits & Perks</h5>
                        <p className="text-muted small mb-0">What you offer</p>
                      </div>
                    </div>
                    
                    <Form.Group>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <Form.Label>Add Benefits</Form.Label>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={handleAddBenefit}
                          className="d-flex align-items-center"
                        >
                          <FaPlus className="me-1" /> Add
                        </Button>
                      </div>
                      
                      <div className="d-flex mb-3">
                        <Form.Control
                          type="text"
                          value={newBenefit}
                          onChange={(e) => setNewBenefit(e.target.value)}
                          placeholder="e.g., Health insurance"
                          onKeyPress={(e) => handleKeyPress(e, handleAddBenefit)}
                        />
                      </div>
                      
                      <ListGroup variant="flush">
                        {benefits.map((benefit, index) => (
                          <ListGroup.Item key={index} className="px-0 py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <span>{benefit}</span>
                              <Button
                                variant="link"
                                size="sm"
                                onClick={() => handleRemoveBenefit(index)}
                                className="text-muted p-0"
                              >
                                <FaTimes size={14} />
                              </Button>
                            </div>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    </Form.Group>
                  </Card.Body>
                </Card>
                
                {/* Job Settings */}
                <Card className="mb-4 border-0 shadow-sm">
                  <Card.Body className="p-4">
                    <h5 className="mb-4">Job Settings</h5>
                    
                    <Form.Group className="mb-4">
                      <Form.Check
                        type="checkbox"
                        label="Mark as Urgent Hiring"
                        checked={isUrgent}
                        onChange={(e) => setIsUrgent(e.target.checked)}
                        className="mb-2"
                      />
                      <Form.Text className="text-muted">
                        Urgent jobs get priority placement
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Check
                        type="checkbox"
                        label="Feature this job"
                        checked={isFeatured}
                        onChange={(e) => setIsFeatured(e.target.checked)}
                        className="mb-2"
                      />
                      <Form.Text className="text-muted">
                        Featured jobs appear at the top of search results
                      </Form.Text>
                    </Form.Group>
                    
                    {/* Tags */}
                    <Form.Group>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <Form.Label className="d-flex align-items-center">
                          <FaTag className="me-2" />
                          Search Tags
                        </Form.Label>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={handleAddTag}
                          className="d-flex align-items-center"
                        >
                          <FaPlus className="me-1" /> Add
                        </Button>
                      </div>
                      
                      <div className="d-flex mb-3">
                        <Form.Control
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Add a tag"
                          onKeyPress={(e) => handleKeyPress(e, handleAddTag)}
                        />
                      </div>
                      
                      <div className="d-flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                          <div key={index} className="bg-secondary bg-opacity-10 rounded px-3 py-1 d-flex align-items-center">
                            <span className="me-2">{tag}</span>
                            <FaTimes 
                              className="text-muted"
                              size={12}
                              onClick={() => handleRemoveTag(index)}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        ))}
                      </div>
                    </Form.Group>
                  </Card.Body>
                </Card>
                
                {/* Action Buttons */}
                <Card className="border-0 shadow-sm sticky-top" style={{ top: '20px' }}>
                  <Card.Body className="p-4">
                    <div className="d-grid gap-3">
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={saving}
                        className="py-2"
                      >
                        {saving ? (
                          <>
                            <Spinner size="sm" animation="border" className="me-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <FaSave className="me-2" />
                            Update Job
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline-secondary"
                        type="button"
                        onClick={() => router.push(`/company/${companyId}/jobs/${jobId}`)}
                        className="py-2"
                      >
                        Cancel
                      </Button>
                    </div>
                    
                    <div className="mt-4 text-center">
                      <div className="d-flex justify-content-center align-items-center gap-2 mb-2">
                        <small className="text-muted">
                          Updated: {new Date(job.updatedAt).toLocaleDateString()}
                        </small>
                      </div>
                      <div className="d-flex justify-content-center gap-3">
                        <small className="text-muted">
                          {job.applicationsCount || 0} applications
                        </small>
                        <small className="text-muted">
                          {job.views || 0} views
                        </small>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Form>
        </motion.div>
      </Container>

      {/* Custom styles */}
      <style jsx global>{`
        .sticky-top {
          position: sticky;
          z-index: 100;
        }
        
        .shadow-sm {
          box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
        }
        
        .form-control, .form-select {
          border: 1px solid #dee2e6;
        }
        
        .form-control:focus, .form-select:focus {
          border-color: #86b7fe;
          box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.1);
        }
        
        .bg-opacity-10 {
          opacity: 0.1;
        }
        
        .btn-outline-primary:hover {
          background-color: rgba(13, 110, 253, 0.1);
        }
        
        .card {
          transition: transform 0.2s ease;
        }
        
        .card:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </>
  );
}