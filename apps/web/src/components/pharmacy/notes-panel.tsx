'use client';

import { useState } from 'react';

export type NoteType =
  | 'GENERAL'
  | 'CLINICAL'
  | 'INSURANCE'
  | 'PATIENT_REQUEST'
  | 'PRESCRIBER_COMM'
  | 'DUR_OVERRIDE'
  | 'WORKFLOW';

export interface Note {
  id: string;
  type: NoteType;
  content: string;
  createdAt: Date | string;
  createdBy: {
    id: string;
    name: string;
    role?: string;
  };
  isPinned?: boolean;
  isInternal?: boolean;
}

interface NotesPanelProps {
  notes: Note[];
  onAddNote: (note: { type: NoteType; content: string; isInternal?: boolean }) => void;
  onDeleteNote?: (noteId: string) => void;
  onPinNote?: (noteId: string, isPinned: boolean) => void;
  disabled?: boolean;
  maxHeight?: string;
  prescriptionId?: string;
}

const noteTypeConfig: Record<NoteType, { label: string; color: string; bgColor: string }> = {
  GENERAL: { label: 'General', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  CLINICAL: { label: 'Clinical', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  INSURANCE: { label: 'Insurance', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  PATIENT_REQUEST: { label: 'Patient Request', color: 'text-teal-600', bgColor: 'bg-teal-100' },
  PRESCRIBER_COMM: { label: 'Prescriber', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  DUR_OVERRIDE: { label: 'DUR Override', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  WORKFLOW: { label: 'Workflow', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
};

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function NotesPanel({
  notes,
  onAddNote,
  onDeleteNote,
  onPinNote,
  disabled = false,
  maxHeight = '400px',
}: NotesPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<NoteType>('GENERAL');
  const [isInternal, setIsInternal] = useState(true);

  // Sort notes: pinned first, then by date
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    onAddNote({
      type: noteType,
      content: newNote.trim(),
      isInternal,
    });

    setNewNote('');
    setIsAdding(false);
    setNoteType('GENERAL');
    setIsInternal(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          Notes ({notes.length})
        </h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            disabled={disabled}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add note (Ctrl+N)"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
      </div>

      {/* Add note form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as NoteType)}
                className="px-2 py-1.5 text-xs font-medium border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none bg-white"
              >
                {Object.entries(noteTypeConfig).map(([type, config]) => (
                  <option key={type} value={type}>
                    {config.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Internal only
              </label>
            </div>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter note..."
              rows={3}
              autoFocus
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewNote('');
                }}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newNote.trim()}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                Add Note
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Notes list */}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {sortedNotes.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <svg className="h-8 w-8 mx-auto text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <p className="text-sm text-slate-500">No notes yet</p>
            <p className="text-xs text-slate-400 mt-1">Press Ctrl+N to add a note</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedNotes.map((note) => {
              const typeConfig = noteTypeConfig[note.type];

              return (
                <div
                  key={note.id}
                  className={`p-4 ${note.isPinned ? 'bg-amber-50/50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                      {note.createdBy.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-900">{note.createdBy.name}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${typeConfig.bgColor} ${typeConfig.color}`}>
                          {typeConfig.label}
                        </span>
                        {note.isPinned && (
                          <svg className="h-3 w-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" />
                          </svg>
                        )}
                        {note.isInternal && (
                          <span className="text-[10px] text-slate-400">Internal</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatDate(note.createdAt)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {onPinNote && (
                        <button
                          onClick={() => onPinNote(note.id, !note.isPinned)}
                          className={`p-1 rounded transition-colors ${
                            note.isPinned
                              ? 'text-amber-500 hover:bg-amber-100'
                              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                          }`}
                          title={note.isPinned ? 'Unpin' : 'Pin'}
                        >
                          <svg className="h-4 w-4" fill={note.isPinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      )}
                      {onDeleteNote && (
                        <button
                          onClick={() => onDeleteNote(note.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
