const router = require('express').Router();
const { authRateLimiter } = require('../middleware/rateLimit');
const { verifyToken } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

// Public
router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);
router.post('/reset-password', authRateLimiter, authController.resetPassword);
router.post('/refresh', authController.refreshToken);

// Protected
router.post('/logout', verifyToken, authController.logout);
router.get('/me', verifyToken, authController.getMe);
router.post('/complete-onboarding', verifyToken, authController.completeOnboarding);

module.exports = router;
