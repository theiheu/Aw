import React, { useState, useEffect } from 'react';
import {
  ScaleIcon,
  SettingsIcon,
  PrinterIcon,
  DatabaseIcon,
  UserIcon,
} from '../common/icons';
import { WebSocketStatus, useWebSocket } from '../../contexts/WebSocketContext';
import { StationInfo, AppScreen } from '../../types';

interface SettingsScreenProps {
  setActiveScreen: (screen: AppScreen) => void;
  stationInfo: StationInfo;
  onUpdateStationInfo: (info: StationInfo) => void;
}

type SettingsTab = 'general' | 'connection' | 'printer';

const SettingsCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ icon, title, description, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-industrial-border overflow-hidden mb-6 animate-in fade-in duration-300 slide-in-from-bottom-2">
    <div className="p-5 border-b border-slate-100 flex items-start gap-4">
      <div className="p-2.5 bg-slate-50 rounded-lg text-brand-primary border border-slate-200 shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-industrial-text">{title}</h2>
        {description && <p className="text-sm text-industrial-muted mt-1">{description}</p>}
      </div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const wsStatusBadge = (status: WebSocketStatus, url: string) => {
  const Badge = ({ color, text }: { color: string; text: string }) => (
    <div className={`flex items-center px-3 py-1 ${color} rounded-full`}>
      <div className={`w-2 h-2 rounded-full bg-current mr-2`}></div>
      <span className="text-current text-xs font-bold uppercase tracking-wide">{text}</span>
    </div>
  );
  switch (status) {
    case 'connected':
      return (
        <div className="flex flex-col items-end">
          <div className="text-green-600"><Badge color="bg-green-50 text-green-700 border border-green-200" text="Đã kết nối" /></div>
          <span className="text-[10px] text-slate-400 font-mono mt-1">{url}</span>
        </div>
      );
    case 'connecting':
      return <div className="text-yellow-600"><Badge color="bg-yellow-50 text-yellow-700 border border-yellow-200" text="Đang kết nối" /></div>;
    case 'error':
      return <div className="text-red-600"><Badge color="bg-red-50 text-red-700 border border-red-200" text="Lỗi kết nối" /></div>;
    default:
      return <div className="text-slate-600"><Badge color="bg-slate-100 text-slate-700 border border-slate-200" text="Chưa kết nối" /></div>;
  }
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  setActiveScreen,
  stationInfo,
  onUpdateStationInfo,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // WS config
  const { status: wsStatus } = useWebSocket();
  const [wsUrlInput, setWsUrlInput] = useState('');

  // Other settings
  const [stationInfoInput, setStationInfoInput] = useState<StationInfo>(stationInfo);
  const [paperSizeInput, setPaperSizeInput] = useState('a5');
  const [printQualityInput, setPrintQualityInput] = useState('normal');
  const [printSecretInput, setPrintSecretInput] = useState('');

  useEffect(() => {
    const savedUrl = localStorage.getItem('weighingServerUrl');
    if (savedUrl) setWsUrlInput(savedUrl);
    else if (typeof window !== 'undefined') {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      setWsUrlInput(`${proto}://${window.location.hostname}:4000/ws/weight`);
    }

    // Load Printer Settings
    setPaperSizeInput(localStorage.getItem('printerPaperSize') || 'a5');
    setPrintQualityInput(localStorage.getItem('printerQuality') || 'normal');
    setPrintSecretInput(localStorage.getItem('printSecret') || '');

    setStationInfoInput(stationInfo);
  }, [stationInfo]);

  const handleConnectionSave = () => {
    if (!wsUrlInput || !/^wss?:\/\//i.test(wsUrlInput)) {
      alert('Vui lòng nhập WebSocket URL hợp lệ, ví dụ: ws://server:4000/ws/weight');
      return;
    }
    localStorage.setItem('weighingServerUrl', wsUrlInput);
    alert('Đã lưu cấu hình! Ứng dụng sẽ kết nối lại.');
    window.location.reload();
  };

  const handlePrinterSave = () => {
    localStorage.setItem('printerPaperSize', paperSizeInput);
    localStorage.setItem('printerQuality', printQualityInput);
    localStorage.setItem('printSecret', printSecretInput);
    alert('Đã lưu cấu hình in ấn!');
  };

  const handleStationInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStationInfoInput((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleStationInfoSave = () => {
    onUpdateStationInfo(stationInfoInput);
    alert('Đã lưu thông tin trạm cân!');
  };

  const tabs = [
    { id: 'general', label: 'Thông tin chung', icon: <SettingsIcon className="w-5 h-5" /> },
    { id: 'connection', label: 'Kết nối Backend', icon: <ScaleIcon className="w-5 h-5" /> },
    { id: 'printer', label: 'Máy in', icon: <PrinterIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="bg-industrial-bg h-full flex flex-col overflow-hidden">
      <header className="bg-white shadow-sm sticky top-0 z-10 shrink-0 border-b border-industrial-border">
        <div className="px-6 py-4">
          <h1 className="text-xl font-extrabold text-brand-primary uppercase tracking-tight">Cài đặt hệ thống</h1>
        </div>
        <div className="flex px-6 space-x-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center pb-3 px-1 border-b-2 transition-all duration-200 font-bold text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-industrial-muted hover:text-industrial-text hover:border-slate-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-grow overflow-y-auto custom-scrollbar p-6 pb-24 max-w-4xl mx-auto w-full">
        {activeTab === 'general' && (
          <>
            <SettingsCard
              icon={<SettingsIcon className="w-6 h-6" />}
              title="Thông tin Trạm cân"
              description="Thông tin này sẽ hiển thị trên đầu phiếu in."
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">Tên trạm cân</label>
                    <input
                      type="text"
                      name="name"
                      value={stationInfoInput.name}
                      onChange={handleStationInfoChange}
                      className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">Địa chỉ</label>
                    <input
                      type="text"
                      name="address"
                      value={stationInfoInput.address}
                      onChange={handleStationInfoChange}
                      className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">Số điện thoại</label>
                    <input
                      type="text"
                      name="phone"
                      value={stationInfoInput.phone}
                      onChange={handleStationInfoChange}
                      className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <div className="flex items-center mb-2">
                    <UserIcon className="w-4 h-4 text-industrial-muted mr-2" />
                    <label className="block text-xs font-bold text-industrial-muted uppercase">Nhân viên cân mặc định</label>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">Tên này sẽ tự động điền vào phiếu cân mới để tiết kiệm thời gian.</p>
                  <input
                    type="text"
                    name="defaultOperatorName"
                    value={stationInfoInput.defaultOperatorName || ''}
                    onChange={handleStationInfoChange}
                    placeholder="VD: Admin User"
                    className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm font-medium"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button onClick={handleStationInfoSave} className="bg-brand-primary hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-all active:scale-95 text-sm uppercase tracking-wide">
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard icon={<DatabaseIcon className="w-6 h-6" />} title="Lối tắt Quản lý Dữ liệu" description="Truy cập nhanh vào danh mục xe, khách hàng.">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <p className="font-bold text-industrial-text">Dữ liệu nền tảng</p>
                  <p className="text-xs text-slate-500">Khách hàng, Phương tiện, Hàng hoá</p>
                </div>
                <button onClick={() => setActiveScreen('dataManagement')} className="bg-white border border-industrial-border hover:border-brand-primary text-brand-primary font-bold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm">
                  Mở Quản lý
                </button>
              </div>
            </SettingsCard>
          </>
        )}

        {activeTab === 'connection' && (
          <SettingsCard
            icon={<ScaleIcon className="w-6 h-6" />}
            title="Kết nối WebSocket tới Backend"
            description="Thiết lập WebSocket để nhận số cân trực tiếp từ Backend (không cần MQTT trên trình duyệt)."
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="text-sm font-bold text-industrial-text">Trạng thái hiện tại</span>
                {wsStatusBadge(wsStatus, wsUrlInput)}
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">WebSocket URL</label>
                  <input
                    type="text"
                    value={wsUrlInput}
                    onChange={(e) => setWsUrlInput(e.target.value)}
                    placeholder="ws://<server>:4000/ws/weight"
                    className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary font-mono text-sm"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Mẹo: nếu Frontend và Backend cùng máy chủ, dùng {`ws://${window?.location?.hostname || 'localhost'}:4000/ws/weight`}.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 pt-2">
                <button onClick={handleConnectionSave} className="w-full bg-brand-primary hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-colors text-sm uppercase">
                  Lưu cấu hình & Kết nối
                </button>
              </div>
            </div>
          </SettingsCard>
        )}

        {activeTab === 'printer' && (
          <SettingsCard icon={<PrinterIcon className="w-6 h-6" />} title="Cấu hình In ấn" description="Thiết lập khổ giấy và chất lượng in cho phiếu cân.">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">Khổ giấy mặc định</label>
                <select value={paperSizeInput} onChange={(e) => setPaperSizeInput(e.target.value)} className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm font-medium">
                  <option value="a5">A5 (Khuyên dùng cho phiếu cân)</option>
                  <option value="a4">A4 (In 2 bản trên 1 trang)</option>
                  <option value="thermal">In nhiệt (K80)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Lưu ý: Phiếu in được thiết kế tối ưu cho khổ A5 Ngang.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">Chất lượng in</label>
                <select value={printQualityInput} onChange={(e) => setPrintQualityInput(e.target.value)} className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm font-medium">
                  <option value="draft">Thấp (Tiết kiệm mực / In nhanh)</option>
                  <option value="normal">Bình thường</option>
                  <option value="high">Cao (Sắc nét)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">Print Secret (PC Trung tâm)</label>
                <input
                  type="text"
                  value={printSecretInput}
                  onChange={(e) => setPrintSecretInput(e.target.value)}
                  placeholder="Nhập mã bí mật nếu backend/agent yêu cầu"
                  className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-1 pt-4">
                <button onClick={handlePrinterSave} className="w-full bg-brand-primary hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-colors text-sm uppercase">
                  Lưu cấu hình in
                </button>
              </div>
            </div>
          </SettingsCard>
        )}
      </main>
    </div>
  );
};
