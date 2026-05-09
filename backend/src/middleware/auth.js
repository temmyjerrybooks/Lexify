const { createClient } = require('@supabase/supabase-js');

// This middleware verifies Supabase JWTs issued to mobile clients.
// It creates a user-scoped Supabase client so RLS policies apply automatically.

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
  }

  const token = authHeader.split(' ')[1];

  // Create a client scoped to this user's token — RLS policies will fire
  const userSupabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );

  const { data: { user }, error } = await userSupabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  // Attach user and scoped client to request for use in controllers
  req.user = user;
  req.userSupabase = userSupabase;
  req.userId = user.id;

  next();
};

// Optional auth — attaches user if token present, but doesn't block unauthenticated requests
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    await verifyToken(req, res, next);
  } catch {
    next();
  }
};

// Subscription gate — checks the user's tier before allowing access
const requireSubscription = (minimumTier) => {
  const tierRank = { FREE: 0, PRO: 1, ELITE: 2 };

  return async (req, res, next) => {
    const supabase = require('../config/supabase');

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', req.userId)
      .single();

    if (error || !profile) {
      return res.status(403).json({ error: 'Could not verify subscription.' });
    }

    const userTierRank = tierRank[profile.subscription_tier] ?? 0;
    const requiredRank = tierRank[minimumTier] ?? 0;

    if (userTierRank < requiredRank) {
      return res.status(403).json({
        error: 'Subscription required.',
        required_tier: minimumTier,
        current_tier: profile.subscription_tier,
        upgrade_url: '/subscription',
      });
    }

    req.subscriptionTier = profile.subscription_tier;
    next();
  };
};

module.exports = { verifyToken, optionalAuth, requireSubscription };
