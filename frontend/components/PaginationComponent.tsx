// components/PaginationComponent.tsx
import React from 'react';
import { Pagination, Form, InputGroup, Button } from 'react-bootstrap';

interface PaginationComponentProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number;
  showQuickJump?: boolean;
  className?: string;
}

const PaginationComponent: React.FC<PaginationComponentProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
  showQuickJump = true,
  className = ''
}) => {
  // Don't render if only one page
  if (totalPages <= 1) return null;

  // Calculate visible page range
  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const handleFirstPage = () => handlePageClick(1);
  const handleLastPage = () => handlePageClick(totalPages);
  const handlePrevPage = () => handlePageClick(currentPage - 1);
  const handleNextPage = () => handlePageClick(currentPage + 1);

  const handleQuickJump = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.elements.namedItem('pageNumber') as HTMLInputElement;
    const page = parseInt(input.value, 10);
    
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageClick(page);
      input.value = '';
    }
  };

  // Calculate showing range
  const getShowingRange = () => {
    return {
      start: (currentPage - 1) * 10 + 1,
      end: Math.min(currentPage * 10, totalPages * 10)
    };
  };

  const showingRange = getShowingRange();

  return (
    <div className={`pagination-wrapper ${className}`}>
      {/* Showing range info */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="text-muted small">
          Showing <span className="fw-semibold">{showingRange.start}-{showingRange.end}</span> of <span className="fw-semibold">{totalPages * 10}</span> results
        </div>
        
        {showQuickJump && (
          <Form onSubmit={handleQuickJump} className="d-flex align-items-center">
            <InputGroup size="sm" style={{ width: '150px' }}>
              <InputGroup.Text className="bg-light">
                <i className="bi bi-arrow-right-short"></i>
              </InputGroup.Text>
              <Form.Control
                type="number"
                name="pageNumber"
                placeholder="Go to page"
                min="1"
                max={totalPages}
                className="border"
              />
              <Button 
                type="submit" 
                variant="outline-primary"
                size="sm"
              >
                Go
              </Button>
            </InputGroup>
          </Form>
        )}
      </div>

      {/* Pagination controls */}
      <div className="d-flex justify-content-center">
        <Pagination className="mb-0">
          {/* First page button */}
          <Pagination.First 
            onClick={handleFirstPage}
            disabled={currentPage === 1}
            title="Go to first page"
          />

          {/* Previous page button */}
          <Pagination.Prev 
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            title="Go to previous page"
          />

          {/* Show first page with ellipsis if needed */}
          {!visiblePages.includes(1) && (
            <>
              <Pagination.Item onClick={() => handlePageClick(1)}>
                1
              </Pagination.Item>
              {visiblePages[0] > 2 && (
                <Pagination.Ellipsis disabled />
              )}
            </>
          )}

          {/* Visible page numbers */}
          {visiblePages.map(page => (
            <Pagination.Item
              key={page}
              active={page === currentPage}
              onClick={() => handlePageClick(page)}
              className={page === currentPage ? 'fw-bold' : ''}
            >
              {page}
            </Pagination.Item>
          ))}

          {/* Show last page with ellipsis if needed */}
          {!visiblePages.includes(totalPages) && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                <Pagination.Ellipsis disabled />
              )}
              <Pagination.Item onClick={() => handlePageClick(totalPages)}>
                {totalPages}
              </Pagination.Item>
            </>
          )}

          {/* Next page button */}
          <Pagination.Next 
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            title="Go to next page"
          />

          {/* Last page button */}
          <Pagination.Last 
            onClick={handleLastPage}
            disabled={currentPage === totalPages}
            title="Go to last page"
          />
        </Pagination>
      </div>

      {/* Page size selector (optional) */}
      <div className="d-flex justify-content-center align-items-center mt-3">
        <div className="text-muted small me-2">Page</div>
        <div className="fw-semibold text-primary mx-1">{currentPage}</div>
        <div className="text-muted small mx-1">of</div>
        <div className="fw-semibold mx-1">{totalPages}</div>
        
        {/* Quick page jump buttons */}
        <div className="ms-3 d-flex gap-1">
          {currentPage > 1 && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handlePrevPage}
              title="Previous page"
              className="d-flex align-items-center"
            >
              <i className="bi bi-chevron-left"></i>
            </Button>
          )}
          
          {currentPage < totalPages && (
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={handleNextPage}
              title="Next page"
              className="d-flex align-items-center"
            >
              <i className="bi bi-chevron-right"></i>
            </Button>
          )}
        </div>
      </div>

      {/* CSS for custom styling */}
      <style jsx>{`
        .pagination-wrapper :global(.page-link) {
          border: 1px solid #dee2e6;
          color: #495057;
          transition: all 0.2s ease;
          min-width: 45px;
          text-align: center;
        }
        
        .pagination-wrapper :global(.page-link:hover) {
          background-color: #e9ecef;
          border-color: #dee2e6;
          color: #0d6efd;
          transform: translateY(-1px);
        }
        
        .pagination-wrapper :global(.page-item.active .page-link) {
          background-color: #0d6efd;
          border-color: #0d6efd;
          color: white;
          box-shadow: 0 2px 4px rgba(13, 110, 253, 0.2);
        }
        
        .pagination-wrapper :global(.page-item.disabled .page-link) {
          color: #6c757d;
          background-color: #f8f9fa;
          border-color: #dee2e6;
          cursor: not-allowed;
        }
        
        .pagination-wrapper :global(.pagination) {
          margin-bottom: 0;
        }
        
        @media (max-width: 768px) {
          .pagination-wrapper {
            padding: 0.5rem;
          }
          
          .pagination-wrapper :global(.page-link) {
            padding: 0.375rem 0.5rem;
            font-size: 0.875rem;
            min-width: 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default PaginationComponent;