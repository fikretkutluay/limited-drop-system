export interface Product {
  id: string;
  name: string;
  stock: number;
  version: number;
}

export interface ReservationResponse {
  reservationId: string;
}

export interface ApiError {
  error: string;
}