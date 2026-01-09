/**
 * Creates a mock auth script for E2E testing.
 * Call this via page.addInitScript() before navigating.
 */
export function createMockAuthScript(walletAddress: string): string {
  return `
    window.__AUTH_OVERRIDE__ = {
      user: {
        wallet_address: "${walletAddress}",
        id: "test-user-id",
        username: null,
        credits: 100,
        strikes: 0
      },
      isAuthenticated: true,
      isAuthenticating: false,
      signIn: async () => {
        console.log('[Mock Auth] Sign in called');
        return Promise.resolve();
      },
      signOut: async () => {
        console.log('[Mock Auth] Sign out called');
        return Promise.resolve();
      },
    };
  `;
}
