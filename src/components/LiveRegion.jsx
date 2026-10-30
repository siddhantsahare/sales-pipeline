import { useSelector } from 'react-redux';

/** Announces save results to screen readers. */
export default function LiveRegion() {
  const announcement = useSelector((state) => state.ui.announcement);
  return <div className="sr-only" aria-live="polite">{announcement}</div>;
}
