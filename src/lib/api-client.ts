/**
 * FastAPI Backend API Client
 * Connects Next.js frontend to FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiError extends Error {
  constructor(
    public status: number,
    public data: any,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from localStorage or cookie
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('access_token') 
    : null;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, data, data.detail || 'API request failed');
  }

  return data;
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(response.status, data, data.detail || 'Login failed');
    }

    // Store tokens
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
    }

    return data;
  },

  refresh: async () => {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refresh_token') 
      : null;

    if (!refreshToken) throw new Error('No refresh token');

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(response.status, data, data.detail || 'Token refresh failed');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
    }

    return data;
  },

  me: () => fetchWithAuth('/auth/me'),

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    return fetchWithAuth('/auth/logout', { method: 'POST' });
  },
};

// Doctors API
export const doctorsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    specialty_id?: string;
    governorate?: string;
    priority?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return fetchWithAuth(`/doctors?${searchParams.toString()}`);
  },

  nearby: (params: {
    latitude: number;
    longitude: number;
    radius_meters?: number;
    specialty_id?: string;
    page?: number;
    page_size?: number;
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    return fetchWithAuth(`/doctors/nearby?${searchParams.toString()}`);
  },

  get: (id: string) => fetchWithAuth(`/doctors/${id}`),

  create: (data: any) => fetchWithAuth('/doctors', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: any) => fetchWithAuth(`/doctors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => fetchWithAuth(`/doctors/${id}`, {
    method: 'DELETE',
  }),

  specialties: {
    list: () => fetchWithAuth('/doctors/specialties'),
    create: (data: { name: string }) => fetchWithAuth('/doctors/specialties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },

  locations: {
    list: (doctorId: string) => fetchWithAuth(`/doctors/${doctorId}/locations`),
    create: (doctorId: string, data: any) => fetchWithAuth(`/doctors/${doctorId}/locations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  },
};

// Visits API
export const visitsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    doctor_id?: string;
    rep_id?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return fetchWithAuth(`/visits?${searchParams.toString()}`);
  },

  get: (id: string) => fetchWithAuth(`/visits/${id}`),

  create: (data: any) => fetchWithAuth('/visits', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: any) => fetchWithAuth(`/visits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  checkIn: (id: string, data: { latitude: number; longitude: number }) => 
    fetchWithAuth(`/visits/${id}/check-in`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  checkOut: (id: string, data: {
    latitude: number;
    longitude: number;
    notes?: string;
    doctor_response?: string;
    next_follow_up_date?: string;
    next_follow_up_type?: string;
    next_follow_up_notes?: string;
  }) => fetchWithAuth(`/visits/${id}/check-out`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  addProduct: (visitId: string, productId: string) => fetchWithAuth(`/visits/${visitId}/products`, {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  }),

  removeProduct: (visitId: string, productId: string) => fetchWithAuth(`/visits/${visitId}/products/${productId}`, {
    method: 'DELETE',
  }),
};

// My Doctors API
export const myDoctorsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    interest_level?: string;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return fetchWithAuth(`/my-doctors?${searchParams.toString()}`);
  },

  add: (doctorId: string, interestLevel: string = 'MEDIUM', notes?: string) =>
    fetchWithAuth(`/my-doctors/${doctorId}`, {
      method: 'POST',
      body: JSON.stringify({ interest_level: interestLevel, notes }),
    }),

  update: (doctorId: string, data: { interest_level?: string; notes?: string }) =>
    fetchWithAuth(`/my-doctors/${doctorId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (doctorId: string) => fetchWithAuth(`/my-doctors/${doctorId}`, {
    method: 'DELETE',
  }),
};

// Targets API
export const targetsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    rep_id?: string;
    month?: number;
    year?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return fetchWithAuth(`/targets?${searchParams.toString()}`);
  },

  get: (id: string) => fetchWithAuth(`/targets/${id}`),

  create: (data: any) => fetchWithAuth('/targets', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: any) => fetchWithAuth(`/targets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => fetchWithAuth(`/targets/${id}`, {
    method: 'DELETE',
  }),

  currentForRep: (repId: string) => fetchWithAuth(`/targets/rep/${repId}/current`),
};

// Products API
export const productsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    category?: string;
    is_active?: boolean;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return fetchWithAuth(`/products?${searchParams.toString()}`);
  },

  categories: () => fetchWithAuth('/products/categories'),

  get: (id: string) => fetchWithAuth(`/products/${id}`),

  create: (data: any) => fetchWithAuth('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: any) => fetchWithAuth(`/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  delete: (id: string) => fetchWithAuth(`/products/${id}`, {
    method: 'DELETE',
  }),
};

// Follow-ups API
export const followUpsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    status?: string;
    doctor_id?: string;
    rep_id?: string;
    due_before?: string;
    due_after?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return fetchWithAuth(`/follow-ups?${searchParams.toString()}`);
  },

  overdue: () => fetchWithAuth('/follow-ups/overdue'),

  get: (id: string) => fetchWithAuth(`/follow-ups/${id}`),

  create: (data: any) => fetchWithAuth('/follow-ups', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id: string, data: any) => fetchWithAuth(`/follow-ups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),

  complete: (id: string, notes?: string) => fetchWithAuth(`/follow-ups/${id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  }),

  delete: (id: string) => fetchWithAuth(`/follow-ups/${id}`, {
    method: 'DELETE',
  }),
};

// OSM API
export const osmApi = {
  search: (params: {
    latitude: number;
    longitude: number;
    radius_meters?: number;
    amenity_types?: string;
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    return fetchWithAuth(`/osm/search?${searchParams.toString()}`);
  },

  import: (params: {
    latitude: number;
    longitude: number;
    radius_meters?: number;
    amenity_types?: string;
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value));
    });
    return fetchWithAuth(`/osm/import?${searchParams.toString()}`, {
      method: 'POST',
    });
  },

  reverseGeocode: (latitude: number, longitude: number) =>
    fetchWithAuth(`/osm/reverse-geocode?latitude=${latitude}&longitude=${longitude}`),
};

// Routes API
export const routesApi = {
  optimize: (data: {
    locations: Array<{
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      metadata?: Record<string, any>;
    }>;
    start_location?: {
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      metadata?: Record<string, any>;
    };
    provider?: 'haversine' | 'osrm';
  }) => fetchWithAuth('/routes/optimize', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  distanceMatrix: (locations: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  }>, provider: string = 'haversine') => fetchWithAuth('/routes/distance-matrix', {
    method: 'POST',
    body: JSON.stringify({ locations, provider }),
  }),

  durationMatrix: (locations: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  }>, provider: string = 'haversine') => fetchWithAuth('/routes/duration-matrix', {
    method: 'POST',
    body: JSON.stringify({ locations, provider }),
  }),
};

// Export all APIs
export const api = {
  auth: authApi,
  doctors: doctorsApi,
  visits: visitsApi,
  myDoctors: myDoctorsApi,
  targets: targetsApi,
  products: productsApi,
  followUps: followUpsApi,
  osm: osmApi,
  routes: routesApi,
};

export type { ApiError };