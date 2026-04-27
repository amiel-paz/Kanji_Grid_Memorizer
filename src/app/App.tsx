import { useEffect, useMemo, useRef, useState } from 'react';
import { LoadfileScreen, type LoadfileBarItem } from '../components/LoadfileScreen';
import { canonicalKanjiDeck } from '../data/canonicalDeck';
import { summarizeLoadfileProgress } from '../domain/progress/loadfileSummary';
import {
  createDisabledReviewSchedulerClient,
  createFetchReviewSchedulerClient,
  ReviewSchedulerClientError,
  type ReviewSchedulerClient,
} from '../domain/reviewScheduler/client';
import { ManualSeenIntakePage } from '../pages/ManualSeenIntakePage';
import { SeenLibraryPage } from '../pages/SeenLibraryPage';
import { StudyPage } from '../pages/StudyPage';
import { createProgressStore, loadProgressRecords } from '../state/progressStore';
import {
  createNewLoadfileSlot,
  deleteLoadfileSlot,
  findLoadfileSlot,
  getActiveLoadfileSlot,
  loadLoadfileRegistry,
  markLoadfileOpened,
  renameLoadfileSlot,
  saveLoadfileRegistry,
  type LoadfileRegistry,
  type LoadfileSlot,
} from '../state/loadfileStore';
import {
  getLoadfileLaunchOptions,
  getLoadfileSearch,
  getSlotSearch,
  stripCreateLoadfileFromSearch,
} from './loadfileLaunch';

type AppView = 'study' | 'seen-library' | 'manual-intake';

interface AppProps {
  readonly loadfileSchedulerBaseUrl?: string;
  readonly reviewSchedulerClient?: ReviewSchedulerClient;
}

