import React from 'react';
import { TabBar } from './components/TabBar';
import type { ViewId } from './components/TabBar';
import { Onboarding } from './components/Onboarding';
import { Toast } from './components/Toast';
import { SessionProvider } from './state/SessionContext';
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

  return (
    <SessionProvider>
      <div className="app-root">
        <React.Suspense fallback={<div className="view" />}>
          {view === 'home' && <HomeView onNavigateToBlocks={() => setView('blocks')} />}
          {view === 'blocks' && <BlocksView />}
          {view === 'insights' && (
            <InsightsView onNavigateToBlocks={() => setView('blocks')} />
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
