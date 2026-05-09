const supabase = require('../config/supabase');
const { AppError } = require('../middleware/errorHandler');

const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['full_name', 'username', 'target_exam', 'target_band', 'exam_date', 'country_code', 'timezone', 'notification_enabled'];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key))
    );

    if (updates.username) {
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', updates.username).neq('id', req.userId).maybeSingle();
      if (existing) return res.status(409).json({ error: 'Username already taken.' });
    }

    const { data, error } = await supabase
      .from('profiles').update(updates).eq('id', req.userId).select().single();

    if (error) throw new AppError('Failed to update profile.', 500);
    res.json({ profile: data });
  } catch (err) {
    next(err);
  }
};

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Image file is required.' });

    const ext = req.file.mimetype.split('/')[1] || 'jpg';
    const path = `${req.userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars').upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (uploadError) throw new AppError('Failed to upload avatar.', 500);

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', req.userId);

    res.json({ avatar_url: publicUrl });
  } catch (err) {
    next(err);
  }
};

const getNotifications = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw new AppError('Failed to fetch notifications.', 500);
    res.json({ notifications: data, unread_count: data.filter(n => !n.read).length });
  } catch (err) {
    next(err);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    await supabase.from('notifications').update({ read: true }).eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { updateProfile, uploadAvatar, getNotifications, markNotificationRead };
