import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  alt?: string;
}

/**
 * Fullscreen image viewer with swipe navigation, pinch-to-zoom (native via touch-action),
 * keyboard arrows, and a visible close button. Pure black background.
 */
export function FullscreenGallery({ images, initialIndex = 0, open, onClose, alt = '' }: Props) {
  const [idx, setIdx] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => { if (open) setIdx(initialIndex); }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setIdx(i => (i - 1 + images.length) % images.length);
      else if (e.key === 'ArrowRight') setIdx(i => (i + 1) % images.length);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, images.length, onClose]);

  if (!open || images.length === 0) return null;

  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) { touchStartX.current = null; return; }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) prev(); else next();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center select-none"
      data-no-swipe
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-3 right-3 z-10 h-10 w-10 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center backdrop-blur"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        <X className="h-6 w-6" />
      </button>

      <img
        src={images[idx]}
        alt={alt}
        draggable={false}
        className="max-h-[100dvh] max-w-full w-auto h-auto object-contain"
        style={{ touchAction: 'pinch-zoom' }}
      />

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Précédent"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/15 hover:bg-white/25 text-white items-center justify-center backdrop-blur"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <button
            onClick={next}
            aria-label="Suivant"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/15 hover:bg-white/25 text-white items-center justify-center backdrop-blur"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
          <div
            className="absolute left-1/2 -translate-x-1/2 bg-white/15 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
          >
            {idx + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}
