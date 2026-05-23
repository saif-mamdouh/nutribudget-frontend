import axios from 'axios'

// Use VITE_API_URL in production (Vercel), fallback to /api/v1 for local dev (Vite proxy)
const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  withCredentials: false,  // ← FIX: prevent CORS issues with wildcard origin
  headers: { 'Content-Type': 'application/json' },
})

// ── Auth interceptor ──────────────────────────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh })
          localStorage.setItem('access_token', data.access_token)
          err.config.headers.Authorization = `Bearer ${data.access_token}`
          return api(err.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login:  (data) => api.post('/auth/login', data),
}

// ── User ──────────────────────────────────────────────────────────────────────
export const userAPI = {
  getMe:    ()     => api.get('/users/me'),
  updateMe: (data) => api.patch('/users/me', data),
}

// ── Products ──────────────────────────────────────────────────────────────────
export const productAPI = {
  upload: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/products/upload-csv', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  // FIX: normalize {items, total} → preserve total for pagination, items for list
  list: ({ search, ...rest } = {}) =>
    api.get('/products/', { params: { ...(search ? { q: search } : {}), ...rest } })
      .then(res => {
        const d = res.data
        if (!Array.isArray(d) && d?.items) {
          return { ...res, data: d.items, total: d.total }
        }
        return res
      }),
  stats:  ()         => api.get('/products/stats'),
  update: (id, data) => api.patch(`/products/${id}`, data),
}

// ── Matching ──────────────────────────────────────────────────────────────────
export const matchAPI = {
  run:          (data) => api.post('/match/run', data),
  stats:        ()     => api.get('/match/stats'),
  addNutrition: (data) => api.post('/match/nutrition', data),
  listNutrition:()     => api.get('/match/nutrition?limit=500'),
  preview:      (name) => api.get('/match/preview', { params: { name } }),
}

// ── Optimizer ─────────────────────────────────────────────────────────────────
export const optimizerAPI = {
  plan:           (data)            => api.post('/optimize/plan', data),
  planProfile:    ()                => api.post('/optimize/plan/from-profile'),
  mealPlan:       (data)            => api.post('/optimize/meal-plan', data),
  history:        (limit)           => api.get('/optimize/history?limit=' + (limit || 20)),
  addMeal:        (data)            => api.post('/optimize/add-meal', data),
  weeklyActive:   ()                => api.get('/optimize/weekly/active'),
  swapMeal:       (planId, data)    => api.patch(`/optimize/weekly/${planId}/swap`, data),
  logMeal:        (data)            => api.post('/optimize/log-meal', data),
  unlogMeal:      (logId)           => api.delete(`/optimize/log-meal/${logId}`),
  unlogMealFields:(data)            => api.delete('/optimize/log-meal', { data }),
  todayLogs:      ()                => api.get('/optimize/today-logs'),
  weeklyHistory:  ()                => api.get('/optimize/weekly/history'),
  weeklyById:     (planId)          => api.get(`/optimize/weekly/${planId}`),
}

// ── Personalization ───────────────────────────────────────────────────────────
export const personalizeAPI = {
  plan:            (data) => api.post('/personalize/plan', data),
  history:         ()     => api.get('/personalize/history'),
  feedback:        (data) => api.post('/personalize/feedback', data),
  recommendations: (p)    => api.get('/personalize/recommendations', { params: p }),
  interact:        (data) => api.post('/personalize/interact', data),
  profile:         ()     => api.get('/personalize/profile'),
}

// ── Vision ────────────────────────────────────────────────────────────────────
export const visionAPI = {
  analyze: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/vision/analyze-meal', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  correct: (data) => api.post('/vision/correct', data),
}

export default api

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminAPI = {
  stats:           ()     => api.get('/admin/stats'),
  uploadProducts:  (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/admin/upload/products',  fd, { headers: { 'Content-Type': 'multipart/form-data' } }) },
  uploadNutrition: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/admin/upload/nutrition', fd, { headers: { 'Content-Type': 'multipart/form-data' } }) },
  uploadMapping:   (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/admin/upload/mapping',   fd, { headers: { 'Content-Type': 'multipart/form-data' } }) },
  uploadRecipes:   (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/admin/upload/recipes',   fd, { headers: { 'Content-Type': 'multipart/form-data' } }) },
}

// ── Recipes ───────────────────────────────────────────────────────────────────
export const recipeAPI = {
  // FIX: backend returns {items, total} → normalize to array for pages
  list: (params) => api.get('/recipes/', { params }).then(res => {
    const d = res.data
    if (!Array.isArray(d) && d?.items) {
      return { ...res, data: d.items }
    }
    return res
  }),
  get:    (id)       => api.get(`/recipes/${id}`),
  stats:  ()         => api.get('/recipes/stats'),
  add:    (data)     => api.post('/recipes/', data),
  update: (id, data) => api.put(`/recipes/${id}`, data),
  delete: (id)       => api.delete(`/recipes/${id}`),
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export const chatAPI = {
  send:         (message) => api.post('/chat', { message }),
  history:      ()        => api.get('/chat/history'),
  clearHistory: ()        => api.delete('/chat/history'),
}

// ── Profile / NLP ─────────────────────────────────────────────────────────────
export const profileAPI = {
  parse:  (text) => api.post('/profile/parse', { text }),
  save:   (data) => api.post('/profile/save', data),
  get:    ()     => api.get('/profile'),
  update: (data) => api.patch('/profile', data),
}

// ── Feedback ──────────────────────────────────────────────────────────────────
export const feedbackAPI = {
  submit: (data) => api.post('/feedback', data),
  list:   ()     => api.get('/feedback'),
}