import React, { useState } from 'react';
import { FaTimes, FaDownload, FaCamera, FaQrcode } from 'react-icons/fa';
import QRCode from 'react-qr-code';

const QRCodeModal = ({ show, onClose, profileUrl, username }) => {
  const [activeTab, setActiveTab] = useState('show'); // 'show' or 'scan'
  const [scanning, setScanning] = useState(false);
  const [scannedUrl, setScannedUrl] = useState('');

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${username}-profile-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      // Note: Full QR scanning requires additional library like html5-qrcode
      // This is a placeholder for the scanning functionality
      alert('QR Scanner: Install html5-qrcode package for full scanning functionality');
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      alert('Camera access denied or not available');
    }
    setScanning(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition">
            <FaTimes size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setActiveTab('show')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
              activeTab === 'show'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <FaQrcode className="inline mr-2" size={14} />
            My QR Code
          </button>
          <button
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
              activeTab === 'scan'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <FaCamera className="inline mr-2" size={14} />
            Scan QR
          </button>
        </div>

        {/* Content */}
        {activeTab === 'show' ? (
          <>
            <div className="bg-white p-6 rounded-xl flex justify-center mb-5 border border-gray-200 dark:border-gray-700">
              <QRCode
                id="qr-code-svg"
                value={profileUrl}
                size={200}
                level="H"
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              />
            </div>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-5">
              Scan this code to visit <strong className="text-gray-800 dark:text-gray-200">{username}</strong>'s profile
            </p>

            <button
              onClick={downloadQR}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition flex items-center justify-center gap-2 font-medium active:scale-95"
            >
              <FaDownload size={14} /> Download QR Code
            </button>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-8 mb-5">
              <FaCamera className="mx-auto text-gray-400 dark:text-gray-500 mb-4" size={48} />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Scan another user's QR code to visit their profile
              </p>
              {scannedUrl && (
                <p className="text-xs text-green-600 dark:text-green-400 mb-2">
                  ✓ QR Code detected!
                </p>
              )}
            </div>
            
            <button
              onClick={handleScan}
              disabled={scanning}
              className="w-full bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {scanning ? 'Opening Camera...' : 'Open Camera to Scan'}
            </button>
            
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Note: Install html5-qrcode for full scanning support
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRCodeModal;
