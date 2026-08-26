import { PAGINATION_DEFAULTS, PAGINATION_MAX_PAGE_SIZE } from "../config/constants";
import type { PaginationMeta } from "../types/common.types";

export interface PageParams {
  page: number;
  pageSize: number;
  from: number;
  to: number;
}

export function parsePageParams(query: { page?: string; pageSize?: string }): PageParams {
  const page = Math.max(1, Number.parseInt(query.page ?? "", 10) || PAGINATION_DEFAULTS.page);
  let pageSize = Number.parseInt(query.pageSize ?? "", 10) || PAGINATION_DEFAULTS.pageSize;
  pageSize = Math.min(Math.max(1, pageSize), PAGINATION_MAX_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize - 1 };
}

export function buildPaginationMeta(params: PageParams, total: number | null): PaginationMeta {
  const safeTotal = total ?? 0;
  return {
    page: params.page,
    pageSize: params.pageSize,
    total: safeTotal,
    totalPages: Math.max(1, Math.ceil(safeTotal / params.pageSize))
  };
}
