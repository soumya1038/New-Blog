import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight, FaMusic } from 'react-icons/fa';

const clampDurationSec = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 7;
  return Math.max(3, Math.min(30, Math.floor(parsed)));
};

const getMediaType = (status) => {
  if (!status) return 'text';
  if (status.mediaType) return status.mediaType;
  if (status.video) return 'video';
  if (status.image) return 'image';
  return 'text';
};

const getMediaUrl = (status) => {
  if (!status) return '';
  return status.video || status.image || '';
};

const clampTextPosition = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(0, Math.min(100, parsed));
};

const clampStickerSize = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 48;
  return Math.max(24, Math.min(96, Math.round(parsed)));
};

const clampStickerRotate = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(-60, Math.min(60, Math.round(parsed)));
};

const normalizeStickers = (stickers = []) =>
  Array.isArray(stickers)
    ? stickers
        .slice(0, 8)
        .map((sticker, index) => ({
          id: String(sticker?.id || `sticker-${index}`),
          emoji: String(sticker?.emoji || '').trim().slice(0, 8),
          x: clampTextPosition(sticker?.x),
          y: clampTextPosition(sticker?.y),
          size: clampStickerSize(sticker?.size),
          rotate: clampStickerRotate(sticker?.rotate),
        }))
        .filter((sticker) => sticker.emoji.length > 0)
    : [];

