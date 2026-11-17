/**
 * REPRO — Tracker row, Tuesday Spanish / Nayade Zubiarre, 2026-11-10:
 * "Basketful was not showing anything in her cart once she selected it
 * and would not allow her to submit an order because of this."
 *
 * Root cause (proven by reading the layout code): on a phone viewport
 * (below the `md` breakpoint) the participant frontend has NO way to open
 * the cart at all:
 *
 *   - CustomHeader renders its cart button only when `!isMobile`
 *     (components/refine/CustomHeader.tsx:37,120-129).
 *   - CustomSider returns null on mobile
 *     (components/refine/CustomSider.tsx:88-89), and the "bottom nav" its
 *     comment promises does not exist anywhere in the codebase
 *     (docs/PARTICIPANT_FRONTEND_BUILD.md says so).
 *   - The CartDrawer is rendered inside CustomHeader and its ONLY opener is
 *     that header cart button; ProductsPage has no cart/checkout link.
 *
 * So a participant on a phone can tap + to add items (the cards work, the
 * quantity badge shows) but can never see the cart or reach checkout — which
 * is exactly the reported symptom. The cart itself (react-use-cart,
 * persisted to localStorage under `react-use-cart-basketful-cart`) holds the
 * items fine; the UI simply offers no door into it.
 *
 * The fix already exists on main (ba70376, 2026-10-19: MobileCartBar +
 * AppLayout; the header cart button is shown at every breakpoint). This test
 * asserts the CORRECT end state — a cart entry point exists at a mobile
 * viewport — so it FAILS on the pre-fix layout and PASSES once the mobile
 * cart bar is present. If it fails against the deployed build, the
 * production container is still running pre-fix code and needs a
 * redeploy/restart; see the GitHub issue for the deploy check.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CustomHeader } from '../CustomHeader';
import { AuthProvider } from '../../../providers/AuthContext';
import { CartProvider } from '../../../providers/CartProvider';
import { ValidationProvider } from '../../../providers/ValidationContext';
import type { Balances, ParticipantWindowStatus, ProgramConfig } from '../../../shared/types/api';

// ---------------------------------------------------------------------------
// Mock Refine — the header only needs identity/logout/navigation stubs
// ---------------------------------------------------------------------------
vi.mock('@refinedev/core', () => ({
  useGo: () => vi.fn(),
  useGetIdentity: () => ({
    data: { name: 'Test User', username: 'testuser', customer_number: '1001' },
  }),
  useLogout: () => ({ mutate: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Mock the API endpoints the header tree calls (theme, validation, window)
// ---------------------------------------------------------------------------
vi.mock('../../../shared/api/endpoints', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../shared/api/endpoints')>();
  return {
    ...actual,
    getThemeConfig: vi.fn().mockResolvedValue({ app_name: 'Basketful', logo: null }),
    getProgramConfig: vi.fn().mockResolvedValue({
      grace_amount: 0,
      grace_enabled: false,
      grace_message: '',
      rule_version: 1,
      order_window_open: true,
      order_window_closes: null,
      grace_period_minutes: 0,
      max_items_per_order: null,
      updated_at: '',
    } satisfies ProgramConfig),
    getBalances: vi.fn().mockResolvedValue({
      available_balance: 100,
      hygiene_balance: 33,
      go_fresh_balance: 0,
      full_balance: 100,
    } satisfies Balances),
    getMyWindowStatus: vi.fn().mockResolvedValue({
      is_open: true,
      window_status: 'open',
      seconds_until_change: null,
      next_opens_at: null,
      next_closes_at: null,
      program_name: 'Tuesday Spanish',
      override_reason: null,
    } satisfies ParticipantWindowStatus),
    validateCart: vi.fn().mockResolvedValue({ valid: true, violations: [] }),
    checkAuth: vi.fn().mockResolvedValue({ is_authenticated: false }),
  };
});

// ---------------------------------------------------------------------------
// Viewport control — MUI's useMediaQuery reads window.matchMedia; jsdom has
// none, so stub it and flip `mobileViewport` per test.
// ---------------------------------------------------------------------------
let mobileViewport = false;

function installMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: mobileViewport && query.includes('max-width'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

function renderHeader() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AuthProvider>
          <CartProvider>
            <ValidationProvider>
              <CustomHeader />
            </ValidationProvider>
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Mobile cart access (tracker 2026-11-10, Nayade Zubiarre)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mobileViewport = false;
    installMatchMedia();
    window.localStorage.clear();
  });

  it('mobile viewport: a cart entry point exists (the header cart button)', () => {
    mobileViewport = true;
    renderHeader();

    // MUI renders the ShoppingCart icon with data-testid="ShoppingCartIcon".
    // Pre-fix the button that carries it is not rendered at all below `md`,
    // so this query finds nothing and the test fails — the bug.
    expect(screen.queryByTestId('ShoppingCartIcon')).toBeInTheDocument();
  });

  it('desktop viewport: the cart button is present (control — passes pre- and post-fix)', () => {
    mobileViewport = false;
    renderHeader();

    expect(screen.queryByTestId('ShoppingCartIcon')).toBeInTheDocument();
  });

  it('desktop viewport: clicking the cart button opens the drawer (the button IS the drawer opener)', async () => {
    mobileViewport = false;
    renderHeader();

    const icon = screen.getByTestId('ShoppingCartIcon');
    const button = icon.closest('button');
    expect(button).not.toBeNull();
    fireEvent.click(button as HTMLElement);

    expect(await screen.findByText('Cart (0)')).toBeInTheDocument();
  });
});
