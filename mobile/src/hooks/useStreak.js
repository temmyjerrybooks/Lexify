import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStreak } from '../store/slices/streakSlice';

const useStreak = () => {
  const dispatch = useDispatch();
  const streak = useSelector(s => s.streak);
  const isAuthenticated = useSelector(s => s.auth.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchStreak());
    }
  }, [dispatch, isAuthenticated]);

  return streak;
};

export default useStreak;
