import { useState, useEffect } from 'react';

export const useCountdown = (expiresAt: Date | null) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(0);
      return;
    }

    const calculateTimeLeft = () => {
      const difference = expiresAt.getTime() - new Date().getTime();
      return difference > 0 ? Math.floor(difference / 1000) : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const intervalId = setInterval(() => {
      const current = calculateTimeLeft();
      setTimeLeft(current);
      if (current <= 0) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = expiresAt !== null && timeLeft <= 0;

  return { minutes, seconds, isExpired };
};