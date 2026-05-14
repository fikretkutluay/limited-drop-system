import axios from 'axios';
import type { Product, ReservationResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getProducts = async (): Promise<Product[]> => {
  const response = await api.get('/products');
  return response.data.data;
};

export const reserveProduct = async (productId: string, quantity: number, userId: string): Promise<ReservationResponse> => {
  const response = await api.post<ReservationResponse>('/reserve', {
    productId,
    quantity,
    userId,
  });
  return response.data;
};

export const checkout = async (reservationId: string, userId: string): Promise<{ orderId: string }> => {
  const response = await api.post('/checkout', {
    reservationId,
    userId,
  });
  return response.data;
};

export const DEMO_USER_ID = "123e4567-e89b-12d3-a456-426614174000";