import { useState } from 'react';
import { ManualSeenIntakePage } from '../pages/ManualSeenIntakePage';
import { SeenLibraryPage } from '../pages/SeenLibraryPage';
import { StudyPage } from '../pages/StudyPage';

type AppView = 'study' | 'seen-library' | 'manual-intake';

export function App() {
  const [view, setView] = useState<AppView>('study');

  return (
    <>
      <nav aria-label="App sections" className="app-nav">
        <div className="app-nav-inner">
          <button
            aria-pressed={view === 'study'}
            className={`app-nav-button ${view === 'study' ? 'app-nav-button-active' : ''}`}
            type="button"
            onClick={() => setView('study')}
          >
            Study
          </button>
          <button
            aria-pressed={view === 'seen-library'}
            className={`app-nav-button ${view === 'seen-library' ? 'app-nav-button-active' : ''}`}
            type="button"
            onClick={() => setView('seen-library')}
          >
            Seen library
          </button>
          <button
            aria-pressed={view === 'manual-intake'}
            className={`app-nav-button ${view === 'manual-intake' ? 'app-nav-button-active' : ''}`}
            type="button"
            onClick={() => setView('manual-intake')}
          >
            Manual intake
          </button>
        </div>
      </nav>

      {view === 'study' ? (
        <StudyPage />
      ) : view === 'seen-library' ? (
        <SeenLibraryPage />
      ) : (
        <ManualSeenIntakePage />
      )}
    </>
  );
}
