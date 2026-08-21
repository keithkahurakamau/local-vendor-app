import React, { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { customerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * Follow a vendor to be emailed when they next go live.
 *
 * Optimistic: the heart fills immediately and rolls back if the request fails,
 * because a follow is low-stakes and waiting on a round trip feels broken.
 */
export default function FavouriteButton({ vendorId, initial = false, onAuthRequired, size = 16 }) {
  const { user } = useAuth();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) return onAuthRequired?.();

    const next = !on;
    setOn(next);              // optimistic
    setBusy(true);
    try {
      if (next) await customerAPI.addFavourite(vendorId);
      else await customerAPI.removeFavourite(vendorId);
    } catch {
      setOn(!next);           // roll back
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={on}
      aria-label={on ? 'Unfollow this vendor' : 'Follow this vendor for go-live alerts'}
      className={`flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur transition-all ${
        on ? 'border-warning/40 bg-warning/12 text-warning'
           : 'border-text/10 bg-white/85 text-text-lighter hover:border-warning/40 hover:text-warning'
      }`}
    >
      {busy ? <Loader2 size={size - 2} className="animate-spin" />
            : <Heart size={size} className={on ? 'fill-warning' : ''} />}
    </button>
  );
}
