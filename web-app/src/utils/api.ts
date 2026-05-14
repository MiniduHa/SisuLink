const API_BASE_URL = 'http://localhost:5000/api';

export const api = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem('sisuLinkToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    return response;
  },

  post: async (endpoint: string, body: any) => {
    const token = localStorage.getItem('sisuLinkToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    return response;
  },

  put: async (endpoint: string, body: any) => {
    const token = localStorage.getItem('sisuLinkToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    return response;
  },

  delete: async (endpoint: string) => {
    const token = localStorage.getItem('sisuLinkToken');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });

    return response;
  },
  
  // Method specifically for file uploads
  upload: async (endpoint: string, formData: FormData) => {
    const token = localStorage.getItem('sisuLinkToken');
    const headers: HeadersInit = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return response;
  }
};
