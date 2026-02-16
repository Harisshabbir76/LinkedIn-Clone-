'use client';

import { Container, Row, Col, Placeholder } from 'react-bootstrap';

export default function SignupFormSkeleton() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-4" style={{ backgroundColor: '#F0F4F8' }}>
      <Container className="px-4">
        <Row className="justify-content-center">
          <Col xs={12} md={8} lg={6} xl={5}>
            <div className="bg-white p-4 p-md-5 rounded-3 shadow-lg">
              {/* Header Skeleton */}
              <div className="text-center mb-5">
                <Placeholder as="h1" animation="glow" className="mb-3">
                  <Placeholder xs={8} style={{ height: '32px' }} />
                </Placeholder>
                <Placeholder as="p" animation="glow">
                  <Placeholder xs={10} style={{ height: '20px' }} />
                </Placeholder>
              </div>

              {/* Role Toggle Skeleton */}
              <div className="d-flex justify-content-center mb-5">
                <div className="bg-light rounded-pill p-1 d-inline-flex">
                  <Placeholder as="div" animation="glow" style={{ width: '100px', height: '40px', borderRadius: '50rem' }} />
                  <Placeholder as="div" animation="glow" className="ms-1" style={{ width: '100px', height: '40px', borderRadius: '50rem' }} />
                </div>
              </div>

              {/* Form Input Skeletons */}
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="mb-3">
                  <Placeholder as="div" animation="glow">
                    <Placeholder xs={12} style={{ height: '48px' }} />
                  </Placeholder>
                </div>
              ))}

              {/* Button Skeleton */}
              <div className="mb-3">
                <Placeholder as="div" animation="glow">
                  <Placeholder xs={12} style={{ height: '48px' }} />
                </div>
              </div>

              {/* Terms Skeleton */}
              <div className="mb-4">
                <Placeholder as="p" animation="glow" className="text-center">
                  <Placeholder xs={12} style={{ height: '16px' }} />
                </Placeholder>
              </div>

              {/* Divider Skeleton */}
              <div className="d-flex align-items-center my-4">
                <div className="flex-grow-1 border-top" />
                <Placeholder as="span" animation="glow" style={{ width: '40px', height: '20px' }} />
                <div className="flex-grow-1 border-top" />
              </div>

              {/* Google Button Skeleton */}
              <div className="mb-4">
                <Placeholder as="div" animation="glow">
                  <Placeholder xs={12} style={{ height: '48px' }} />
                </div>
              </div>

              {/* Login Link Skeleton */}
              <Placeholder as="p" animation="glow" className="text-center">
                <Placeholder xs={12} style={{ height: '16px' }} />
              </Placeholder>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
}