/**
 * Pagination utilities for optimized list rendering
 */

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

export interface PaginationResult<T> {
  items: T[];
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
}

/**
 * Paginate an array of items
 */
export function paginate<T>(
  items: T[],
  currentPage: number,
  pageSize: number
): PaginationResult<T> {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const start = currentPage * pageSize;
  const end = start + pageSize;

  return {
    items: items.slice(start, end),
    totalPages,
    hasNextPage: currentPage < totalPages - 1,
    hasPreviousPage: currentPage > 0,
    currentPage,
  };
}

/**
 * Calculate pagination info
 */
export function getPaginationInfo(
  totalItems: number,
  currentPage: number,
  pageSize: number
) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalItems);

  return {
    totalPages,
    startItem,
    endItem,
    totalItems,
    currentPage,
  };
}

/**
 * Validate page number
 */
export function validatePageNumber(page: number, totalPages: number): number {
  if (page < 0) return 0;
  if (page >= totalPages) return Math.max(0, totalPages - 1);
  return page;
}