export function App({
  loadfileSchedulerBaseUrl,
  reviewSchedulerClient,
}: AppProps) {
  const initialSearch = useRef(typeof window === 'undefined' ? '' : window.location.search);
  const launchOptions = useMemo(() => getLoadfileLaunchOptions(initialSearch.current), []);
  const initialRegistry = useMemo(() => loadLoadfileRegistry(), []);
  const schedulerBaseUrl =
    loadfileSchedulerBaseUrl ?? import.meta.env.VITE_REVIEW_SCHEDULER_BASE_URL;
  const schedulerClient = useMemo(
    () =>
      reviewSchedulerClient ??
      (schedulerBaseUrl
        ? createFetchReviewSchedulerClient(schedulerBaseUrl)
        : createDisabledReviewSchedulerClient()),
    [reviewSchedulerClient, schedulerBaseUrl],
  );
  const [loadfileRegistry, setLoadfileRegistry] = useState<LoadfileRegistry>(initialRegistry);
  const [activeLoadfile, setActiveLoadfile] = useState<LoadfileSlot | undefined>(
    () =>
      findLoadfileSlot(initialRegistry, launchOptions.slotId) ??
      getActiveLoadfileSlot(initialRegistry),
  );
  const [view, setView] = useState<AppView>('study');
  const [showLoadfile, setShowLoadfile] = useState(
    launchOptions.showLoadfile || initialRegistry.slots.length === 0,
  );
  const [isLoadfileBusy, setIsLoadfileBusy] = useState(false);
  const [loadfileStatusMessage, setLoadfileStatusMessage] = useState<string | undefined>();

  const loadfileBars: readonly LoadfileBarItem[] = loadfileRegistry.slots.map((slot) => {
    const summary = summarizeLoadfileProgress(
      canonicalKanjiDeck,
      loadProgressRecords(createProgressStore(slot.progressStorageKey)),
    );

    return {
      id: slot.id,
      label: slot.label,
      learnerId: slot.learnerId,
      serverAddressLabel: formatSchedulerAddressLabel(schedulerBaseUrl),
      seenKanjiCount: summary.seenKanjiCount,
      unseenKanjiCount: summary.unseenKanjiCount,
      canDelete: true,
    };
  });

  useEffect(() => {
    if (!launchOptions.createLoadfile) {
      return;
    }

    handleCreateLoadfile();
    replaceSearch(stripCreateLoadfileFromSearch(initialSearch.current));
    // The runner should auto-create at most once on startup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launchOptions.createLoadfile]);

  function persistRegistry(nextRegistry: LoadfileRegistry): void {
    saveLoadfileRegistry(nextRegistry);
    setLoadfileRegistry(nextRegistry);
  }

  function handleOpenLoadfile(loadfileId: string): void {
    const nextRegistry = markLoadfileOpened(loadfileRegistry, loadfileId);
    const nextActiveLoadfile = findLoadfileSlot(nextRegistry, loadfileId);

    if (!nextActiveLoadfile) {
      return;
    }

    persistRegistry(nextRegistry);
    setActiveLoadfile(nextActiveLoadfile);
    setShowLoadfile(false);
    setView('study');
    setLoadfileStatusMessage(undefined);
    replaceSearch(getSlotSearch(loadfileId));
  }

  function handleCreateLoadfile(): void {
    setIsLoadfileBusy(true);
    const { registry: nextRegistry, slot } = createNewLoadfileSlot(loadfileRegistry);
    persistRegistry(nextRegistry);
    setActiveLoadfile(slot);
    setShowLoadfile(false);
    setView('study');
    setLoadfileStatusMessage(`${slot.label} created with learner ID ${slot.learnerId}.`);
    setIsLoadfileBusy(false);
    replaceSearch(getSlotSearch(slot.id));
  }

  function handleRenameLoadfile(loadfileId: string, label: string): void {
    const slot = findLoadfileSlot(loadfileRegistry, loadfileId);

    if (!slot) {
      return;
    }

    const nextRegistry = renameLoadfileSlot(loadfileRegistry, loadfileId, label);

    if (!nextRegistry) {
      return;
    }

    persistRegistry(nextRegistry);

    const nextLabel = findLoadfileSlot(nextRegistry, loadfileId)?.label ?? label.trim();
    if (nextLabel !== slot.label) {
      setLoadfileStatusMessage(`${slot.label} renamed to ${nextLabel}.`);
    }
  }

  async function handleDeleteLoadfile(loadfileId: string): Promise<void> {
    const slot = findLoadfileSlot(loadfileRegistry, loadfileId);

    if (!slot) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${slot.label}?\n\nThis will remove browser progress for ${slot.learnerId} and reset that learner on the scheduler.`,
    );

    if (!confirmed) {
      return;
    }

    setIsLoadfileBusy(true);

    try {
      const slotProgressStore = createProgressStore(slot.progressStorageKey);
      const browserProgressCleared = slotProgressStore.clear();

      if (schedulerClient.availability === 'configured') {
        await schedulerClient.resetLearnerState(slot.learnerId);
      }

      const deletion = deleteLoadfileSlot(loadfileRegistry, slot.id);

      if (!deletion) {
        setLoadfileStatusMessage(`${slot.label} could not be deleted.`);
        return;
      }

      persistRegistry(deletion.registry);
      setActiveLoadfile(deletion.nextActiveSlot);
      setShowLoadfile(true);
      setLoadfileStatusMessage(
        browserProgressCleared
          ? deletion.nextActiveSlot
            ? `${slot.label} deleted.`
            : `${slot.label} deleted. No loadfiles remain.`
          : deletion.nextActiveSlot
            ? `${slot.label} was removed from the registry, but its browser progress could not be cleared automatically.`
            : `${slot.label} was removed from the registry, but its browser progress could not be cleared automatically. No loadfiles remain.`,
      );
      replaceSearch(getLoadfileSearch(deletion.nextActiveSlot?.id));
    } catch (error) {
      setLoadfileStatusMessage(
        error instanceof ReviewSchedulerClientError
          ? `${slot.label} browser progress was targeted for deletion, but the scheduler reset failed.`
          : `${slot.label} could not be deleted cleanly.`,
      );
    } finally {
      setIsLoadfileBusy(false);
    }
  }

  if (showLoadfile || !activeLoadfile) {
    return (
      <LoadfileScreen
        isBusy={isLoadfileBusy}
        loadfiles={loadfileBars}
        newLoadfileUnseenCount={canonicalKanjiDeck.length}
        statusMessage={loadfileStatusMessage}
        onCreateLoadfile={handleCreateLoadfile}
        onDeleteLoadfile={(loadfileId) => void handleDeleteLoadfile(loadfileId)}
        onOpenLoadfile={handleOpenLoadfile}
        onRenameLoadfile={handleRenameLoadfile}
      />
    );
  }

  return (
    <>
      <nav aria-label="App sections" className="app-nav">
        <div className="app-nav-inner">
          <button
            aria-pressed={showLoadfile}
            className={`app-nav-button ${showLoadfile ? 'app-nav-button-active' : ''}`}
            type="button"
            onClick={() => {
              setShowLoadfile(true);
              replaceSearch(getLoadfileSearch(activeLoadfile.id));
            }}
          >
            Loadfiles
          </button>
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
        <StudyPage
          learnerId={activeLoadfile.learnerId}
          progressStorageKey={activeLoadfile.progressStorageKey}
          reviewSchedulerClient={schedulerClient}
        />
      ) : view === 'seen-library' ? (
        <SeenLibraryPage progressStorageKey={activeLoadfile.progressStorageKey} />
      ) : (
        <ManualSeenIntakePage progressStorageKey={activeLoadfile.progressStorageKey} />
      )}
    </>
  );
}

function formatSchedulerAddressLabel(baseUrl: string | undefined): string {
  if (!baseUrl) {
    return 'not configured';
  }

  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

function replaceSearch(search: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.history.replaceState({}, '', `${window.location.pathname}${search}${window.location.hash}`);
}
