// components/company/tabs/PeopleTab.tsx
import { Card, Row, Col, Badge } from 'react-bootstrap';
import { FaCrown, FaUsers, FaEnvelope, FaUserShield } from 'react-icons/fa';

interface PeopleTabProps {
  company: any;
  teamMembers: any[];
  getProfileImageUrl: (profileImage?: string) => string;
  getRoleBadge: (role: string) => JSX.Element;
}

export default function PeopleTab({
  company,
  teamMembers,
  getProfileImageUrl,
  getRoleBadge
}: PeopleTabProps) {
  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <Card.Title className="h5 fw-bold mb-4">
          Team ({teamMembers.length + 1})
        </Card.Title>
        
        <Row className="g-4">
          {/* Owner - Always shown first */}
          <Col md={6}>
            <Card className="border h-100">
              <Card.Body className="p-4">
                <div className="d-flex align-items-start mb-3">
                  {company.owner.profileImage ? (
                    <img
                      src={getProfileImageUrl(company.owner.profileImage)}
                      alt={company.owner.name}
                      className="rounded-circle me-3 object-fit-cover"
                      style={{ width: '64px', height: '64px' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'block';
                      }}
                    />
                  ) : (
                    <div className="bg-warning bg-opacity-10 p-3 rounded-circle me-3">
                      <FaCrown className="text-warning" size={24} />
                    </div>
                  )}
                  <div>
                    <Card.Title className="h6 fw-bold mb-1">
                      {company.owner.name}
                    </Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">
                      Founder & CEO
                    </Card.Subtitle>
                    {getRoleBadge('owner')}
                  </div>
                </div>
                <a 
                  href={`mailto:${company.owner.email}`}
                  className="text-decoration-none small"
                >
                  <FaEnvelope className="me-2" />
                  {company.owner.email}
                </a>
              </Card.Body>
            </Card>
          </Col>

          {/* Team Members - Excluding owner */}
          {teamMembers.map((member) => (
            <Col md={6} key={member.user._id}>
              <Card className="border h-100">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-start mb-3">
                    {member.user.profileImage ? (
                      <img
                        src={getProfileImageUrl(member.user.profileImage)}
                        alt={member.user.name}
                        className="rounded-circle me-3 object-fit-cover"
                        style={{ width: '64px', height: '64px' }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'block';
                        }}
                      />
                    ) : (
                      <div className={`bg-${member.role === 'admin' ? 'danger' : member.role === 'manager' ? 'info' : 'success'} bg-opacity-10 p-3 rounded-circle me-3`}>
                        <FaUsers 
                          className={`text-${member.role === 'admin' ? 'danger' : member.role === 'manager' ? 'info' : 'success'}`} 
                          size={24} 
                        />
                      </div>
                    )}
                    <div>
                      <Card.Title className="h6 fw-bold mb-1">
                        {member.user.name}
                      </Card.Title>
                      <Card.Subtitle className="mb-2 text-muted">
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Card.Subtitle>
                      {getRoleBadge(member.role)}
                    </div>
                  </div>
                  <a 
                    href={`mailto:${member.user.email}`}
                    className="text-decoration-none small"
                  >
                    <FaEnvelope className="me-2" />
                    {member.user.email}
                  </a>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        
        {teamMembers.length === 0 && (
          <div className="text-center py-5">
            <FaUsers size={48} className="text-muted mb-3" />
            <h5 className="mb-3">Team information coming soon</h5>
            <p className="text-muted">
              Check back later to meet the team behind {company.name}
            </p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}