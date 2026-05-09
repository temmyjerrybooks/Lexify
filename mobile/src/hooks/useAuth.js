import { useDispatch, useSelector } from 'react-redux';
import {
  loginUser, registerUser, logoutUser, completeOnboarding,
  selectUser, selectIsAuthenticated, selectAuthLoading, selectAuthError, selectSubscriptionTier,
  clearError,
} from '../store/slices/authSlice';

// Convenience hook for auth state and actions
const useAuth = () => {
  const dispatch = useDispatch();
  return {
    user: useSelector(selectUser),
    isAuthenticated: useSelector(selectIsAuthenticated),
    isLoading: useSelector(selectAuthLoading),
    error: useSelector(selectAuthError),
    tier: useSelector(selectSubscriptionTier),
    isPro: ['PRO', 'ELITE'].includes(useSelector(selectSubscriptionTier)),
    isElite: useSelector(selectSubscriptionTier) === 'ELITE',

    login: (email, password) => dispatch(loginUser({ email, password })),
    register: (data) => dispatch(registerUser(data)),
    logout: () => dispatch(logoutUser()),
    completeOnboarding: (data) => dispatch(completeOnboarding(data)),
    clearError: () => dispatch(clearError()),
  };
};

export default useAuth;
