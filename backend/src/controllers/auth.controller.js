const supabase = require('../config/supabase');
const { AppError } = require('../middleware/errorHandler');
const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  full_name: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const onboardingSchema = z.object({
  target_exam: z.enum(['IELTS', 'TEF', 'TCF', 'DALF']).optional(),
  target_band: z.number().min(0).max(9).optional().nullable(),
  exam_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'exam_date must be YYYY-MM-DD').optional().nullable(),
  country_code: z.string().length(2).optional().nullable(),
  timezone: z.string().max(50).optional(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
});

const register = async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { email, password, username, full_name } = parsed.data;

    // Check username uniqueness before creating auth user (avoids orphaned auth entries)
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle();

    if (existingUser) {
      return res.status(409).json({ error: 'Username is already taken.' });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: process.env.NODE_ENV !== 'production',
      user_metadata: { username, full_name },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      throw new AppError(error.message, 400);
    }

    // The database trigger (handle_new_user) auto-creates the profile row.
    res.status(201).json({
      message: 'Account created! Please check your email to verify your account.',
      user_id: data.user.id,
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Return generic message to prevent email enumeration
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url, subscription_tier, target_exam, onboarding_completed, streak_freeze_tokens, total_xp')
      .eq('id', data.user.id)
      .single();

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile,
      },
    });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL}/reset-password`,
    });

    // Always return success — prevents email enumeration attacks
    res.json({ message: 'If that email exists, a password reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// FIX [B1]: Previously, 'token' was validated but never used and supabase.auth.updateUser()
// was called without a session — the reset link's OTP token must be verified first.
const resetPassword = async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { token, new_password } = parsed.data;

    // Verify the OTP token from the reset email, which creates a short-lived session
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (verifyError || !verifyData?.user) {
      return res.status(400).json({ error: 'Invalid or expired password reset link. Please request a new one.' });
    }

    // Now update the password for the verified user
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      verifyData.user.id,
      { password: new_password }
    );

    if (updateError) throw new AppError(updateError.message, 400);

    res.json({ message: 'Password updated successfully. You can now log in with your new password.' });
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'refresh_token is required.' });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Invalid or expired refresh token.' });

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
    });
  } catch (err) {
    next(err);
  }
};

// FIX [S10]: Previously passed req.userId (a UUID) to admin.signOut which expects a JWT.
const logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      await supabase.auth.admin.signOut(token, 'global');
    }
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('id', req.userId)
      .single();

    if (error) throw new AppError('Could not fetch user profile.', 500);

    res.json({ user: { id: req.userId, email: req.user.email, ...profile } });
  } catch (err) {
    next(err);
  }
};

// FIX [S5]: Added Zod validation for all onboarding fields before DB write.
const completeOnboarding = async (req, res, next) => {
  try {
    const parsed = onboardingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    }

    const { target_exam, target_band, exam_date, country_code, timezone } = parsed.data;

    const { error } = await supabase
      .from('profiles')
      .update({
        target_exam,
        target_band: typeof target_band === 'number' ? target_band : null,
        exam_date,
        country_code,
        timezone,
        onboarding_completed: true,
      })
      .eq('id', req.userId);

    if (error) throw new AppError('Could not save onboarding data.', 500);

    res.json({ message: "Onboarding complete. Let's start preparing!" });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, forgotPassword, resetPassword, refreshToken, logout, getMe, completeOnboarding };
