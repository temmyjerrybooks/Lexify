const router = require('express').Router();
const { verifyToken, requireSubscription } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimit');
const multer = require('multer');
const aiController = require('../controllers/ai.controller');

// Audio upload config — memory storage (we stream to Supabase Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only audio files are allowed.'));
  },
});

// All AI endpoints require auth + rate limiting
router.use(verifyToken, aiRateLimiter);

// Score a writing answer
router.post('/score/writing', aiController.scoreWriting);

// Transcribe + score a speaking answer
router.post('/score/speaking', upload.single('audio'), aiController.scoreSpeaking);

// Generate AI practice questions on-demand
router.post('/generate/questions', requireSubscription('PRO'), aiController.generateQuestions);

// Chat with AI tutor (Elite only)
router.post('/tutor/chat', requireSubscription('ELITE'), aiController.chatWithTutor);

// Get single feedback record by ID (for async polling)
router.get('/feedback/:feedbackId', aiController.getFeedbackStatus);

// Get all feedback for a session (used by Results screen)
router.get('/feedback/session/:sessionId', aiController.getSessionFeedback);

module.exports = router;
