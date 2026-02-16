// components/company/tabs/InsightsTab.tsx
import { Card, Row, Col, ListGroup, ProgressBar, Badge, Button } from 'react-bootstrap';
import { 
  FaChartBar, 
  FaUserFriends, 
  FaBriefcase, 
  FaUsers, 
  FaFileAlt, 
  FaArrowUp,
  FaUserCheck,
  FaChartLine,
  FaLock
} from 'react-icons/fa';

interface InsightsTabProps {
  company: any;
  stats: any;
  isAuthenticated: boolean;
  user: any;
  formatNumber: (num: number) => string;
  getEngagementColor: (engagement: number) => string;
  calculateProfileCompleteness: (company: any) => number;
  router: any;
  id: string;
}

export default function InsightsTab({
  company,
  stats,
  isAuthenticated,
  user,
  formatNumber,
  getEngagementColor,
  calculateProfileCompleteness,
  router,
  id
}: InsightsTabProps) {
  // Only show detailed insights to company owners and admins
  if (!isAuthenticated || !company || (user?._id !== company.owner._id && !company.teamMembers.some((m: any) => m.user._id === user?._id && (m.role === 'admin' || m.role === 'manager')))) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4 text-center">
          <FaLock size={48} className="text-muted mb-3" />
          <h5 className="fw-bold mb-3">Insights Locked</h5>
          <p className="text-muted mb-4">
            Detailed insights are only available to company owners and authorized team members.
          </p>
          {!isAuthenticated ? (
            <Button 
              variant="primary" 
              onClick={() => router.push(`/login?redirect=/company/${id}`)}
            >
              Login to View Insights
            </Button>
          ) : user?._id === company.owner._id ? null : (
            <Button 
              variant="outline-primary" 
              onClick={() => console.log('Request access clicked')}
            >
              Request Access
            </Button>
          )}
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <Card.Title className="h5 fw-bold mb-0">
            Company Insights (Last 30 Days)
          </Card.Title>
          <Badge bg={getEngagementColor(stats.engagement)}>
            Engagement: {stats.engagement}%
          </Badge>
        </div>
        
        <Row>
          <Col lg={8}>
            <div className="mb-4">
              <h6 className="fw-bold mb-3">
                <FaChartBar className="me-2" />
                Traffic & Engagement Analytics
              </h6>
              
              <div className="row mb-4">
                <div className="col-md-4 mb-3">
                  <Card className="border h-100">
                    <Card.Body className="text-center">
                      <div className="h4 fw-bold text-primary">{formatNumber(stats.pageViews)}</div>
                      <div className="text-muted small">Total Views</div>
                      <small className="text-muted">{formatNumber(stats.uniqueViews)} unique visitors</small>
                    </Card.Body>
                  </Card>
                </div>
                <div className="col-md-4 mb-3">
                  <Card className="border h-100">
                    <Card.Body className="text-center">
                      <div className="h4 fw-bold text-success">{formatNumber(stats.followers)}</div>
                      <div className="text-muted small">Followers</div>
                      <small className="text-muted">
                        {stats.pageViews > 0 ? 
                          `${((stats.followers / stats.uniqueViews) * 100).toFixed(1)}% follow rate` : 
                          'Follow rate'}
                      </small>
                    </Card.Body>
                  </Card>
                </div>
                <div className="col-md-4 mb-3">
                  <Card className="border h-100">
                    <Card.Body className="text-center">
                      <div className="h4 fw-bold text-info">{formatNumber(stats.recentApplications)}</div>
                      <div className="text-muted small">Recent Applications</div>
                      <small className="text-muted">
                        {stats.pageViews > 0 ? 
                          `${((stats.recentApplications / stats.uniqueViews) * 100).toFixed(1)}% apply rate` : 
                          'Apply rate'}
                      </small>
                    </Card.Body>
                  </Card>
                </div>
              </div>
              
              <div className="mb-4">
                <h6 className="fw-bold mb-3">View Trends (Last 7 Days)</h6>
                {stats.trends.dailyViews && stats.trends.dailyViews.length > 0 ? (
                  <div className="bg-light rounded p-3">
                    {stats.trends.dailyViews.map((day: any, index: number) => (
                      <div key={index} className="d-flex align-items-center mb-2">
                        <small className="text-muted me-3" style={{ width: '80px' }}>
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </small>
                        <div className="flex-grow-1">
                          <div className="d-flex justify-content-between mb-1">
                            <small className="text-muted">
                              {day.totalViews} views ({day.uniqueViews} unique)
                            </small>
                            <small className="fw-bold">
                              {day.totalViews > 0 ? 
                                `${((day.uniqueViews / day.totalViews) * 100).toFixed(0)}% unique` : 
                                '0%'}
                            </small>
                          </div>
                          <ProgressBar 
                            now={(day.totalViews / Math.max(...stats.trends.dailyViews.map((d: any) => d.totalViews))) * 100} 
                            variant="primary"
                            style={{ height: '6px' }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3">
                    <FaChartLine className="text-muted mb-2" size={24} />
                    <p className="text-muted small mb-0">No view data available yet</p>
                    <small className="text-muted">Data will appear as users visit this page</small>
                  </div>
                )}
              </div>
            </div>
          </Col>
          
          <Col lg={4}>
            <div className="mb-4">
              <h6 className="fw-bold mb-3">
                <FaUserFriends className="me-2" />
                Company Activity
              </h6>
              
              <ListGroup variant="flush">
                <ListGroup.Item className="border-0 py-3 d-flex justify-content-between align-items-center">
                  <div>
                    <FaBriefcase className="me-2 text-primary" />
                    Active Jobs
                  </div>
                  <Badge bg="primary" pill>{stats.jobs}</Badge>
                </ListGroup.Item>
                
                <ListGroup.Item className="border-0 py-3 d-flex justify-content-between align-items-center">
                  <div>
                    <FaUsers className="me-2 text-success" />
                    Team Members
                  </div>
                  <Badge bg="success" pill>{stats.teamMembers}</Badge>
                </ListGroup.Item>
                
                <ListGroup.Item className="border-0 py-3 d-flex justify-content-between align-items-center">
                  <div>
                    <FaFileAlt className="me-2 text-info" />
                    Total Applications
                  </div>
                  <Badge bg="info" pill>{formatNumber(stats.totalApplications)}</Badge>
                </ListGroup.Item>
                
                <ListGroup.Item className="border-0 py-3 d-flex justify-content-between align-items-center">
                  <div>
                    <FaArrowUp className="me-2 text-warning" />
                    Engagement Rate
                  </div>
                  <Badge bg={getEngagementColor(stats.engagement)} pill>
                    {stats.engagement}%
                  </Badge>
                </ListGroup.Item>
              </ListGroup>
            </div>
            
            <div>
              <h6 className="fw-bold mb-3">
                <FaUserCheck className="me-2" />
                Performance Metrics
              </h6>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <small className="text-muted">Profile Completeness</small>
                  <small className="fw-bold">
                    {calculateProfileCompleteness(company)}%
                  </small>
                </div>
                <ProgressBar 
                  now={calculateProfileCompleteness(company)} 
                  variant="success"
                  style={{ height: '6px' }}
                />
              </div>
              
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-1">
                  <small className="text-muted">Response Rate</small>
                  <small className="fw-bold">
                    {stats.totalApplications > 0 ? 
                      `${Math.min(100, Math.round((stats.recentApplications / stats.totalApplications) * 100))}%` : 
                      'N/A'}
                  </small>
                </div>
                <ProgressBar 
                  now={stats.totalApplications > 0 ? 
                    Math.min(100, Math.round((stats.recentApplications / stats.totalApplications) * 100)) : 0} 
                  variant="info"
                  style={{ height: '6px' }}
                />
              </div>
              
              <div>
                <div className="d-flex justify-content-between mb-1">
                  <small className="text-muted">Industry Ranking</small>
                  <small className="fw-bold">
                    {stats.engagement > 70 ? 'Top 10%' : 
                     stats.engagement > 40 ? 'Top 30%' : 
                     stats.engagement > 20 ? 'Top 50%' : 'Below Average'}
                  </small>
                </div>
                <ProgressBar 
                  now={stats.engagement} 
                  variant={getEngagementColor(stats.engagement)}
                  style={{ height: '6px' }}
                />
                <small className="text-muted d-block mt-1">
                  Based on engagement in {company?.industry}
                </small>
              </div>
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}