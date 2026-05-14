import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../hooks/useCountdown';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial values when expiresAt is null', () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current.minutes).toBe(0);
    expect(result.current.seconds).toBe(0);
    expect(result.current.isExpired).toBe(false);
  });

  it('should calculate remaining time correctly', () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const { result } = renderHook(() => useCountdown(expiresAt));

    expect(result.current.minutes).toBe(5);
    expect(result.current.seconds).toBe(0);
    expect(result.current.isExpired).toBe(false);

    // Advance by 1 minute
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(result.current.minutes).toBe(4);
    expect(result.current.seconds).toBe(0);
  });

  it('should set isExpired when time is up', () => {
    const expiresAt = new Date(Date.now() + 1000); // 1 second
    const { result } = renderHook(() => useCountdown(expiresAt));

    expect(result.current.isExpired).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1500); // Wait 1.5s
    });

    expect(result.current.isExpired).toBe(true);
    expect(result.current.minutes).toBe(0);
    expect(result.current.seconds).toBe(0);
  });
});
