// components/company/tabs/OverviewTab.tsx
import { Card, Col, Row, ListGroup, Button, Badge } from 'react-bootstrap';
import { 
  FaGlobe, 
  FaPhone, 
  FaEnvelope, 
  FaBuilding, 
  FaCalendarAlt,
  FaExternalLinkAlt,
  FaEdit
} from 'react-icons/fa';

interface OverviewTabProps {
  company: any;
  canEdit: boolean;
  onEditClick: () => void;
  getSizeLabel: (size: string) => string;
}

export default function OverviewTab({
  company,
  canEdit,
  onEditClick,
  getSizeLabel
}: OverviewTabProps) {
  return (
    <Row>
      <Col lg={8}>
        {/* About Section */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <Card.Title className="h5 fw-bold mb-0">
                About {company.name}
              </Card.Title>
              {canEdit && (
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={onEditClick}
                >
                  <FaEdit className="me-2" />
                  Edit
                </Button>
              )}
            </div>
            <p className="mb-4">{company.description}</p>
            
            <div className="row g-4">
              <div className="col-md-6">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-light rounded-circle p-3 me-3">
                    <FaGlobe className="text-primary" />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1">Website</h6>
                    {company.website ? (
                      <a 
                        href={company.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-decoration-none"
                      >
                        {company.website.replace(/^https?:\/\//, '')}
                        <FaExternalLinkAlt className="ms-1" size={12} />
                      </a>
                    ) : (
                      <span className="text-muted">Not provided</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-light rounded-circle p-3 me-3">
                    <FaPhone className="text-success" />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1">Phone</h6>
                    <span>{company.phone || 'Not provided'}</span>
                  </div>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-light rounded-circle p-3 me-3">
                    <FaEnvelope className="text-danger" />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1">Email</h6>
                    <a href={`mailto:${company.email}`} className="text-decoration-none">
                      {company.email}
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="col-md-6">
                <div className="d-flex align-items-center mb-3">
                  <div className="bg-light rounded-circle p-3 me-3">
                    <FaBuilding className="text-warning" />
                  </div>
                  <div>
                    <h6 className="fw-bold mb-1">Company Size</h6>
                    <span>{getSizeLabel(company.size)}</span>
                  </div>
                </div>
              </div>
              
              {company.foundedYear && (
                <div className="col-md-6">
                  <div className="d-flex align-items-center mb-3">
                    <div className="bg-light rounded-circle p-3 me-3">
                      <FaCalendarAlt className="text-info" />
                    </div>
                    <div>
                      <h6 className="fw-bold mb-1">Founded</h6>
                      <span>{company.foundedYear}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      </Col>
      
      <Col lg={4}>
        {/* Contact Info */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <Card.Title className="h5 fw-bold mb-4">
              Contact Information
            </Card.Title>
            <ListGroup variant="flush">
              <ListGroup.Item className="border-0 py-3 d-flex align-items-center">
                <FaEnvelope className="text-primary me-3" />
                <a href={`mailto:${company.email}`} className="text-decoration-none">
                  {company.email}
                </a>
              </ListGroup.Item>
              
              {company.website && (
                <ListGroup.Item className="border-0 py-3 d-flex align-items-center">
                  <FaGlobe className="text-primary me-3" />
                  <a 
                    href={company.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-decoration-none"
                  >
                    Visit Website
                  </a>
                </ListGroup.Item>
              )}
              
              {company.phone && (
                <ListGroup.Item className="border-0 py-3 d-flex align-items-center">
                  <FaPhone className="text-primary me-3" />
                  <span>{company.phone}</span>
                </ListGroup.Item>
              )}
              
              <ListGroup.Item className="border-0 py-3 d-flex align-items-center">
                <FaGlobe className="text-primary me-3" />
                <span>{company.location}</span>
              </ListGroup.Item>
            </ListGroup>
          </Card.Body>
        </Card>
        
        {/* Social Media */}
        {Object.keys(company.socialLinks || {}).length > 0 && (
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-4">
              <Card.Title className="h5 fw-bold mb-4">
                Follow Us
              </Card.Title>
              <div className="d-flex flex-wrap gap-2">
                {company.socialLinks?.linkedin && (
                  <Button
                    variant="outline-primary"
                    href={company.socialLinks.linkedin}
                    target="_blank"
                    className="rounded-circle p-3"
                  >
                    <FaGlobe size={20} />
                  </Button>
                )}
                
                {company.socialLinks?.twitter && (
                  <Button
                    variant="outline-info"
                    href={company.socialLinks.twitter}
                    target="_blank"
                    className="rounded-circle p-3"
                  >
                    <FaGlobe size={20} />
                  </Button>
                )}
                
                {company.socialLinks?.facebook && (
                  <Button
                    variant="outline-primary"
                    href={company.socialLinks.facebook}
                    target="_blank"
                    className="rounded-circle p-3"
                  >
                    <FaGlobe size={20} />
                  </Button>
                )}
                
                {company.socialLinks?.instagram && (
                  <Button
                    variant="outline-danger"
                    href={company.socialLinks.instagram}
                    target="_blank"
                    className="rounded-circle p-3"
                  >
                    <FaGlobe size={20} />
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        )}
      </Col>
    </Row>
  );
}