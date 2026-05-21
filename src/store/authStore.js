import { create } from 'zustand'
import { authAPI, userAPI } from '../services/api'

export const useAuthStore = create((set, get) => ({
  user:    null,
  loading: false,
  error:   null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await authAPI.login({ email, password })
      localStorage.setItem('access_token',  data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      const me = await userAPI.getMe()
      set({ user: me.data, loading: false })
      return true
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Invalid email or password', loading: false })
      return false
    }
  },

  signup: async (payload) => {
    set({ loading: true, error: null })
    try {
      await authAPI.signup(payload)
      return await get().login(payload.email, payload.password)
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Signup failed', loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.clear()
    set({ user: null })
  },

  fetchMe: async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      const { data } = await userAPI.getMe()
      set({ user: data })
    } catch {
      localStorage.clear()
    }
  },
}))
