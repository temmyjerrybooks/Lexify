const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const userController = require('../controllers/user.controller');
const multer = require('multer');

// FIX [S2]: Added fileFilter to restrict avatar uploads to image MIME types only.
// Previously any file type could be uploaded (HTML, SVG with scripts, executables, etc.)
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only image files are allowed (JPEG, PNG, WebP, GIF).'));
  },
});

router.use(verifyToken);

router.patch('/profile', userController.updateProfile);
router.post('/avatar', avatarUpload.single('avatar'), userController.uploadAvatar);
router.get('/notifications', userController.getNotifications);
router.patch('/notifications/:id/read', userController.markNotificationRead);

module.exports = router;