const StatusViewer = ({ statuses = [], onClose, userName, initialIndex = 0 }) => {
  const [currentIndex, setCurrentIndex] = useState(() => {
    const safeIndex = Number.isInteger(initialIndex) ? initialIndex : 0;
    return Math.max(0, Math.min(safeIndex, Math.max(0, statuses.length - 1)));
  });
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);

  const currentStatus = statuses[currentIndex] || null;
  const currentMediaType = useMemo(() => getMediaType(currentStatus), [currentStatus]);
  const currentMediaUrl = useMemo(() => getMediaUrl(currentStatus), [currentStatus]);
  const currentTextPosX = useMemo(
    () => clampTextPosition(currentStatus?.textPosX),
    [currentStatus?.textPosX]
  );
  const currentTextPosY = useMemo(
    () => clampTextPosition(currentStatus?.textPosY),
    [currentStatus?.textPosY]
  );
  const currentDurationMs = useMemo(
    () => clampDurationSec(currentStatus?.durationSec) * 1000,
    [currentStatus?.durationSec]
  );
  const isVideoStatus = currentMediaType === 'video' && Boolean(currentMediaUrl);
  const hasMedia = Boolean(currentMediaUrl);
  const currentStickers = useMemo(() => normalizeStickers(currentStatus?.stickers), [currentStatus?.stickers]);
  const currentMusicLabel = useMemo(() => String(currentStatus?.musicLabel || '').trim(), [currentStatus?.musicLabel]);
  const currentMusicSourceType = useMemo(() => String(currentStatus?.musicSourceType || '').trim().toLowerCase(), [currentStatus?.musicSourceType]);
  const currentMusicSourceUrl = useMemo(() => String(currentStatus?.musicSourceUrl || '').trim(), [currentStatus?.musicSourceUrl]);

  useEffect(() => {
    if (statuses.length === 0) return;
    const safeIndex = Number.isInteger(initialIndex) ? initialIndex : 0;
    const nextIndex = Math.max(0, Math.min(safeIndex, Math.max(0, statuses.length - 1)));
    setCurrentIndex(nextIndex);
    setProgress(0);
  }, [initialIndex, statuses.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex < statuses.length - 1) {
        return prevIndex + 1;
      }
      onClose();
      return prevIndex;
    });
    setProgress(0);
  }, [onClose, statuses.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex > 0) {
        return prevIndex - 1;
      }
      return prevIndex;
    });
    setProgress(0);
  }, []);

  useEffect(() => {
    if (!currentStatus || isVideoStatus) return undefined;

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const nextProgress = Math.min(100, (elapsedMs / currentDurationMs) * 100);
      setProgress(nextProgress);

      if (elapsedMs >= currentDurationMs) {
        clearInterval(timer);
        handleNext();
      }
    }, 100);

    return () => clearInterval(timer);
  }, [currentStatus, currentDurationMs, handleNext, isVideoStatus]);

  useEffect(() => {
    if (!currentStatus || !isVideoStatus) return undefined;

    const videoEl = videoRef.current;
    if (!videoEl) return undefined;

    const updateFromPlayback = () => {
      const mediaDurationMs =
        Number.isFinite(videoEl.duration) && videoEl.duration > 0
          ? videoEl.duration * 1000
          : currentDurationMs;
      const playedMs = Math.max(0, videoEl.currentTime * 1000);
      setProgress(Math.min(100, (playedMs / mediaDurationMs) * 100));
    };

    const onLoadedMetadata = () => {
      updateFromPlayback();
      videoEl.play().catch(() => {
        // Ignore autoplay failures; user can still navigate manually.
      });
    };

    const onTimeUpdate = () => {
      updateFromPlayback();
    };

    const onEnded = () => {
      setProgress(100);
      handleNext();
    };

    videoEl.addEventListener('loadedmetadata', onLoadedMetadata);
    videoEl.addEventListener('timeupdate', onTimeUpdate);
    videoEl.addEventListener('ended', onEnded);

    if (videoEl.readyState >= 1) {
      onLoadedMetadata();
    }

    return () => {
      videoEl.removeEventListener('loadedmetadata', onLoadedMetadata);
      videoEl.removeEventListener('timeupdate', onTimeUpdate);
      videoEl.removeEventListener('ended', onEnded);
    };
  }, [currentStatus, currentDurationMs, handleNext, isVideoStatus]);

  if (!currentStatus) return null;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {statuses.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%',
              }}
            />
          </div>
        ))}
      </div>

      <button onClick={onClose} className="absolute top-4 right-4 text-white z-10 hover:opacity-80">
        <FaTimes size={24} />
      </button>

      <div className="absolute top-12 left-4 text-white z-10">
        <p className="font-semibold">{userName}</p>
        <p className="text-xs opacity-80">
          {new Date(currentStatus.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        {Number.isFinite(currentStatus?.seenByCount) || Array.isArray(currentStatus?.seenBy) ? (
          <p className="text-xs opacity-80">
            Seen by {Number.isFinite(currentStatus?.seenByCount) ? currentStatus.seenByCount : currentStatus.seenBy.length}
          </p>
        ) : null}
        {currentMediaType === 'video' ? (
          <p className="text-xs opacity-80">
            Trim {Number(currentStatus?.trimStartSec || 0).toFixed(1)}s
            {Number.isFinite(Number(currentStatus?.trimEndSec))
              ? ` - ${Number(currentStatus.trimEndSec).toFixed(1)}s`
              : ' - full end'}
          </p>
        ) : null}
      </div>

      {currentIndex > 0 && (
        <button onClick={handlePrev} className="absolute left-4 text-white z-10 hover:opacity-80">
          <FaChevronLeft size={32} />
        </button>
      )}
      {currentIndex < statuses.length - 1 && (
        <button onClick={handleNext} className="absolute right-4 text-white z-10 hover:opacity-80">
          <FaChevronRight size={32} />
        </button>
      )}

      <div className="max-w-md w-full h-full flex items-center justify-center p-4 relative">
        {isVideoStatus ? (
          <video
            ref={videoRef}
            src={currentMediaUrl}
            className="max-w-full max-h-full object-contain rounded-lg"
            playsInline
            autoPlay
            muted
            controls={false}
          />
        ) : currentMediaType === 'image' && currentMediaUrl ? (
          <img src={currentMediaUrl} alt="Status" className="max-w-full max-h-full object-contain rounded-lg" />
        ) : (
          <div
            className="w-full h-full rounded-lg"
            style={{ backgroundColor: currentStatus.backgroundColor || '#1f2937' }}
          />
        )}

        {currentStatus.text && (
          <div
            className="absolute px-4"
            style={{
              left: `${currentTextPosX}%`,
              top: `${currentTextPosY}%`,
              transform: 'translate(-50%, -50%)',
              width: '82%',
            }}
          >
            <p
              className="inline-block text-lg px-4 py-2 rounded-lg backdrop-blur-sm w-full"
              style={{
                color: currentStatus.textColor || '#ffffff',
                fontFamily: currentStatus.fontFamily || 'Inter',
                textAlign: currentStatus.textAlign || 'center',
                backgroundColor: hasMedia ? 'rgba(0, 0, 0, 0.45)' : 'transparent',
              }}
            >
              {currentStatus.text}
            </p>
          </div>
        )}

        {currentStickers.map((sticker) => (
          <span
            key={sticker.id}
            className="absolute select-none pointer-events-none"
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              transform: `translate(-50%, -50%) rotate(${sticker.rotate}deg)`,
              fontSize: `${sticker.size}px`,
              lineHeight: 1,
              textShadow: '0 2px 8px rgba(0,0,0,0.35)',
            }}
          >
            {sticker.emoji}
          </span>
        ))}

        {currentMusicLabel ? (
          <div className="absolute left-4 right-4 bottom-5">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 text-white text-xs backdrop-blur-sm">
              <FaMusic size={11} />
              {currentMusicLabel}
              {currentMusicSourceType && currentMusicSourceType !== 'none'
                ? ` - ${currentMusicSourceType}`
                : ''}
              {currentMusicSourceUrl ? ' * linked' : ''}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StatusViewer;
