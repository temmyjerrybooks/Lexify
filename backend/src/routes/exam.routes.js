const router = require('express').Router();
const { verifyToken, requireSubscription } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');
const examController = require('../controllers/exam.controller');

// List & discover exams (public — free exams visible without login)
router.get('/', optionalAuth, examController.listExams);
router.get('/:examId', optionalAuth, examController.getExamDetails);

// Session management (requires auth)
router.post('/:examId/sessions/start', verifyToken, examController.startSession);
router.get('/sessions/:sessionId', verifyToken, examController.getSession);
router.get('/sessions/:sessionId/review', verifyToken, examController.getSessionReview);
router.post('/sessions/:sessionId/answer', verifyToken, examController.submitAnswer);
router.post('/sessions/:sessionId/pause', verifyToken, examController.pauseSession);
router.post('/sessions/:sessionId/resume', verifyToken, examController.resumeSession);
router.post('/sessions/:sessionId/complete', verifyToken, examController.completeSession);

// Pro exam access gate
router.get('/pro/:examId', verifyToken, requireSubscription('PRO'), examController.getExamDetails);

// Daily challenge
router.get('/daily/challenge', optionalAuth, examController.getDailyChallenge);

module.exports = router;
