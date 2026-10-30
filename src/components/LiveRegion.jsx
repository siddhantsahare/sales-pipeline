import { useSelector } from 'react-redux';

/** A visible status line, also announced to screen readers. */
export default function LiveRegion() {
  const announcement = useSelector((state) => state.ui.announcement);
  return (
    <footer className="status-line" aria-live="polite">
      {announcement || 'Press ? for shortcuts'}
    </footer>
  );
}
