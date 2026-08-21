import React from 'react';
import { Star } from 'lucide-react';

/** Read-only rating display. Renders nothing when a vendor has no reviews yet -
 *  an empty row of grey stars reads as "rated badly", which would be a lie. */
export default function Stars({ rating, count, size = 12, showCount = true }) {
  if (rating == null || !count) return null;
  return (
    <span className="inline-flex items-center gap-1" title={`${rating} out of 5 from ${count} review${count === 1 ? '' : 's'}`}>
      <Star size={size} className="fill-secondary text-secondary" />
      <span className="tabular text-[11px] font-bold text-text">{rating}</span>
      {showCount && (
        <span className="tabular text-[10.5px] font-semibold text-text-lighter">({count})</span>
      )}
    </span>
  );
}
