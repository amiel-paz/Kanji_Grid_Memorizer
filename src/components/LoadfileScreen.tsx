import { useState } from 'react';

export interface LoadfileBarItem {
  readonly id: string;
  readonly label: string;
  readonly learnerId: string;
  readonly serverAddressLabel: string;
  readonly seenKanjiCount: number;
  readonly unseenKanjiCount: number;
  readonly canDelete: boolean;
}

interface LoadfileScreenProps {
  readonly loadfiles: readonly LoadfileBarItem[];
  readonly newLoadfileUnseenCount: number;
  readonly isBusy: boolean;
  readonly statusMessage?: string;
  readonly onOpenLoadfile: (loadfileId: string) => void;
  readonly onCreateLoadfile: () => void;
  readonly onDeleteLoadfile: (loadfileId: string) => void;
  readonly onRenameLoadfile: (loadfileId: string, label: string) => void;
}

export function LoadfileScreen({
  loadfiles,
  newLoadfileUnseenCount,
  isBusy,
  statusMessage,
  onOpenLoadfile,
  onCreateLoadfile,
  onDeleteLoadfile,
  onRenameLoadfile,
}: LoadfileScreenProps) {
  const [editingLoadfileId, setEditingLoadfileId] = useState<string | undefined>();
  const [draftLabel, setDraftLabel] = useState('');

  function startRename(loadfileId: string, label: string): void {
    if (isBusy) {
      return;
    }

    setEditingLoadfileId(loadfileId);
    setDraftLabel(label);
  }

  function finishRename(loadfile: LoadfileBarItem): void {
    const trimmedLabel = draftLabel.trim();
    setEditingLoadfileId(undefined);

    if (trimmedLabel.length === 0 || trimmedLabel === loadfile.label) {
      setDraftLabel('');
      return;
    }

    setDraftLabel('');
    onRenameLoadfile(loadfile.id, trimmedLabel);
  }

  function cancelRename(): void {
    setEditingLoadfileId(undefined);
    setDraftLabel('');
  }

  return (
    <main className="loadfile-shell">
      <section className="loadfile-panel">
        <div className="loadfile-heading">
          <p className="eyebrow">Local startup</p>
          <h1 className="loadfile-title">Loadfile ready</h1>
          <p className="body-copy">
            Each loadfile keeps its own learner ID and its own durable browser progress. The
            scheduler endpoint is shared; the learner record is not.
          </p>
        </div>

        <div className="loadfile-list" aria-label="Loadfiles">
          {loadfiles.map((loadfile) => (
            <article className="loadfile-card" key={loadfile.id}>
              <div className="loadfile-card-top">
                {editingLoadfileId === loadfile.id ? (
                  <input
                    aria-label={`Rename ${loadfile.label}`}
                    className="loadfile-card-title-input"
                    type="text"
                    value={draftLabel}
                    autoFocus
                    disabled={isBusy}
                    onBlur={() => finishRename(loadfile)}
                    onChange={(event) => setDraftLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }

                      if (event.key === 'Escape') {
                        event.preventDefault();
                        cancelRename();
                      }
                    }}
                  />
                ) : (
                  <h2
                    className="loadfile-card-title"
                    title="Double-click to rename"
                    onDoubleClick={() => startRename(loadfile.id, loadfile.label)}
                  >
                    {loadfile.label}
                  </h2>
                )}
                {loadfile.canDelete ? (
                  <button
                    aria-label={`Delete ${loadfile.label}`}
                    className="loadfile-delete-button"
                    type="button"
                    onClick={() => onDeleteLoadfile(loadfile.id)}
                    disabled={isBusy}
                  >
                    X
                  </button>
                ) : null}
              </div>

              <button
                className="loadfile-bar"
                type="button"
                onClick={() => onOpenLoadfile(loadfile.id)}
                disabled={isBusy}
              >
                <span className="loadfile-bar-metrics">
                  <span className="loadfile-bar-metric">
                    <strong>Server</strong>
                    <span>{loadfile.serverAddressLabel}</span>
                  </span>
                  <span className="loadfile-bar-metric">
                    <strong>Learner ID</strong>
                    <span>{loadfile.learnerId}</span>
                  </span>
                  <span className="loadfile-bar-metric">
                    <strong>Seen</strong>
                    <span>{loadfile.seenKanjiCount}</span>
                  </span>
                  <span className="loadfile-bar-metric">
                    <strong>Unseen</strong>
                    <span>{loadfile.unseenKanjiCount}</span>
                  </span>
                </span>
              </button>
            </article>
          ))}

          <article className="loadfile-card loadfile-card-new">
            <div className="loadfile-card-top">
              <h2 className="loadfile-card-title">New loadfile</h2>
            </div>
            <button
              className="loadfile-bar"
              type="button"
              onClick={onCreateLoadfile}
              disabled={isBusy}
            >
              <span className="loadfile-bar-metrics">
                <span className="loadfile-bar-metric">
                  <strong>Server</strong>
                  <span>shared scheduler</span>
                </span>
                <span className="loadfile-bar-metric">
                  <strong>Learner ID</strong>
                  <span>new learner</span>
                </span>
                <span className="loadfile-bar-metric">
                  <strong>Seen</strong>
                  <span>0</span>
                </span>
                <span className="loadfile-bar-metric">
                  <strong>Unseen</strong>
                  <span>{newLoadfileUnseenCount}</span>
                </span>
              </span>
            </button>
          </article>
        </div>

        <p className="fine-print">
          Deleting a loadfile removes only that slot&apos;s browser progress and that slot&apos;s
          learner record on the scheduler after confirmation.
        </p>

        {statusMessage ? (
          <p className="loadfile-status" role="status">
            {statusMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}
