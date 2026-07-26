import React from 'react';
import { TabBar } from './components/TabBar';
import type { ViewId } from './components/TabBar';
import { Onboarding } from './components/Onboarding';
import { Toast } from './components/Toast';
import { SessionProvider } from './state/SessionContext';
import type { DetoxBlock } from './state/blockStore';
import './styles/global.css';
import './App.css';

const HomeView = React.lazy(() =>
  import('./views/HomeView').then((m) => ({ default: m.HomeView })),
);
const BlocksView = React.lazy(() =>
  import('./views/BlocksView').then((m) => ({ default: m.BlocksView })),
);
const SettingsView = React.lazy(() =>
  import('./views/SettingsView').then((m) => ({ default: m.SettingsView })),
);
const InsightsView = React.lazy(() =>
  import('./views/InsightsView').then((m) => ({ default: m.InsightsView })),
);
const RewardsView = React.lazy(() =>
  import('./views/RewardsView').then((m) => ({ default: m.RewardsView })),
);

export const App: React.FC = () => {
  const [view, setView] = React.useState<ViewId>('home');
  const [blockPrefill, setBlockPrefill] = React.useState<Partial<DetoxBlock> | undefined>(undefined);

  const navigateToBlocks = React.useCallback((prefill?: Partial<DetoxBlock>) => {
    setBlockPrefill(prefill);
    setView('blocks');
  }, []);

  return (
    <SessionProvider>
      <div className="app-root">
        <React.Suspense fallback={<div className="view" />}>
          {view === 'home' && <HomeView onNavigateToBlocks={navigateToBlocks} />}
          {view === 'blocks' && (
            <BlocksView
              prefill={blockPrefill}
              onPrefillConsumed={() => setBlockPrefill(undefined)}
            />
          )}
          {view === 'insights' && (
            <InsightsView onNavigateToBlocks={navigateToBlocks} />
          )}
          {view === 'settings' && <SettingsView />}
          {view === 'rewards' && <RewardsView />}
        </React.Suspense>
        <TabBar active={view} onChange={setView} />
        <Onboarding />
        <Toast />
      </div>
    </SessionProvider>
  );
};

export default App;
