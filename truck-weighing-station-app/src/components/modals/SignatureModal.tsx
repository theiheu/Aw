import React, { useRef, useEffect, useState } from 'react';
import { WeighTicket } from '../types';

interface SignatureModalProps {
  ticket: WeighTicket;
  defaultOperatorName?: string;
  onClose: () => void;
  onConfirm: (signatureImage: string, signerName: string) => void; // Updated signature
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  ticket,
  defaultOperatorName,
  onClose,
  onConfirm,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  // Initialize signer name from ticket, then default settings, then fallback
  const [signerName, setSignerName] = useState(
    ticket.operatorName || ticket.signedBy || defaultOperatorName || 'Admin User'
  );
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size based on its displayed size for high-res screens
    const rect = canvas.getBoundingClientRect();

    // Fix: Only set internal resolution, do not set style.width/height to allow CSS responsiveness
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      contextRef.current = ctx;
    }
  }, []);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e.nativeEvent) {
      return {
        x: e.nativeEvent.touches[0].clientX - rect.left,
        y: e.nativeEvent.touches[0].clientY - rect.top,
      };
    }
    return { x: e.nativeEvent.clientX - rect.left, y: e.nativeEvent.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const ctx = contextRef.current;
    if (!ctx) return;

    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = contextRef.current;
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasDrawn) setHasDrawn(true);
  };

  const stopDrawing = () => {
    const ctx = contextRef.current;
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;
    // Clear rect based on logic coordinates (since we scaled ctx)
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    // Create a new canvas to draw a white background for the exported image
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = canvas.width;
    finalCanvas.height = canvas.height;
    const finalCtx = finalCanvas.getContext('2d');

    if (finalCtx) {
      finalCtx.fillStyle = '#FFFFFF';
      finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
      finalCtx.drawImage(canvas, 0, 0);
      onConfirm(finalCanvas.toDataURL('image/png'), signerName);
    } else {
      // Fallback if creating a new context fails
      onConfirm(canvas.toDataURL('image/png'), signerName);
    }
  };

  // INCREASED Z-INDEX TO z-[110] to appear above Print Preview (z-[100])
  // Added max-h and flex-col with overflow handling to prevent layout break on small screens
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[110] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 shrink-0">
          <h2 className="text-lg font-bold text-brand-primary">Xác nhận ký số</h2>
          <p className="text-sm text-slate-600">
            Phiếu: #{ticket.ticketNo} - Xe: {ticket.vehicle.plateNumber}
          </p>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
          <div>
            <canvas
              ref={canvasRef}
              className="w-full h-48 md:h-64 bg-slate-50 border-2 border-dashed border-slate-300 rounded-md cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            ></canvas>
            <p className="text-xs text-center text-slate-500 mt-1">
              Ký vào vùng trên bằng chuột hoặc ngón tay
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Tên nhân viên cân
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="Nhập tên nhân viên..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
            />
          </div>

          <p className="text-xs text-center text-slate-500">
            Bằng việc ký tên, bạn xác nhận các thông tin trên phiếu cân là chính xác.
          </p>
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end space-x-3 shrink-0">
          <button
            onClick={onClose}
            className="bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors text-sm"
          >
            Hủy
          </button>
          <button
            onClick={handleClear}
            className="bg-brand-accent text-white font-bold py-2 px-4 rounded-lg hover:bg-amber-600 transition-colors text-sm"
          >
            Xóa ký
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasDrawn || !signerName.trim()}
            className="bg-brand-success text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-600 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed text-sm"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};
