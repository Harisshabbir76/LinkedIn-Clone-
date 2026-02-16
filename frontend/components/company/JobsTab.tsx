'use client';

import { Card, Button, ListGroup, Badge, Dropdown } from 'react-bootstrap';
import { 
  FaBriefcase, 
  FaMapMarkerAlt, 
  FaDollarSign, 
  FaClock, 
  FaGraduationCap, 
  FaEye,
  FaPlus,
  FaExternalLinkAlt,
  FaFilter,
  FaSortAmountDown,
  FaMars
} from 'react-icons/fa';

interface JobsTabProps {
  company: any;
  activeJobsCount: number;
  canEdit: boolean;
  onPostJobClick: () => void;
  router: any;
  isOwner: boolean;
  isAuthenticated: boolean;
}

export default function JobsTab({
  company,
  activeJobsCount,
  canEdit,
  onPostJobClick,
  router,
  isOwner,
  isAuthenticated
}: JobsTabProps) {
  
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
      
      return `$${formatNumber(min)} - $${formatNumber(max)} ${periodMap[period] || ''}`;
    }
    
    return 'Salary not disclosed';
  };

  const formatEmploymentType = (type: string) => {
    const types: Record<string, string> = {
      'Full-time': 'Full Time',
      'Part-time': 'Part Time',
      'Contract': 'Contract',
      'Internship': 'Internship',
      'Remote': 'Remote',
      'Temporary': 'Temporary',
      'Freelance': 'Freelance',
      'Volunteer': 'Volunteer'
    };
    return types[type] || type;
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

  const getTotalJobsCount = () => {
    if (!company.jobs || !Array.isArray(company.jobs)) return 0;
    return company.jobs.length;
  };

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge bg="success" className="ms-2">Active</Badge>;
      case 'draft':
        return <Badge bg="secondary" className="ms-2">Draft</Badge>;
      case 'closed':
        return <Badge bg="danger" className="ms-2">Closed</Badge>;
      case 'archived':
        return <Badge bg="dark" className="ms-2">Archived</Badge>;
      case 'paused':
        return <Badge bg="warning" className="ms-2">Paused</Badge>;
      default:
        return null;
    }
  };

  const activeJobs = company.jobs?.filter((job: any) => job.status === 'active') || [];
  const totalJobsCount = getTotalJobsCount();

  // Handle navigation to all jobs page
  const handleViewAllJobs = () => {
    router.push(`/company/${company._id}/jobs`);
  };

  // Handle navigation to manage jobs (for owners/admins)
  const handleManageJobs = () => {
    router.push(`/company/${company._id}/jobs/manage`);
  };

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        {/* Header with enhanced options */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <Card.Title className="h5 fw-bold mb-1">
              Open Positions ({activeJobsCount})
            </Card.Title>
            <p className="text-muted mb-0 small">
              Showing {activeJobsCount} of {totalJobsCount} total jobs
              {isOwner && (
                <span className="ms-2">
                  <span className="text-success">{activeJobsCount} active</span>
                  {' · '}
                  <span className="text-secondary">{totalJobsCount - activeJobsCount} inactive</span>
                </span>
              )}
            </p>
          </div>
          
          <div className="d-flex gap-2">
            {/* Show All Jobs Button - Always visible */}
            <Button
              variant="outline-primary"
              className="rounded-pill px-4 d-flex align-items-center gap-2"
              onClick={handleViewAllJobs}
            >
              <FaMars className="me-1" />
              Show All Jobs
              <Badge bg="primary" className="ms-1" pill>
                {totalJobsCount}
              </Badge>
            </Button>

            {/* Manage Jobs Button - Only for owners/admins */}
            {canEdit && (
              <Button
                variant="primary"
                className="rounded-pill px-4 d-flex align-items-center gap-2"
                onClick={onPostJobClick}
              >
                <FaPlus className="me-1" />
                Post New Job
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="mb-4">
          <div className="d-flex flex-wrap gap-3">
            <div className="d-flex align-items-center bg-light rounded-pill px-3 py-2">
              <FaBriefcase className="text-primary me-2" />
              <span className="fw-bold me-1">{activeJobsCount}</span>
              <span className="text-muted small">Active Jobs</span>
            </div>
            {company.jobs?.some((j: any) => j.isUrgent) && (
              <div className="d-flex align-items-center bg-warning bg-opacity-10 rounded-pill px-3 py-2">
                <FaClock className="text-warning me-2" />
                <span className="fw-bold me-1">
                  {company.jobs.filter((j: any) => j.isUrgent).length}
                </span>
                <span className="text-muted small">Urgent Hiring</span>
              </div>
            )}
            {company.jobs?.some((j: any) => j.isFeatured) && (
              <div className="d-flex align-items-center bg-info bg-opacity-10 rounded-pill px-3 py-2">
                <FaEye className="text-info me-2" />
                <span className="fw-bold me-1">
                  {company.jobs.filter((j: any) => j.isFeatured).length}
                </span>
                <span className="text-muted small">Featured</span>
              </div>
            )}
            <div className="d-flex align-items-center bg-success bg-opacity-10 rounded-pill px-3 py-2">
              <FaMapMarkerAlt className="text-success me-2" />
              <span className="fw-bold me-1">
                {new Set(company.jobs?.map((j: any) => j.location)).size || 1}
              </span>
              <span className="text-muted small">Locations</span>
            </div>
          </div>
        </div>

        {activeJobs.length > 0 ? (
          <>
            {/* Action Bar */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex gap-2">
                <Button 
                  variant="light" 
                  size="sm"
                  className="d-flex align-items-center gap-2"
                  onClick={() => {
                    // Handle sort
                  }}
                >
                  <FaSortAmountDown />
                  Sort
                </Button>
                <Button 
                  variant="light" 
                  size="sm"
                  className="d-flex align-items-center gap-2"
                  onClick={() => {
                    // Handle filter
                  }}
                >
                  <FaFilter />
                  Filter
                </Button>
              </div>
              
              <Button 
                variant="link" 
                className="text-decoration-none d-flex align-items-center gap-2"
                onClick={handleViewAllJobs}
              >
                View all details
                <FaExternalLinkAlt size={12} />
              </Button>
            </div>

            {/* Jobs List */}
            <ListGroup variant="flush" className="border-top">
              {activeJobs
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 3) // Show only 3 most recent jobs in overview
                .map((job: any, index: number) => {
                  const salaryDisplay = formatSalary(job.salary);
                  const employmentTypeDisplay = formatEmploymentType(job.type || job.employmentType || 'Full-time');
                  const location = job.location || 'Location not specified';
                  const isRemote = job.isRemote || job.type === 'Remote' || location.toLowerCase().includes('remote');
                  
                  return (
                    <ListGroup.Item 
                      key={job._id} 
                      className="border-0 py-4 hover-bg-light cursor-pointer position-relative"
                      onClick={() => router.push(`/company/${company._id}/jobs/${job._id}`)}
                    >
                      {index === 0 && activeJobsCount > 3 && (
                        <div className="position-absolute top-0 end-0">
                          <Badge bg="info" className="rounded-pill">
                            Most Recent
                          </Badge>
                        </div>
                      )}
                      
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="w-100">
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                                <h5 className="fw-bold mb-0">{job.title || 'Untitled Job'}</h5>
                                {getJobStatusBadge(job.status)}
                                {job.isUrgent && (
                                  <Badge bg="danger" pill className="px-2 py-1">
                                    🔥 Urgent
                                  </Badge>
                                )}
                                {job.isFeatured && (
                                  <Badge bg="info" pill className="px-2 py-1">
                                    ⭐ Featured
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="d-flex align-items-center gap-2">
                                <small className="text-muted d-flex align-items-center">
                                  <FaClock className="me-1" size={12} />
                                  Posted {getDaysAgo(job.createdAt)}
                                </small>
                                
                                {job.applicationDeadline && (
                                  <small className="text-muted d-flex align-items-center">
                                    <span className="ms-2">⏰ Apply by: {new Date(job.applicationDeadline).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric'
                                    })}</span>
                                  </small>
                                )}
                              </div>
                            </div>
                            
                            <Button 
                              variant="outline-primary" 
                              size="sm" 
                              className="rounded-pill px-3 ms-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/company/${company._id}/jobs/${job._id}`);
                              }}
                            >
                              View
                            </Button>
                          </div>
                          
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            <Badge bg="light" text="dark" className="px-3 py-2 d-flex align-items-center">
                              <FaMapMarkerAlt className="me-2" />
                              {isRemote ? '🌍 Remote' : location}
                            </Badge>
                            
                            <Badge bg="light" text="dark" className="px-3 py-2">
                              {employmentTypeDisplay}
                            </Badge>
                            
                            {salaryDisplay !== 'Salary not disclosed' && (
                              <Badge bg="success" className="px-3 py-2 d-flex align-items-center">
                                <FaDollarSign className="me-2" />
                                {salaryDisplay}
                              </Badge>
                            )}
                            
                            {job.experience?.minYears && (
                              <Badge bg="info" className="px-3 py-2">
                                🎯 {job.experience.minYears}+ years
                              </Badge>
                            )}
                          </div>
                          
                          {job.description && (
                            <p className="text-muted mb-3">
                              {job.description.length > 200 
                                ? `${job.description.substring(0, 200)}...` 
                                : job.description}
                            </p>
                          )}
                          
                          {/* Skills preview */}
                          {job.skills && job.skills.length > 0 && (
                            <div className="d-flex flex-wrap gap-1 mb-3">
                              {job.skills.slice(0, 3).map((skill: string, index: number) => (
                                <Badge key={index} bg="secondary" className="px-2 py-1">
                                  {skill}
                                </Badge>
                              ))}
                              {job.skills.length > 3 && (
                                <Badge bg="light" text="dark" className="px-2 py-1">
                                  +{job.skills.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-3">
                              {(job.applicationsCount || job.applications?.length > 0) && (
                                <small className="text-muted">
                                  👥 <strong>{job.applicationsCount || job.applications?.length || 0}</strong> applicants
                                </small>
                              )}
                              
                              {job.viewsCount && (
                                <small className="text-muted">
                                  👁️ <strong>{job.viewsCount}</strong> views
                                </small>
                              )}
                            </div>
                            
                            <div className="d-flex gap-2">
                              {isAuthenticated && !isOwner && (
                                <Button 
                                  variant="primary" 
                                  size="sm"
                                  className="rounded-pill px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/company/${company._id}/jobs/${job._id}/apply`);
                                  }}
                                >
                                  Apply Now
                                </Button>
                              )}
                              
                              {isOwner && (
                                <Button 
                                  variant="outline-secondary" 
                                  size="sm"
                                  className="rounded-pill px-3"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/company/${company._id}/jobs/${job._id}/edit`);
                                  }}
                                >
                                  Edit
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </ListGroup.Item>
                  );
                })}
            </ListGroup>

            {/* Show More Footer */}
            {activeJobsCount > 3 && (
              <div className="text-center mt-4 pt-3 border-top">
                <p className="text-muted mb-3">
                  Showing 3 of {activeJobsCount} active positions
                </p>
                <Button
                  variant="outline-primary"
                  className="rounded-pill px-4 d-flex align-items-center gap-2 mx-auto"
                  onClick={handleViewAllJobs}
                >
                  <FaEye className="me-1" />
                  View All {activeJobsCount} Jobs
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-5">
            <div className="mb-4">
              <div className="position-relative d-inline-block">
                <div className="bg-light rounded-circle p-4">
                  <FaBriefcase size={48} className="text-muted" />
                </div>
                {isOwner && (
                  <div className="position-absolute top-0 end-0 translate-middle">
                    <Badge bg="warning" pill className="p-2">
                      <FaPlus size={12} />
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            
            {isOwner ? (
              <>
                <h5 className="mb-2 fw-bold">No job openings yet</h5>
                <p className="text-muted mb-4">
                  Start posting jobs to attract top talent and grow your team.
                </p>
                <div className="d-flex gap-3 justify-content-center">
                  <Button
                    variant="primary"
                    className="rounded-pill px-4 d-flex align-items-center gap-2"
                    onClick={onPostJobClick}
                  >
                    <FaPlus className="me-1" />
                    Post Your First Job
                  </Button>
                  <Button
                    variant="outline-primary"
                    className="rounded-pill px-4 d-flex align-items-center gap-2"
                    onClick={handleViewAllJobs}
                  >
                    <FaMars className="me-1" />
                    Manage Jobs
                  </Button>
                </div>
                <p className="text-muted small mt-3">
                  You'll be able to track applications, manage candidates, and analyze performance.
                </p>
              </>
            ) : (
              <>
                <h5 className="mb-2 fw-bold">No current job openings</h5>
                <p className="text-muted mb-4">
                  {company.name} isn't hiring at the moment. Check back soon for new opportunities!
                </p>
                <div className="d-flex gap-3 justify-content-center">
                  <Button
                    variant="outline-primary"
                    className="rounded-pill px-4"
                    onClick={() => {
                      // Follow company for updates
                      console.log('Follow company for job updates');
                    }}
                  >
                    Follow for Updates
                  </Button>
                  <Button
                    variant="light"
                    className="rounded-pill px-4"
                    onClick={() => {
                      // Save company to bookmarks
                      console.log('Bookmark company');
                    }}
                  >
                    Save Company
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* For owners/admins, show additional options */}
        {canEdit && activeJobsCount > 0 && (
          <div className="mt-4 pt-3 border-top">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h6 className="fw-bold mb-1">Job Management</h6>
                <p className="text-muted small mb-0">
                  View and manage all jobs, including drafts and closed positions
                </p>
              </div>
              <Button
                variant="light"
                className="rounded-pill px-4 d-flex align-items-center gap-2"
                onClick={handleViewAllJobs}
              >
                <FaExternalLinkAlt className="me-1" />
                Go to Jobs Dashboard
              </Button>
            </div>
            
            <div className="row mt-3">
              <div className="col-md-4">
                <Card className="border-0 bg-primary bg-opacity-10">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center">
                      <div className="bg-primary bg-opacity-25 rounded-circle p-2 me-3">
                        <FaBriefcase className="text-primary" />
                      </div>
                      <div>
                        <h5 className="fw-bold mb-0">{activeJobsCount}</h5>
                        <small className="text-muted">Active Jobs</small>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
              
              <div className="col-md-4">
                <Card className="border-0 bg-warning bg-opacity-10">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center">
                      <div className="bg-warning bg-opacity-25 rounded-circle p-2 me-3">
                        <FaClock className="text-warning" />
                      </div>
                      <div>
                        <h5 className="fw-bold mb-0">
                          {company.jobs?.filter((j: any) => j.isUrgent).length || 0}
                        </h5>
                        <small className="text-muted">Urgent Hiring</small>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
              
              <div className="col-md-4">
                <Card className="border-0 bg-info bg-opacity-10">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center">
                      <div className="bg-info bg-opacity-25 rounded-circle p-2 me-3">
                        <FaEye className="text-info" />
                      </div>
                      <div>
                        <h5 className="fw-bold mb-0">
                          {company.jobs?.filter((j: any) => j.isFeatured).length || 0}
                        </h5>
                        <small className="text-muted">Featured Jobs</small>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* For non-owners, show suggestion to follow */}
        {!isOwner && isAuthenticated && activeJobsCount === 0 && (
          <div className="mt-4 pt-3 border-top text-center">
            <p className="text-muted mb-2">
              Want to be notified when {company.name} starts hiring?
            </p>
            <Button
              variant="outline-primary"
              size="sm"
              className="rounded-pill"
              onClick={() => {
                // Follow company for job alerts
                console.log('Follow company for job alerts');
              }}
            >
              Follow for Job Alerts
            </Button>
          </div>
        )}
      </Card.Body>

      <Card.Footer className="bg-light border-0 py-3">
        <div className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Last updated: {new Date().toLocaleDateString()}
          </small>
          <Button 
            variant="link" 
            size="sm" 
            className="text-decoration-none p-0"
            onClick={handleViewAllJobs}
          >
            <small>Go to Jobs Dashboard →</small>
          </Button>
        </div>
      </Card.Footer>
    </Card>
  );
}

// Add custom CSS for hover effects
const customStyles = `
  .hover-bg-light:hover {
    background-color: #f8f9fa !important;
    transform: translateX(4px);
    transition: all 0.2s ease;
  }
  
  .cursor-pointer {
    cursor: pointer;
  }
  
  .job-card-transition {
    transition: all 0.3s ease;
  }
  
  .job-card-transition:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
  }
`;

// Add the styles to the document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = customStyles;
  document.head.appendChild(styleSheet);
}