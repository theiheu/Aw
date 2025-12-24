import React, { useMemo } from 'react';

// --- Industrial Digital Display Component ---
export const DigitalDisplay: React.FC<{ weight: number; status: string; isMobile?: boolean }> = React.memo(
  ({ weight, status, isMobile }) => {
    const formattedWeight = Math.floor(weight).toLocaleString('vi-VN');

    const getStatusColor = (s: string) => {
      if (s === 'connected') return 'bg-digital-on shadow-[0_0_5px_#00ff41]';
      if (s === 'connecting') return 'bg-yellow-500 shadow-[0_0_5px_yellow] animate-pulse';
      if (s === 'error') return 'bg-red-500 shadow-[0_0_5px_red] animate-pulse';
      return 'bg-slate-500 shadow-[0_0_5px_gray]';
    };

    const getStatusText = (s: string) => {
      if (s === 'connected') return 'ONLINE';
      if (s === 'connecting') return 'WAITING...';
      if (s === 'error') return 'ERROR';
      return 'OFFLINE';
    };

    if (isMobile) {
      // --- MOBILE COMPACT VIEW ---
      return (
        <div className="bg-gray-900 p-3 shadow-md border-b-4 border-brand-primary relative overflow-hidden flex items-center justify-between">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(0deg, transparent 24%, #222 25%, #222 26%, transparent 27%, transparent 74%, #222 75%, #222 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #222 25%, #222 26%, transparent 27%, transparent 74%, #222 75%, #222 76%, transparent 77%, transparent)',
              backgroundSize: '20px 20px',
            }}
          ></div>

          {/* Left: Status */}
          <div className="flex flex-col gap-1 z-10 pl-1">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}></div>
              <span
                className={`text-[10px] font-mono uppercase tracking-widest ${status === 'error' ? 'text-red-500 font-bold' : 'text-gray-400'}`}
              >
                {getStatusText(status)}
              </span>
            </div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-gray-600">
              STABLE
            </span>
          </div>

          {/* Right: Weight & Unit */}
          <div className="flex items-baseline gap-1 z-10">
            <div className="font-digital text-5xl font-bold tracking-wider text-digital-on digital-text-shadow tabular-nums leading-none">
              {formattedWeight}
            </div>
            <div className="text-gray-500 font-mono text-sm font-bold">KG</div>
          </div>
        </div>
      );
    }

    // --- DESKTOP FULL VIEW ---
    return (
      <div className="bg-gray-900 rounded-xl p-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] border-2 border-gray-700 relative">
        {/* Bezel Screws (Visual) */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-gray-600 shadow-inner"></div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-600 shadow-inner"></div>
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-gray-600 shadow-inner"></div>
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-gray-600 shadow-inner"></div>

        <div className="bg-black rounded-lg border-4 border-gray-800 relative overflow-hidden h-40 sm:h-48 flex flex-col items-center justify-center">
          {/* Background Grid Line */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'linear-gradient(0deg, transparent 24%, #222 25%, #222 26%, transparent 27%, transparent 74%, #222 75%, #222 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, #222 25%, #222 26%, transparent 27%, transparent 74%, #222 75%, #222 76%, transparent 77%, transparent)',
              backgroundSize: '30px 30px',
            }}
          ></div>

          {/* Status Indicators */}
          <div className="absolute top-4 w-full px-6 flex justify-between items-center z-10">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}></div>
              <span
                className={`text-[10px] font-mono uppercase tracking-widest ${status === 'error' ? 'text-red-500 font-bold' : 'text-gray-500'}`}
              >
                {getStatusText(status)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                STABLE
              </span>
              <div
                className={`w-2 h-2 rounded-full ${weight > 0 && status === 'connected' ? 'bg-digital-on shadow-[0_0_8px_#00ff41]' : 'bg-gray-800'}`}
              ></div>
            </div>
          </div>

          {/* Main Digits */}
          <div className="font-digital text-7xl sm:text-8xl font-bold tracking-widest text-digital-on digital-text-shadow z-10 tabular-nums">
            {formattedWeight}
          </div>

          {/* Unit */}
          <div className="absolute bottom-4 right-6 text-gray-500 font-mono text-lg font-bold z-10">
            KG
          </div>

          {/* Zero Indicator */}
          {weight === 0 && (
            <div className="absolute bottom-4 left-6 text-brand-accent font-mono text-xs font-bold z-10 tracking-widest">
              ZERO
            </div>
          )}
        </div>
      </div>
    );
  }
);

