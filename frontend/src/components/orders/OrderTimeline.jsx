import React from 'react';
import { Check, CircleDashed, XCircle } from 'lucide-react';

/**
 * Customer-facing fulfilment progress.
 *
 * `timeline` and `timeline_index` both come from the API, so the client never has to
 * know the state machine - the server stays the single source of truth for what the
 * steps are and what order they go in.
 */
export default function OrderTimeline({ timeline = [], index = -1, status, compact = false }) {
  // index of -1 means the order fell off the happy path (failed / cancelled)
  if (index < 0) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-warning-dark">
        <XCircle size={14} />
        {status || 'Not completed'}
      </div>
    );
  }

  return (
    <ol className={`flex items-center ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {timeline.map((step, i) => {
        const done = i <= index;
        const current = i === index;
        return (
          <li key={step} className="flex flex-1 items-center gap-1.5">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`flex items-center justify-center rounded-full transition-colors ${
                  compact ? 'h-4 w-4' : 'h-5 w-5'
                } ${done ? 'bg-success text-white' : 'bg-neutral text-text-lighter'} ${
                  current ? 'ring-4 ring-success/20' : ''
                }`}
              >
                {done ? <Check size={compact ? 9 : 11} strokeWidth={3.5} />
                      : <CircleDashed size={compact ? 9 : 11} />}
              </span>
              {!compact && (
                <span
                  className={`whitespace-nowrap text-[9px] font-extrabold uppercase tracking-wider ${
                    done ? 'text-success-dark' : 'text-text-lighter'
                  }`}
                >
                  {step}
                </span>
              )}
            </div>
            {i < timeline.length - 1 && (
              <span className={`h-0.5 flex-1 rounded-full ${i < index ? 'bg-success' : 'bg-neutral'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
