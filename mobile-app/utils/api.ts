import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use a dynamic IP for local development or a generic one
// 10.0.2.2 is for Android Emulator, localhost for iOS simulator, and 172.x for physical devices
// Adjust this as necessary based on your current physical network IP
const BASE_IP = '172.20.10.7'; 
const PORT = '5000';

export const API_BASE_URL = `http://${BASE_IP}:${PORT}/api`;

export const api = {
  get: async (endpoint: string) => {
    const token = await AsyncStorage.getItem('userToken');
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
    const token = await AsyncStorage.getItem('userToken');
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
    const token = await AsyncStorage.getItem('userToken');
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
    const token = await AsyncStorage.getItem('userToken');
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
    const token = await AsyncStorage.getItem('userToken');
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
