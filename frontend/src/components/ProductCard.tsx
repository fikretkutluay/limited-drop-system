import { useState } from 'react';
import { Clock, AlertCircle, CheckCircle, ShoppingBag, Loader2 } from 'lucide-react';
import type { Product } from '../types';
import { reserveProduct, checkout, DEMO_USER_ID } from '../services/api';
import { useCountdown } from '../hooks/useCountdown';
import { isAxiosError } from 'axios';

interface ProductCardProps {
  product: Product;
  onReservationSuccess: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onReservationSuccess }) => {
  const [isReserving, setIsReserving] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [orderCompleted, setOrderCompleted] = useState(false);

  const { minutes, seconds, isExpired } = useCountdown(expiresAt);

  const handleReserve = async () => {
    setError(null);
    setIsReserving(true);
    try {
      const response = await reserveProduct(product.id, 1, DEMO_USER_ID);
      setReservationId(response.reservationId);
      setExpiresAt(new Date(Date.now() + 5 * 60 * 1000));
      onReservationSuccess();
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.error || 'Reservation failed. Stock might be depleted.');
      } else {
        setError('An unexpected error occurred during reservation.');
      }
    } finally {
      setIsReserving(false);
    }
  };

  const handleCheckout = async () => {
    if (!reservationId) return;
    setError(null);
    setIsCheckingOut(true);
    try {
      await checkout(reservationId, DEMO_USER_ID);
      setOrderCompleted(true);
      setExpiresAt(null);
    } catch (err: unknown) {
      if (isAxiosError(err)) {
        setError(err.response?.data?.error || 'Checkout failed.');
      } else {
        setError('An unexpected error occurred during checkout.');
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  const isSoldOut = product.stock <= 0;
  const isReserved = reservationId !== null && !isExpired && !orderCompleted;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 flex flex-col gap-4 max-w-sm w-full transition-all hover:shadow-xl">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{product.name}</h2>
          <p className="text-sm text-gray-500 mt-1">Limited Edition Drop</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-bold ${isSoldOut ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
          {isSoldOut ? 'SOLD OUT' : `Stock: ${product.stock}`}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-start gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {isExpired && !orderCompleted && (
        <div className="bg-orange-50 text-orange-600 p-3 rounded-lg flex items-center gap-2 text-sm">
          <Clock className="w-5 h-5" />
          <p>Reservation expired. Stock has been released.</p>
        </div>
      )}

      {orderCompleted && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg flex flex-col items-center gap-2 text-center">
          <CheckCircle className="w-8 h-8" />
          <p className="font-bold">Order Successful!</p>
          <p className="text-sm">Item has been reserved for you.</p>
        </div>
      )}

      {!orderCompleted && !isReserved && (
        <button
          onClick={handleReserve}
          disabled={isSoldOut || isReserving || isExpired}
          className={`mt-auto w-full py-3 px-4 rounded-lg font-bold flex justify-center items-center gap-2 text-white transition-colors
            ${isSoldOut || isExpired 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-black hover:bg-gray-800 active:scale-95'}`}
        >
          {isReserving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
          {isReserving ? 'Reserving...' : isSoldOut ? 'Out of Stock' : 'Reserve Now'}
        </button>
      )}

      {isReserved && (
        <div className="mt-auto border-t pt-4">
          <div className="flex justify-between items-center mb-3 text-red-500 font-bold">
            <span className="flex items-center gap-1 text-sm"><Clock className="w-4 h-4"/> Time Left:</span>
            <span className="font-mono text-lg">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={isCheckingOut}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex justify-center items-center transition-colors active:scale-95"
          >
            {isCheckingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Checkout'}
          </button>
        </div>
      )}
    </div>
  );
};