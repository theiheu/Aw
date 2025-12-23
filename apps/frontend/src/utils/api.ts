/**
 * API Service for communicating with the backend
 * Handles all HTTP requests for tickets and other resources
 */

import { API_CONFIG, CACHE_CONFIG } from '../constants/app';

const API_BASE_URL = API_CONFIG.BACKEND_URL;

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Simple in-memory cache entry */
interface CacheEntry<T> {
  expiry: number;
  data: T;
}

type CreatePrintJobDto = {
  machineId: string;
  copies?: number;
  printerName?: string;
  idempotencyKey?: string;
  ticketId?: number;
  code?: string;
  plateNumber?: string;
  weighInWeight?: number;
  weighOutWeight?: number;
  netWeight?: number;
  direction?: string;
};

type PrintJobStatusResponse = {
  id: string;
  dbId: number;
  machineId: string;
  ticketId?: number;
  status: 'PENDING' | 'SENT' | 'COMPLETED' | 'FAILED' | 'NOT_FOUND';
  errorMessage?: string | null;
  message?: string;
  copies: number;
  createdAt: string;
  updatedAt: string;
  pdfUrl?: string;
};

class ApiService {
  private baseUrl: string;
  private token: string | null = null;
  private cache = new Map<string, CacheEntry<any>>();

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private loadToken() {
    // Load token from localStorage if available
    const stored = localStorage.getItem('authToken');
    if (stored) {
      this.token = stored;
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response.json();
  }

  private cacheKey(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  private setToCache<T>(key: string, data: T, ttlMs: number) {
    this.cache.set(key, { data, expiry: Date.now() + ttlMs });
  }

  private invalidateCacheByPrefix(prefixPath: string) {
    const prefix = this.cacheKey(prefixPath);
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Core request with timeout & retry and optional cache for GET
   */
  private async request<T>(
    path: string,
    init: RequestInit & { useCache?: boolean; cacheTTL?: number } = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    // Cache only for GET requests when enabled
    const method = (init.method || 'GET').toUpperCase();
    const shouldUseCache = method === 'GET' && init.useCache;
    const key = this.cacheKey(path);

    if (shouldUseCache) {
      const cached = this.getFromCache<T>(key);
      if (cached) return cached;
    }

    const retries = API_CONFIG.RETRY_ATTEMPTS;
    const baseDelay = API_CONFIG.RETRY_DELAY;
    const timeoutMs = API_CONFIG.REQUEST_TIMEOUT;

    let lastError: any = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, { ...init, signal: controller.signal });
        clearTimeout(timeout);
        const data = await this.handleResponse<T>(response);

        if (shouldUseCache) {
          const ttl = init.cacheTTL ?? CACHE_CONFIG.TICKET_CACHE_TTL;
          this.setToCache(key, data, ttl);
        }

        return data;
      } catch (err) {
        clearTimeout(timeout);
        lastError = err;
        const isLast = attempt === retries;
        if (isLast) break;
        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((res) => setTimeout(res, delay));
      }
    }

    throw lastError || new Error('Request failed');
  }

  // Ticket endpoints
  async createTicket(ticketData: any): Promise<any> {
    const data = await this.request<any>(`/tickets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(ticketData),
    });
    // Invalidate ticket caches after mutation
    this.invalidateCacheByPrefix('/tickets');
    return data;
  }

  async getTickets(filters?: {
    stationId?: string;
    status?: string;
    from?: string;
    to?: string;
    userId?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.stationId) params.append('stationId', filters.stationId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.from) params.append('from', filters.from);
    if (filters?.to) params.append('to', filters.to);
    if (filters?.userId) params.append('userId', filters.userId);

    return this.request<any[]>(`/tickets?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
      useCache: true,
      cacheTTL: CACHE_CONFIG.TICKET_CACHE_TTL,
    });
  }

  async getTicketsByUser(userId: string): Promise<any[]> {
    return this.getTickets({ userId });
  }

  async getTicket(id: string): Promise<any> {
    return this.request<any>(`/tickets/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
      useCache: true,
      cacheTTL: CACHE_CONFIG.TICKET_CACHE_TTL,
    });
  }

  async updateTicket(id: string, updateData: any): Promise<any> {
    const data = await this.request<any>(`/tickets/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updateData),
    });
    this.invalidateCacheByPrefix('/tickets');
    return data;
  }

  async submitTicketForApproval(id: string): Promise<any> {
    const data = await this.request<any>(`/tickets/${id}/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    this.invalidateCacheByPrefix('/tickets');
    return data;
  }

  async approveTicket(id: string): Promise<any> {
    const data = await this.request<any>(`/tickets/${id}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    this.invalidateCacheByPrefix('/tickets');
    return data;
  }

  async rejectTicket(id: string, reason: string): Promise<any> {
    const data = await this.request<any>(`/tickets/${id}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    this.invalidateCacheByPrefix('/tickets');
    return data;
  }

  async cancelTicket(id: string): Promise<any> {
    const data = await this.request<any>(`/tickets/${id}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    this.invalidateCacheByPrefix('/tickets');
    return data;
  }

  // Print jobs
  async createPrintJob(dto: CreatePrintJobDto): Promise<PrintJobStatusResponse> {
    return this.request<PrintJobStatusResponse>(`/print-jobs`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(dto),
    });
  }

  async getPrintJobStatus(id: string): Promise<PrintJobStatusResponse> {
    return this.request<PrintJobStatusResponse>(`/print-jobs/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  // Auth endpoints
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    const data = await this.request<{ token: string; user: any }>(`/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if ((data as any)?.token) {
      this.setToken((data as any).token);
    }
    return data;
  }

  async getCurrentUser(): Promise<any> {
    return this.request<any>(`/auth/me`, {
      method: 'GET',
      headers: this.getHeaders(),
      useCache: true,
      cacheTTL: 60 * 1000, // cache current user for 1 minute
    });
  }

  async logout(): Promise<void> {
    this.clearToken();
    this.invalidateCacheByPrefix('');
  }
}

export const apiService = new ApiService();
export default apiService;
