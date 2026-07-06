import React, { useState } from 'react';
import { FaTimes, FaDownload, FaCamera, FaQrcode } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';

const DEFAULT_QR_LOGO = '/image/lekhon_url.png';
const QR_FOREGROUND = '#102016';

const QRCodeModal = ({ show, onClose, profileUrl, username, logoSrc = DEFAULT_QR_LOGO }) => {
  const [activeTab, setActiveTab] = useState('show'); // 'show' or 'scan'
  const [scanning, setScanning] = useState(false);

  const qrLogoSrc = logoSrc || DEFAULT_QR_LOGO;
  const safeUsername = String(username || 'profile')
    .trim()
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'profile';

  const triggerDownload = (href, extension) => {
    const downloadLink = document.createElement('a');
    downloadLink.download = `${safeUsername}-profile-qr.${extension}`;
    downloadLink.href = href;
    downloadLink.click();
  };

  const downloadQR = () => {
    const svg = document.getElementById('profile-qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = Number(svg.getAttribute('width')) || 240;
      const height = Number(svg.getAttribute('height')) || 240;
      const scale = 2;

      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        triggerDownload(canvas.toDataURL('image/png'), 'png');
      } catch (error) {
        const fallbackUrl = URL.createObjectURL(svgBlob);
        triggerDownload(fallbackUrl, 'svg');
        window.setTimeout(() => URL.revokeObjectURL(fallbackUrl), 1000);
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    };

    img.onerror = () => {
      const fallbackUrl = URL.createObjectURL(svgBlob);
      triggerDownload(fallbackUrl, 'svg');
      window.setTimeout(() => URL.revokeObjectURL(fallbackUrl), 1000);
      URL.revokeObjectURL(svgUrl);
    };

    img.src = svgUrl;
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // Note: Full QR scanning requires additional library like html5-qrcode.
      alert('QR Scanner: Install html5-qrcode package for full scanning functionality');
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      alert('Camera access denied or not available');
    }
    setScanning(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 theme-modal-overlay flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="theme-modal-card rounded-2xl p-5 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-bold uppercase text-[var(--brand-primary)]">Profile QR</p>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">QR Code</h3>
          </div>
          <button onClick={onClose} className="theme-soft-button inline-flex h-8 w-8 items-center justify-center rounded-lg transition" aria-label="Close QR modal">
            <FaTimes size={13} />
          </button>
        </div>

        <div className="flex gap-2 mb-4 rounded-xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-1">
          <button
            onClick={() => setActiveTab('show')}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
              activeTab === 'show'
                ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-card)]'
            }`}
          >
            <FaQrcode className="inline mr-1.5" size={12} />
            My QR Code
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold transition ${
              activeTab === 'scan'
                ? 'bg-[var(--brand-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-card)]'
            }`}
          >
            <FaCamera className="inline mr-1.5" size={12} />
            Scan QR
          </button>
        </div>

        {activeTab === 'show' ? (
          <>
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-4 mb-4">
              <div className="mx-auto flex w-fit justify-center rounded-2xl bg-white p-3 shadow-inner ring-1 ring-[var(--border-default)]">
                <QRCodeSVG
                  id="profile-qr-code-svg"
                  value={profileUrl}
                  size={220}
                  bgColor="#ffffff"
                  fgColor={QR_FOREGROUND}
                  level="H"
                  marginSize={4}
                  imageSettings={{
                    src: qrLogoSrc,
                    height: 36,
                    width: 36,
                    excavate: true,
                    crossOrigin: 'anonymous',
                  }}
                />
              </div>
            </div>

            <p className="text-center text-sm text-[var(--text-secondary)] mb-4">
              Scan to open <strong className="text-[var(--text-primary)]">{username}</strong>'s profile
            </p>

            <button
              onClick={downloadQR}
              className="w-full rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-primary-hover)] flex items-center justify-center gap-2 active:scale-95"
            >
              <FaDownload size={14} /> Download QR Code
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--background-secondary)] p-8 mb-5">
              <FaCamera className="mx-auto text-[var(--brand-primary)] mb-4" size={36} />
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Scan another user's QR code to visit their profile
              </p>
            </div>

            <button
              onClick={handleScan}
              disabled={scanning}
              className="w-full rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--brand-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
            >
              {scanning ? 'Opening Camera...' : 'Open Camera to Scan'}
            </button>

            <p className="text-xs text-[var(--text-muted)] mt-3">Camera access is required on supported devices.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodeModal;
