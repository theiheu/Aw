import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WeighTicket, StationInfo } from '../types';
import { PrintableTicket } from '../common/PrintableTicket';
import { useMqtt } from '../../hooks/useMqtt';
import {
  ZoomInIcon,
  ZoomOutIcon,
  ZoomResetIcon,
  PrinterIcon,
  SaveIcon,
  EditIcon,
} from '../common/icons';
import { SignatureModal } from './SignatureModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PrintPreviewModalProps {
  ticket: WeighTicket;
  onClose: () => void;
  stationInfo: StationInfo;
  onUpdateTicket: (ticket: WeighTicket) => void;
}

// Exact A5 Landscape dimensions in Pixels (at ~96 DPI)
const TICKET_WIDTH_PX = 794;
const TICKET_HEIGHT_PX = 560;
const CONTAINER_PADDING = 32;

const generateTicketHash = (ticket: WeighTicket): string => {
  const dataString = [
    ticket.ticketNo,
    ticket.vehicle.plateNumber,
    ticket.customer.name,
    ticket.product.name,
    ticket.grossWeight,
    ticket.tareWeight,
    ticket.netWeight,
    new Date(ticket.weighInTime).toISOString(),
    ticket.weighOutTime ? new Date(ticket.weighOutTime).toISOString() : 'N/A',
  ].join('|');
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    hash = (hash << 5) - hash + dataString.charCodeAt(i);
    hash |= 0;
  }
  return `SIGN-${Math.abs(hash).toString(16).toUpperCase()}-${ticket.ticketNo.slice(-4)}`;
};

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  ticket,
  onClose,
  stationInfo,
  onUpdateTicket,
}) => {
  const { publish, status, machineId } = useMqtt();
  const [zoom, setZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [printMethod, setPrintMethod] = useState<'browser' | 'server'>('browser');
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Refs for capture source
  const pdfSourceRef = useRef<HTMLDivElement>(null);

  // Refs for pinch-to-zoom
  const touchStartDist = useRef<number>(0);
  const touchStartZoom = useRef<number>(1);

  // Function to calculate zoom to fit screen width
  const calculateFitZoom = useCallback(() => {
    const availableWidth = window.innerWidth - CONTAINER_PADDING;
    const fitScale = availableWidth / TICKET_WIDTH_PX;
    const optimalScale = Math.min(0.95, fitScale); // Max 95% to leave some margin
    return optimalScale;
  }, []);

  useEffect(() => {
    setZoom(calculateFitZoom());
    const handleResize = () => setZoom(calculateFitZoom());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateFitZoom]);

  useEffect(() => {
    if (status === 'connected') {
      setPrintMethod('server');
    } else {
      setPrintMethod('browser');
    }
  }, [status]);

  const handleSignatureConfirm = (signatureImage: string, signerName: string) => {
    const signedTicket: WeighTicket = {
      ...ticket,
      isSigned: true,
      signedAt: new Date(),
      signedBy: signerName,
      operatorName: signerName,
      signatureHash: generateTicketHash(ticket),
      signatureImage: signatureImage,
    };
    onUpdateTicket(signedTicket);
    setShowSignatureModal(false);
  };

  const generatePdfBase64 = async (): Promise<string | null> => {
    if (!pdfSourceRef.current) return null;

    try {
      const canvas = await html2canvas(pdfSourceRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: TICKET_WIDTH_PX,
        height: TICKET_HEIGHT_PX,
        windowWidth: TICKET_WIDTH_PX,
        windowHeight: TICKET_HEIGHT_PX,
        onclone: (clonedDoc) => {
          const wrapper = clonedDoc.getElementById('pdf-capture-target');
          if (wrapper) {
            wrapper.style.opacity = '1';
            wrapper.style.visibility = 'visible';
          }
        },
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a5',
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 148);

      // Get Base64 string without the data URI prefix
      const dataUri = pdf.output('datauristring');
      const base64 = dataUri.split(',')[1];
      return base64;
    } catch (error) {
      console.error('PDF Generation failed:', error);
      return null;
    }
  };

  const handlePrint = async () => {
    if (printMethod === 'server' && status === 'connected') {
      setIsProcessing(true);

      try {
        const pdfBase64 = await generatePdfBase64();

        if (pdfBase64) {
          const topic = `weigh/${machineId}/print`;
          const payload = {
            type: 'PRINT_TICKET',
            ticketId: ticket.id,
            pdfBase64: pdfBase64,
            timestamp: new Date().toISOString(),
          };

          publish(topic, payload);
          alert('✅ Đã gửi lệnh in tới PC trung tâm!');
        } else {
          alert('Lỗi: Không thể tạo dữ liệu in.');
        }
      } catch (e) {
        console.error(e);
        alert('Lỗi khi gửi lệnh in.');
      } finally {
        setIsProcessing(false);
      }
    } else {
      window.print();
    }
  };

  const handleDownloadPdf = async () => {
    if (!pdfSourceRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(pdfSourceRef.current, {
        scale: 2, // Higher scale for crisp text
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff', // Force white background
        width: TICKET_WIDTH_PX,
        height: TICKET_HEIGHT_PX,
        windowWidth: TICKET_WIDTH_PX,
        windowHeight: TICKET_HEIGHT_PX,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        onclone: (clonedDoc) => {
          const wrapper = clonedDoc.getElementById('pdf-capture-target');
          if (wrapper) {
            wrapper.style.opacity = '1';
            wrapper.style.visibility = 'visible';
          }
        },
      });

      // A5 Landscape: 210mm x 148mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a5',
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);

      // Add image to PDF, matching A5 dimensions exactly
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 148);

      const fileName = `PhieuCan_${ticket.ticketNo}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('Lỗi khi tạo file PDF. Vui lòng thử lại.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(3.0, prev + 0.1));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.3, prev - 0.1));
  const handleZoomReset = () => setZoom(calculateFitZoom());

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchStartDist.current = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      touchStartZoom.current = zoom;
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      if (touchStartDist.current > 0) {
        const scaleFactor = dist / touchStartDist.current;
        const newZoom = Math.max(0.3, Math.min(3.0, touchStartZoom.current * scaleFactor));
        setZoom(newZoom);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-[100] p-0 sm:p-4 md:p-8">
      <div
        className="bg-industrial-bg sm:rounded-lg shadow-2xl w-full max-w-5xl h-full sm:h-[90vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-white border-b border-industrial-border flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-industrial-text flex items-center gap-2">
              <PrinterIcon className="w-5 h-5 sm:w-6 sm:h-6 text-brand-primary" />
              <span>Xem trước phiếu in</span>
            </h2>
            <p className="text-xs text-industrial-muted mt-0.5 hidden sm:block">
              Kiểm tra thông tin trước khi xuất phiếu
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full p-2 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>

        {/* Preview Area - Center the ticket properly */}
        <div
          className="flex-grow overflow-hidden bg-slate-800/50 flex justify-center items-center relative touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
        >
          {/* VISIBLE PREVIEW: Scaled via Transform */}
          <div
            className="bg-white shadow-[0_0_50px_rgba(0,0,0,0.3)] transition-transform duration-200 origin-center will-change-transform"
            style={{
              transform: `scale(${zoom})`,
              width: `${TICKET_WIDTH_PX}px`,
              height: `${TICKET_HEIGHT_PX}px`,
              flexShrink: 0,
            }}
          >
            <PrintableTicket ticket={ticket} stationInfo={stationInfo} />
          </div>
        </div>

        {/*
            HIDDEN SOURCE FOR PDF CAPTURE
            Opacity 0 makes it invisible to user.
            onclone in html2canvas makes it visible for capture.
        */}
        <div
          id="pdf-capture-target"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: `${TICKET_WIDTH_PX}px`,
            height: `${TICKET_HEIGHT_PX}px`,
            zIndex: -9999,
            background: '#ffffff',
            overflow: 'hidden',
            visibility: 'visible',
            opacity: 0,
            pointerEvents: 'none',
          }}
        >
          {/* Inner div is what we actually capture */}
          <div
            ref={pdfSourceRef}
            style={{ width: '100%', height: '100%', backgroundColor: '#ffffff' }}
          >
            <PrintableTicket ticket={ticket} stationInfo={stationInfo} />
          </div>
        </div>

        {/* Footer Toolbar */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-white border-t border-industrial-border flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 z-10 safe-area-bottom">
          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 border border-slate-200 order-2 sm:order-1 w-full sm:w-auto justify-center">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded hover:bg-white hover:shadow-sm transition-all flex-1 sm:flex-none"
            >
              <ZoomOutIcon className="w-5 h-5 text-gray-600 mx-auto" />
            </button>
            <span className="font-mono text-xs font-bold text-gray-600 w-12 text-center hidden sm:block">
              {(zoom * 100).toFixed(0)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded hover:bg-white hover:shadow-sm transition-all flex-1 sm:flex-none"
            >
              <ZoomInIcon className="w-5 h-5 text-gray-600 mx-auto" />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-2 rounded hover:bg-white hover:shadow-sm transition-all flex-1 sm:flex-none"
            >
              <ZoomResetIcon className="w-5 h-5 text-gray-600 mx-auto" />
            </button>
          </div>

          <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            <button
              onClick={() => setShowSignatureModal(true)}
              className={`px-2 py-2.5 sm:px-4 sm:py-2.5 rounded-lg border font-bold transition-colors text-xs sm:text-sm uppercase flex items-center justify-center gap-1.5 whitespace-nowrap ${ticket.isSigned ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'}`}
            >
              <EditIcon className="w-4 h-4 sm:w-5 sm:h-5" />{' '}
              <span>{ticket.isSigned ? 'Ký lại' : 'Ký tên'}</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-2 py-2.5 sm:px-4 sm:py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 font-bold hover:bg-red-100 transition-colors text-xs sm:text-sm uppercase flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-wait whitespace-nowrap"
            >
              {isGeneratingPdf ? (
                <svg
                  className="animate-spin h-4 w-4 text-red-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <SaveIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
              <span>PDF</span>
            </button>

            {status === 'connected' && (
              <div className="items-center gap-2 mx-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200 hidden lg:flex">
                <label className="flex items-center cursor-pointer gap-2 text-sm text-gray-700 font-medium px-2 py-1 rounded hover:bg-white">
                  <input
                    type="radio"
                    name="printMethod"
                    checked={printMethod === 'server'}
                    onChange={() => setPrintMethod('server')}
                    className="accent-brand-primary"
                  />{' '}
                  PC Chính
                </label>
                <label className="flex items-center cursor-pointer gap-2 text-sm text-gray-700 font-medium px-2 py-1 rounded hover:bg-white">
                  <input
                    type="radio"
                    name="printMethod"
                    checked={printMethod === 'browser'}
                    onChange={() => setPrintMethod('browser')}
                    className="accent-brand-primary"
                  />{' '}
                  Browser
                </label>
              </div>
            )}

            <button
              onClick={handlePrint}
              disabled={isProcessing}
              className={`px-2 py-2.5 sm:px-6 sm:py-2.5 rounded-lg font-bold text-white shadow-lg transition-all flex items-center justify-center gap-1.5 text-xs sm:text-sm uppercase tracking-wide whitespace-nowrap ${isProcessing ? 'bg-gray-400 cursor-wait' : 'bg-brand-primary hover:bg-blue-700 hover:shadow-xl active:transform active:scale-95'}`}
            >
              {isProcessing ? (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <PrinterIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
              <span>{printMethod === 'server' ? 'Gửi in' : 'In phiếu'}</span>
            </button>
          </div>
        </div>
      </div>

      {showSignatureModal && (
        <SignatureModal
          ticket={ticket}
          defaultOperatorName={stationInfo.defaultOperatorName}
          onClose={() => setShowSignatureModal(false)}
          onConfirm={handleSignatureConfirm}
        />
      )}
    </div>
  );
};
