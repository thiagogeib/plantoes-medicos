export function paginate(page: number, limit: number) {
  return { skip: (page - 1) * limit, take: limit }
}

export function paginationMeta(total: number, page: number, limit: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) }
}
