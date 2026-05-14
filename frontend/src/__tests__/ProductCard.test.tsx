import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductCard } from '../components/ProductCard';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  reserveProduct: vi.fn(),
  checkout: vi.fn(),
  DEMO_USER_ID: 'demo-user',
}));

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    stock: 5,
    version: 1,
    createdAt: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders product details correctly', () => {
    render(<ProductCard product={mockProduct} onReservationSuccess={() => {}} />);
    expect(screen.getByText('Test Product')).toBeDefined();
    expect(screen.getByText('Stock: 5')).toBeDefined();
  });

  it('shows out of stock when stock is 0', () => {
    render(<ProductCard product={{ ...mockProduct, stock: 0 }} onReservationSuccess={() => {}} />);
    expect(screen.getByText('SOLD OUT')).toBeDefined();
    expect(screen.getByRole('button', { name: /Out of Stock/i })).toHaveProperty('disabled', true);
  });

  it('handles reservation error', async () => {
    (api.reserveProduct as any).mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'Race condition occurred' } }
    });

    render(<ProductCard product={mockProduct} onReservationSuccess={() => {}} />);
    
    const reserveButton = screen.getByRole('button', { name: /Reserve Now/i });
    fireEvent.click(reserveButton);

    await waitFor(() => {
      expect(screen.getByText('Race condition occurred')).toBeDefined();
    });
  });

  it('handles successful reservation and checkout', async () => {
    (api.reserveProduct as any).mockResolvedValue({ reservationId: 'res-1' });
    (api.checkout as any).mockResolvedValue({ orderId: 'ord-1' });

    const onSuccess = vi.fn();
    render(<ProductCard product={mockProduct} onReservationSuccess={onSuccess} />);
    
    // Reserve
    const reserveButton = screen.getByRole('button', { name: /Reserve Now/i });
    fireEvent.click(reserveButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Complete Checkout/i })).toBeDefined();
    });

    // Checkout
    const checkoutButton = screen.getByRole('button', { name: /Complete Checkout/i });
    fireEvent.click(checkoutButton);

    await waitFor(() => {
      expect(screen.getByText('Order Successful!')).toBeDefined();
    });
  });
});
