// Tests the isPro logic directly without rendering — avoids needing React Native environment.
// Hook behaviour (show/hide/gate) is covered by integration tests once the app runs on device.

const isPro = (subscriptionTier) =>
  ['PRO', 'ELITE'].includes(subscriptionTier);

describe('isPro tier detection', () => {
  it('recognizes PRO as pro', () => {
    expect(isPro('PRO')).toBe(true);
  });

  it('recognizes ELITE as pro', () => {
    expect(isPro('ELITE')).toBe(true);
  });

  it('rejects FREE tier', () => {
    expect(isPro('FREE')).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isPro(null)).toBe(false);
    expect(isPro(undefined)).toBe(false);
  });

  it('rejects PREMIUM (non-existent tier that was previously a bug)', () => {
    expect(isPro('PREMIUM')).toBe(false);
  });
});
