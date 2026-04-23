interface PaginationControlsProps {
  readonly currentPage: number;
  readonly totalItems: number;
  readonly pageSize: number;
  readonly itemLabel: string;
  readonly onPageChange: (page: number) => void;
}

export function PaginationControls({
  currentPage,
  totalItems,
  pageSize,
  itemLabel,
  onPageChange,
}: PaginationControlsProps) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);
  const pageNumbers = getVisiblePageNumbers(currentPage, totalPages);

  return (
    <nav className="pagination-controls" aria-label={`${itemLabel} pages`}>
      <p className="fine-print">
        Showing {startItem}-{endItem} of {totalItems} {itemLabel}.
      </p>

      <div className="pagination-actions">
        <button
          className="btn btn-secondary"
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </button>

        <div className="pagination-page-list" aria-label="Page numbers" role="list">
          {pageNumbers.map((pageNumber) => (
            <button
              aria-current={pageNumber === currentPage ? 'page' : undefined}
              className={`pagination-page-button ${pageNumber === currentPage ? 'pagination-page-button-active' : ''}`}
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
        </div>

        <button
          className="btn btn-secondary"
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  );
}

function getVisiblePageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  return Array.from({ length: 5 }, (_, index) => startPage + index);
}
