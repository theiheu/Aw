import React, { useState, useEffect } from 'react';
import {
  ScaleIcon,
  SettingsIcon,
  PrinterIcon,
  DatabaseIcon,
  UserIcon,
  HelpCircleIcon,
  AlertTriangleIcon,
} from '../common/icons';
import { useMqtt, MqttStatus } from '../../hooks/useMqtt';
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

const getStatusIndicator = (status: MqttStatus, config: any) => {
  switch (status) {
    case 'connected':
      return (
        <div className="flex flex-col items-end">
          <div className="flex items-center px-3 py-1 bg-green-50 border border-green-200 rounded-full mb-1">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
            <span className="text-green-700 text-xs font-bold uppercase tracking-wide">
              Đã kết nối
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            {config.proto}://{config.ip}:{config.port}
            {config.path}
          </span>
        </div>
      );
    case 'connecting':
      return (
        <div className="flex items-center px-3 py-1 bg-yellow-50 border border-yellow-200 rounded-full">
          <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2 animate-spin"></div>
          <span className="text-yellow-700 text-xs font-bold uppercase tracking-wide">
            Đang kết nối...
          </span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center px-3 py-1 bg-red-50 border border-red-200 rounded-full">
          <div className="w-2 h-2 rounded-full bg-red-500 mr-2"></div>
          <span className="text-red-700 text-xs font-bold uppercase tracking-wide">
            Lỗi kết nối
          </span>
        </div>
      );
    case 'disconnected':
    default:
      return (
        <div className="flex items-center px-3 py-1 bg-slate-100 border border-slate-200 rounded-full">
          <div className="w-2 h-2 rounded-full bg-slate-400 mr-2"></div>
          <span className="text-slate-600 text-xs font-bold uppercase tracking-wide">
            Chưa kết nối
          </span>
        </div>
      );
  }
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  setActiveScreen,
  stationInfo,
  onUpdateStationInfo,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const [mqttIpInput, setMqttIpInput] = useState('');
  const [mqttPortInput, setMqttPortInput] = useState('');
  const [mqttProtoInput, setMqttProtoInput] = useState('ws');
  const [mqttPathInput, setMqttPathInput] = useState('/mqtt');
  const [mqttUserInput, setMqttUserInput] = useState('');
  const [mqttPassInput, setMqttPassInput] = useState('');
  const [machineIdInput, setMachineIdInput] = useState('');

  const [stationInfoInput, setStationInfoInput] = useState<StationInfo>(stationInfo);

  // Printer Settings State
  const [paperSizeInput, setPaperSizeInput] = useState('a5');
  const [printQualityInput, setPrintQualityInput] = useState('normal');
  const [printSecretInput, setPrintSecretInput] = useState('');

  const [showGuide, setShowGuide] = useState(false);
  const { status: connectionStatus, mqttConfig, error: connectionError } = useMqtt();

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

  useEffect(() => {
    setMqttIpInput(localStorage.getItem('mqttBrokerIp') || 'localhost');
    setMqttPortInput(localStorage.getItem('mqttBrokerPort') || '9001');
    setMqttProtoInput(localStorage.getItem('mqttBrokerProto') || 'ws');
    setMqttPathInput(localStorage.getItem('mqttBrokerPath') || '/mqtt');
    setMqttUserInput(localStorage.getItem('mqttUsername') || '');
    setMqttPassInput(localStorage.getItem('mqttPassword') || '');
    setMachineIdInput(localStorage.getItem('machineId') || 'weigh1');

    // Load Printer Settings
    setPaperSizeInput(localStorage.getItem('printerPaperSize') || 'a5');
    setPrintQualityInput(localStorage.getItem('printerQuality') || 'normal');
    setPrintSecretInput(localStorage.getItem('printSecret') || '');

    setStationInfoInput(stationInfo);
  }, [stationInfo]);

  const handleConnectionSave = () => {
    if (mqttIpInput && machineIdInput && mqttPortInput) {
      localStorage.setItem('mqttBrokerIp', mqttIpInput);
      localStorage.setItem('mqttBrokerPort', mqttPortInput);
      localStorage.setItem('mqttBrokerProto', mqttProtoInput);
      localStorage.setItem('mqttBrokerPath', mqttPathInput);
      localStorage.setItem('mqttUsername', mqttUserInput);
      localStorage.setItem('mqttPassword', mqttPassInput);
      localStorage.setItem('machineId', machineIdInput);

      alert('Đã lưu cấu hình! Đang thử kết nối lại...');
      window.location.reload();
    } else {
      alert('Vui lòng nhập IP, Port và Mã trạm cân.');
    }
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
    { id: 'connection', label: 'Kết nối PC Cân', icon: <ScaleIcon className="w-5 h-5" /> },
    { id: 'printer', label: 'Máy in', icon: <PrinterIcon className="w-5 h-5" /> },
  ];

  return (
    <div className="bg-industrial-bg h-full flex flex-col overflow-hidden">
      <header className="bg-white shadow-sm sticky top-0 z-10 shrink-0 border-b border-industrial-border">
        <div className="px-6 py-4">
          <h1 className="text-xl font-extrabold text-brand-primary uppercase tracking-tight">
            Cài đặt hệ thống
          </h1>
        </div>

        {/* Tabs Navigation */}
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
        {/* TAB: GENERAL */}
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
                    <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                      Tên trạm cân
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={stationInfoInput.name}
                      onChange={handleStationInfoChange}
                      className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                      Địa chỉ
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={stationInfoInput.address}
                      onChange={handleStationInfoChange}
                      className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                      Số điện thoại
                    </label>
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
                    <label className="block text-xs font-bold text-industrial-muted uppercase">
                      Nhân viên cân mặc định
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    Tên này sẽ tự động điền vào phiếu cân mới để tiết kiệm thời gian.
                  </p>
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
                  <button
                    onClick={handleStationInfoSave}
                    className="bg-brand-primary hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition-all active:scale-95 text-sm uppercase tracking-wide"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              icon={<DatabaseIcon className="w-6 h-6" />}
              title="Lối tắt Quản lý Dữ liệu"
              description="Truy cập nhanh vào danh mục xe, khách hàng."
            >
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <p className="font-bold text-industrial-text">Dữ liệu nền tảng</p>
                  <p className="text-xs text-slate-500">Khách hàng, Phương tiện, Hàng hoá</p>
                </div>
                <button
                  onClick={() => setActiveScreen('dataManagement')}
                  className="bg-white border border-industrial-border hover:border-brand-primary text-brand-primary font-bold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm"
                >
                  Mở Quản lý
                </button>
              </div>
            </SettingsCard>
          </>
        )}

        {/* TAB: CONNECTION */}
        {activeTab === 'connection' && (
          <SettingsCard
            icon={<ScaleIcon className="w-6 h-6" />}
            title="Kết nối MQTT Broker"
            description="Thiết lập kết nối tới PC trung tâm để nhận số cân và gửi lệnh in."
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="text-sm font-bold text-industrial-text">Trạng thái hiện tại</span>
                {getStatusIndicator(connectionStatus, mqttConfig)}
              </div>

              {/* MIXED CONTENT WARNING */}
              {isHttps && mqttProtoInput === 'ws' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-800">
                      Cảnh báo bảo mật (Mixed Content)
                    </p>
                    <p className="text-[10px] text-amber-700 mt-1">
                      Trang web đang chạy HTTPS nhưng bạn đang chọn <strong>ws://</strong>. Trình
                      duyệt sẽ chặn kết nối này. Vui lòng chọn <strong>wss://</strong> hoặc chạy web
                      ở chế độ HTTP.
                    </p>
                  </div>
                </div>
              )}

              {/* ERROR TROUBLESHOOTING BOX */}
              {(connectionStatus === 'error' || connectionError) && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <AlertTriangleIcon className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-red-900 uppercase">Kết nối thất bại</h3>
                      <p className="text-xs text-red-700 mt-1 font-mono bg-red-100/50 p-1 rounded break-all">
                        {connectionError || 'Không thể kết nối tới Broker.'}
                      </p>

                      <div className="mt-3 pt-3 border-t border-red-200">
                        <p className="text-xs font-bold text-red-800 mb-2">Gợi ý khắc phục:</p>
                        <ul className="text-xs text-red-800 space-y-2 list-disc pl-4">
                          <li>
                            <strong>Lỗi vòng lặp (Reconnect Loop):</strong> Thường do sai Path. Hãy
                            thử đổi Path thành <code>/mqtt</code> hoặc <code>/</code>.
                          </li>
                          <li>
                            <strong>Cổng sai:</strong> Hãy chắc chắn Broker đang mở cổng WebSocket
                            (VD: 9001), không phải cổng TCP (1883).
                          </li>
                          <li>
                            <strong>Firewall:</strong> Kiểm tra tường lửa máy chủ có cho phép kết
                            nối cổng {mqttPortInput} không.
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <div className="flex items-start gap-3">
                  <HelpCircleIcon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-blue-900">Lưu ý về WebSocket</h3>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Ứng dụng web yêu cầu kết nối qua giao thức <strong>WebSocket</strong>. Bạn cần
                      cấu hình Broker (Mosquitto, EMQX) để mở cổng WebSocket.
                    </p>
                    <button
                      onClick={() => setShowGuide(!showGuide)}
                      className="text-xs font-bold text-blue-700 hover:text-blue-900 underline mt-1"
                    >
                      {showGuide ? 'Ẩn hướng dẫn cấu hình' : 'Xem hướng dẫn cấu hình Mosquitto'}
                    </button>
                  </div>
                </div>

                {showGuide && (
                  <div className="mt-3 pt-3 border-t border-blue-200 text-xs font-mono bg-white p-3 rounded border border-slate-200 text-slate-600 overflow-x-auto">
                    <p className="font-bold text-slate-800 mb-2 font-sans">
                      // File: mosquitto.conf
                    </p>
                    <p className="mb-1 text-slate-500"># Default TCP Listener (Cho thiết bị IoT)</p>
                    <p className="text-emerald-700">listener 1883</p>
                    <p className="text-emerald-700 mb-2">allow_anonymous true</p>

                    <p className="mb-1 text-slate-500">
                      # WebSocket Listener (Bắt buộc cho Web App)
                    </p>
                    <p className="text-purple-700 font-bold">listener 9001</p>
                    <p className="text-purple-700 font-bold mb-2">protocol websockets</p>
                    <p className="text-emerald-700">allow_anonymous true</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                    Giao thức
                  </label>
                  <select
                    value={mqttProtoInput}
                    onChange={(e) => setMqttProtoInput(e.target.value)}
                    className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm font-medium"
                  >
                    <option value="ws">ws://</option>
                    <option value="wss">wss://</option>
                  </select>
                </div>
                <div className="col-span-8 sm:col-span-4">
                  <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                    Địa chỉ IP Broker
                  </label>
                  <input
                    type="text"
                    value={mqttIpInput}
                    onChange={(e) => setMqttIpInput(e.target.value)}
                    placeholder="VD: 192.168.1.10"
                    className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary font-mono text-sm"
                  />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                    Cổng
                  </label>
                  <input
                    type="text"
                    value={mqttPortInput}
                    onChange={(e) => setMqttPortInput(e.target.value)}
                    placeholder="9001"
                    className={`block w-full px-3 py-2.5 bg-white border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary font-mono text-sm ${mqttPortInput === '1883' ? 'border-red-500 text-red-600 bg-red-50' : 'border-slate-300'}`}
                  />
                </div>
                <div className="col-span-6 sm:col-span-4">
                  <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                    Path (Đường dẫn)
                  </label>
                  <input
                    type="text"
                    value={mqttPathInput}
                    onChange={(e) => setMqttPathInput(e.target.value)}
                    placeholder="/mqtt"
                    className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary font-mono text-sm"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">
                    Mặc định: /mqtt (EMQX/RabbitMQ) hoặc / (Mosquitto)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                  Mã trạm cân (Topic Prefix)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-sm">
                    weigh/
                  </div>
                  <input
                    type="text"
                    value={machineIdInput}
                    onChange={(e) => setMachineIdInput(e.target.value)}
                    placeholder="ID"
                    className="block w-full pl-16 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary font-mono text-sm font-bold text-industrial-text"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Dùng để phân biệt các trạm cân trong hệ thống.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-2">
                <div className="text-xs font-bold text-industrial-text mb-3 uppercase">
                  Xác thực (Tùy chọn)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={mqttUserInput}
                      onChange={(e) => setMqttUserInput(e.target.value)}
                      autoComplete="off"
                      className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={mqttPassInput}
                      onChange={(e) => setMqttPassInput(e.target.value)}
                      autoComplete="new-password"
                      className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 pt-2">
                <button
                  onClick={handleConnectionSave}
                  className="w-full bg-brand-primary hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-colors text-sm uppercase"
                >
                  Lưu cấu hình & Kết nối
                </button>
              </div>
            </div>
          </SettingsCard>
        )}

        {/* TAB: PRINTER */}
        {activeTab === 'printer' && (
          <SettingsCard
            icon={<PrinterIcon className="w-6 h-6" />}
            title="Cấu hình In ấn"
            description="Thiết lập khổ giấy và chất lượng in cho phiếu cân."
          >
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                  Khổ giấy mặc định
                </label>
                <select
                  value={paperSizeInput}
                  onChange={(e) => setPaperSizeInput(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm font-medium"
                >
                  <option value="a5">A5 (Khuyên dùng cho phiếu cân)</option>
                  <option value="a4">A4 (In 2 bản trên 1 trang)</option>
                  <option value="thermal">In nhiệt (K80)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Lưu ý: Phiếu in được thiết kế tối ưu cho khổ A5 Ngang.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                  Chất lượng in
                </label>
                <select
                  value={printQualityInput}
                  onChange={(e) => setPrintQualityInput(e.target.value)}
                  className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary text-sm font-medium"
                >
                  <option value="draft">Thấp (Tiết kiệm mực / In nhanh)</option>
                  <option value="normal">Bình thường</option>
                  <option value="high">Cao (Sắc nét)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-industrial-muted uppercase mb-1">
                  Print Secret (PC Trung tâm)
                </label>
                <input
                  type="text"
                  value={printSecretInput}
                  onChange={(e) => setPrintSecretInput(e.target.value)}
                  placeholder="Nhập mã bí mật cấu hình ở weigh-agent (config.json)"
                  className="block w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary font-mono text-sm"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  FE sẽ gửi secret này kèm lệnh in lên topic weigh/{'{'}machineId{'}'}/print để PC trung tâm xác thực.
                </p>
              </div>

              <div className="grid grid-cols-1 pt-4">
                <button
                  onClick={handlePrinterSave}
                  className="w-full bg-brand-primary hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-md transition-colors text-sm uppercase"
                >
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
