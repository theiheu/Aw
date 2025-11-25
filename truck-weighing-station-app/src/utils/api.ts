/**
 * API Service for communicating with the backend
 * Handles all HTTP requests for tickets and other resources
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

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

  // Ticket endpoints
  async createTicket(ticketData: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tickets`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(ticketData),
    });
    return this.handleResponse(response);
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

    const response = await fetch(`${this.baseUrl}/tickets?${params.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getTicketsByUser(userId: string): Promise<any[]> {
    return this.getTickets({ userId });
  }

  async getTicket(id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tickets/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateTicket(id: string, updateData: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tickets/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(updateData),
    });
    return this.handleResponse(response);
  }

  async submitTicketForApproval(id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tickets/${id}/submit`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async approveTicket(id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tickets/${id}/approve`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async rejectTicket(id: string, reason: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tickets/${id}/reject`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return this.handleResponse(response);
  }

  async cancelTicket(id: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/tickets/${id}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Auth endpoints
  async login(username: string, password: string): Promise<{ token: string; user: any }> {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await this.handleResponse(response);
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async getCurrentUser(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/auth/me`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async logout(): Promise<void> {
    this.clearToken();
  }
}

export const apiService = new ApiService();
export default apiService;

