/** Liste paginée renvoyée par l'API (pagination de Laravel). */
export interface ListePaginee<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

/** Réponse de l'API qui contient un seul élément. */
export interface Element<T> {
  data: T
}
