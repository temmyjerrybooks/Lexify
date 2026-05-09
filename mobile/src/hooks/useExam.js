import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { examAPI, aiAPI } from '../services/api';
import {
  startExamSession, submitAnswer as submitAnswerThunk,
  completeExamSession, setCurrentExam,
  recordLocalAnswer, advanceQuestion,
} from '../store/slices/examSlice';

// Custom hook that encapsulates all exam-related logic
const useExam = (examId) => {
  const dispatch = useDispatch();
  const examState = useSelector(s => s.exam);

  const { data: examData, isLoading } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => examAPI.getDetails(examId).then(r => r.data),
    enabled: !!examId,
  });

  // FIX [M6]: onSuccess was removed in TanStack Query v5. Use useEffect instead.
  useEffect(() => {
    if (examData?.exam) dispatch(setCurrentExam(examData.exam));
  }, [examData, dispatch]);

  const startSession = useCallback(async () => {
    return dispatch(startExamSession({ examId })).unwrap();
  }, [dispatch, examId]);

  const submitAnswer = useCallback(async (questionId, answer, timeSpent) => {
    dispatch(recordLocalAnswer({ questionId, answer, timeSpent }));
    if (examState.currentSession?.session_id) {
      return dispatch(submitAnswerThunk({
        sessionId: examState.currentSession.session_id,
        questionId,
        answerText: typeof answer === 'string' && answer.length > 1 ? answer : null,
        answerOptions: typeof answer === 'string' && answer.length === 1 ? [answer] : null,
        timeSpentSeconds: timeSpent,
      }));
    }
  }, [dispatch, examState.currentSession]);

  const submitWritingForScoring = useCallback(async (questionId, questionText, answerText, taskNumber) => {
    if (!examState.currentSession?.session_id) return;
    return aiAPI.scoreWriting({
      session_id: examState.currentSession.session_id,
      question_id: questionId,
      task_number: taskNumber,
      question_text: questionText,
      user_answer: answerText,
      exam_type: examData?.exam?.exam_type || 'IELTS',
    });
  }, [examState.currentSession, examData]);

  const submitSpeakingForScoring = useCallback(async (questionId, questionText, audioRecording, partNumber) => {
    if (!examState.currentSession?.session_id) return;
    return aiAPI.scoreSpeaking(audioRecording, {
      session_id: examState.currentSession.session_id,
      question_id: questionId,
      question_text: questionText,
      part_number: partNumber,
      exam_type: examData?.exam?.exam_type || 'IELTS',
    });
  }, [examState.currentSession, examData]);

  const completeSession = useCallback(async () => {
    if (!examState.currentSession?.session_id) return;
    return dispatch(completeExamSession(examState.currentSession.session_id)).unwrap();
  }, [dispatch, examState.currentSession]);

  return {
    exam: examData?.exam,
    isLoading,
    session: examState.currentSession,
    currentQuestion: examState.currentQuestion,
    currentSection: examState.currentSection,
    progress: examState.progress,
    timeRemaining: examState.timeRemaining,
    answers: examState.answers,
    startSession,
    submitAnswer,
    submitWritingForScoring,
    submitSpeakingForScoring,
    completeSession,
  };
};

export default useExam;
