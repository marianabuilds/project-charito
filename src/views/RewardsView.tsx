import React from 'react';
import { rewardsStore } from '../state/rewardsStore';
import type { RewardsState } from '../state/rewardsStore';
import { toastStore } from '../state/toastStore';

// ── Milestone definitions ──────────────────────────────────────────────────

interface Milestone {
  streak: number;
  emoji: string;
  badge: string;
  description: string;
}

const MILESTONES: Milestone[] = [
  { streak: 3,  emoji: '🌱', badge: 'Starter',     description: '3 days of intentional presence.' },
  { streak: 7,  emoji: '🔥', badge: 'Focused',     description: 'A full week of digital clarity.' },
  { streak: 30, emoji: '🌟', badge: 'Present',     description: 'One month of being here, now.' },
  { streak: 90, emoji: '💫', badge: 'Transformed', description: 'Three months — a new relationship with your phone.' },
];

// ── Real-life rewards ──────────────────────────────────────────────────────

interface RewardOffer {
  id: string;
  points: number;
  title: string;
  description: string;
  isCommunity?: boolean;
}

const REWARD_OFFERS: RewardOffer[] = [
  {
    id: 'yoga',
    points: 500,
    title: '10% off yoga & gym',
    description: 'Redeem at partner wellness studios in your city.',
  },
  {
    id: 'premium',
    points: 1000,
    title: 'Free 1-month premium',
    description: 'Unlock all Charito features at no cost.',
  },
  {
    id: 'coaching',
    points: 2000,
    title: '30-min coaching call',
    description: 'One-on-one session with a certified digital wellness expert.',
  },
  {
    id: 'community',
    points: 0,
    title: 'Charito community',
    description: 'Connect with members on the same journey. Always free.',
    isCommunity: true,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatPoints(n: number): string {
  return n.toLocaleString();
}

// ── Component ─────────────────────────────────────────────────────────────

export const RewardsView: React.FC = () => {
  const [state, setState] = React.useState<RewardsState>(rewardsStore.get());

  React.useEffect(() => {
    return rewardsStore.subscribe((next) => setState(next));
  }, []);

  const handleRedeem = () => {
    toastStore.show("Coming soon — we're building the partner network!");
  };

  const currentStreak = state.streak;
  const nextMilestone = MILESTONES.find((m) => m.streak > currentStreak);
  const daysToNext = nextMilestone ? nextMilestone.streak - currentStreak : null;

  return (
    <div className="view">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title" style={{ fontSize: 'clamp(1.75rem, 6vw, 2.25rem)', fontWeight: 400, margin: 0 }}>
          Your rewards
        </h1>
        <p className="app-subtitle" style={{ margin: 0 }}>Earned through presence.</p>
      </header>

      {/* Points summary card */}
      <section className="card rewards-points-card" aria-label="Points summary">
        <p className="card-label" style={{ marginBottom: '1rem' }}>Your balance</p>
        <div className="rewards-points-display">
          <span className="rewards-points-number">{formatPoints(state.points)}</span>
          <span className="rewards-points-unit">pts</span>
        </div>
        <div className="rewards-stats-row">
          <div className="rewards-stat">
            <span className="rewards-stat-value">{state.blocksCompleted}</span>
            <span className="rewards-stat-label">Blocks done</span>
          </div>
          <div className="rewards-stat-divider" />
          <div className="rewards-stat">
            <span className="rewards-stat-value">{currentStreak}</span>
            <span className="rewards-stat-label">Day streak</span>
          </div>
          <div className="rewards-stat-divider" />
          <div className="rewards-stat">
            <span className="rewards-stat-value">{state.longestStreak}</span>
            <span className="rewards-stat-label">Best streak</span>
          </div>
        </div>
        {daysToNext !== null && (
          <p className="rewards-next-milestone">
            {daysToNext === 1
              ? '1 more day to unlock your next badge.'
              : `${daysToNext} more days to unlock your next badge.`}
          </p>
        )}
        {daysToNext === null && (
          <p className="rewards-next-milestone rewards-next-milestone--complete">
            You've unlocked all milestones. 💫
          </p>
        )}
        <p className="rewards-earn-hint">
          +10 pts per block · +100 pts at 7-day streak · +500 pts at 30 days
        </p>
      </section>

      {/* Streak milestones */}
      <section aria-label="Streak milestones">
        <p className="section-label" style={{ marginBottom: '0.625rem' }}>Badges</p>
        <div className="rewards-milestones">
          {MILESTONES.map((m) => {
            const unlocked = currentStreak >= m.streak;
            return (
              <div
                key={m.streak}
                className={`rewards-milestone-card${unlocked ? ' rewards-milestone-card--unlocked' : ' rewards-milestone-card--locked'}`}
                aria-label={`${m.badge} badge — ${unlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="rewards-milestone-emoji" aria-hidden="true">
                  {m.emoji}
                </div>
                <div className="rewards-milestone-text">
                  <p className="rewards-milestone-badge">{m.badge}</p>
                  <p className="rewards-milestone-desc">{m.description}</p>
                  <p className="rewards-milestone-streak">
                    {unlocked ? `✓ Reached at ${m.streak} days` : `${m.streak}-day streak`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Real-life rewards */}
      <section aria-label="Redeem rewards">
        <p className="section-label" style={{ marginBottom: '0.625rem' }}>Redeem</p>
        <div className="rewards-offers">
          {REWARD_OFFERS.map((offer) => {
            const canAfford = state.points >= offer.points;
            return (
              <div
                key={offer.id}
                className={`rewards-offer-card${offer.isCommunity ? ' rewards-offer-card--community' : ''}`}
              >
                <div className="rewards-offer-left">
                  {!offer.isCommunity && (
                    <span
                      className={`rewards-offer-pts${canAfford ? ' rewards-offer-pts--available' : ''}`}
                    >
                      {formatPoints(offer.points)} pts
                    </span>
                  )}
                  {offer.isCommunity && (
                    <span className="rewards-offer-pts rewards-offer-pts--free">Free</span>
                  )}
                  <p className="rewards-offer-title">{offer.title}</p>
                  <p className="rewards-offer-desc">{offer.description}</p>
                </div>
                <button
                  type="button"
                  className="rewards-redeem-btn"
                  onClick={handleRedeem}
                  aria-label={`Redeem ${offer.title}`}
                >
                  Redeem →
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
