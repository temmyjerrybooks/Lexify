import { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/slices/authSlice';

// Central paywall manager — controls when/where upgrade prompts appear
export const usePaywall = () => {
  const user = useSelector(selectUser);
  const [activeContext, setActiveContext] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // FIX [M5]: 'PREMIUM' does not exist — the actual top tier is 'ELITE'.
  const isPro = ['PRO', 'ELITE'].includes(user?.subscription_tier);
  const isFree = !isPro;

  const show = useCallback((context = 'default') => {
    if (isPro) return false;
    setActiveContext(context);
    setIsVisible(true);
    return true;
  }, [isPro]);

  const hide = useCallback(() => {
    setIsVisible(false);
    setActiveContext(null);
  }, []);

  // Gate: returns true if action is allowed, false + shows paywall if not
  const gate = useCallback((condition, context = 'default') => {
    if (isPro) return true;
    if (condition) return true;
    show(context);
    return false;
  }, [isPro, show]);

  // Specific gate functions for common paywall moments
  const gateMockExam = useCallback((completedCount) => {
    return gate(completedCount < 3, 'mock_limit');
  }, [gate]);

  const gateWritingFeedback = useCallback(() => {
    return gate(false, 'writing_unlock');
  }, [gate]);

  const gateSpeakingFeedback = useCallback(() => {
    return gate(false, 'speaking_unlock');
  }, [gate]);

  const gateInsights = useCallback(() => {
    return gate(false, 'insights');
  }, [gate]);

  const gateAdvancedQuestions = useCallback(() => {
    return gate(false, 'advanced');
  }, [gate]);

  return {
    isPro,
    isFree,
    isVisible,
    activeContext,
    show,
    hide,
    gate,
    gateMockExam,
    gateWritingFeedback,
    gateSpeakingFeedback,
    gateInsights,
    gateAdvancedQuestions,
  };
};
