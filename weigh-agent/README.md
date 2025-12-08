# Weigh Agent (Scale + Printer)

Weigh Agent là ứng dụng chạy trên PC trung tâm để:
- Đọc số cân từ cổng serial (COM/tty) và phát realtime lên MQTT
- Nhận lệnh in từ Web qua MQTT và in PDF ra máy in nội bộ
- (Tuỳ chọn) Đẩy sự kiện cân/trạng thái/in lên Backend qua HTTP
- Hỗ trợ mô phỏng số cân (fake mode) khi không có cân thật
- Có GUI (Tkinter) cho người dùng và CLI cho chạy headless

---
## 1) Tính năng
- Kết nối MQTT (TCP 1883) với Last Will: OFFLINE khi agent mất kết nối
- Topics mặc định (machineId ví dụ: `weigh1`):
  - Publish cân: `weigh/weigh1/reading` (payload: số dạng text, ví dụ `12345`)
  - Publish trạng thái: `weigh/weigh1/status` (ONLINE, OFFLINE, PRINT_OK, PRINT_ERROR)
  - Subscribe lệnh in: `weigh/weigh1/print` (JSON: pdfBase64 hoặc pdfUrl + secret + optional printer)
- In PDF:
  - Windows: ShellExecute/StartFile (cần PDF reader mặc định, ví dụ SumatraPDF/Adobe Reader)
  - Linux/macOS: dùng `lp`/`lpr` (CUPS)
- Fake scale mode: sine | random | saw | step | manual + tham số (min/max/hz/noise/step)
- Backend push (optional): POST sự kiện vào `${backendUrl}${backendEventsEndpoint}` với retry/backoff
- GUI cấu hình nhanh, CLI chạy không GUI, gói chạy được bằng PyInstaller

---
## 2) Yêu cầu hệ thống
- Python 3.10+ (Windows/Linux/macOS)
- Thư viện hệ thống:
  - Linux: Tkinter và CUPS CLI
    - Ubuntu/Debian: `sudo apt-get install python3-tk cups-bsd`
  - Windows: khuyến nghị cài PDF reader làm mặc định (SumatraPDF/Adobe Reader) để in PDF
- Python packages: xem `requirements.txt`

---
## 3) Cài đặt
```bash
cd weigh-agent
python3 -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```
Tuỳ chọn cho build đóng gói:
```bash
pip install -r dev-requirements.txt
```

---
## 4) Cấu hình (config.json)
Tệp `weigh-agent/config.json` (đã có sẵn mẫu). Ví dụ:
```json
{
  "machineId": "weigh1",
  "mqttHost": "127.0.0.1",
  "mqttPort": 1883,
  "mqttUsername": "",
  "mqttPassword": "",
  "printSecret": "change-me-strong-secret",
  "serialPort": "COM3",
  "baudRate": 9600,
  "serialEncoding": "ascii",
  "serialRegex": "(?P<weight>-?\\d+(?:\\.\\d+)?)",
  "decimals": 0,
  "simulateScale": true,
  "fakeMode": "sine",
  "fakeMin": 1000,
  "fakeMax": 30000,
  "fakeHz": 0.2,
  "fakeNoise": 5,
  "fakeStep": 250,
  "fakeManualWeight": 1234,
  "printerName": "",
  "backendUrl": "",
  "backendEventsEndpoint": "/api/events",
  "backendEnabled": false,
  "backendMinIntervalMs": 500,
  "backendDeltaThreshold": 5,
  "backendApiKey": "",
  "publishIntervalMs": 300,
  "logLevel": "INFO"
}
```
Lưu ý:
- JSON cần escape đúng với regex: dùng `\\d` thay vì `\d`, `\\.` thay vì `\.`
- `machineId` phải khớp với cấu hình trên Web App
- `printSecret` phải trùng với Web để lệnh in được chấp nhận

---
## 5) Chạy bằng GUI (khuyến nghị)
```bash
python3 weigh_agent_gui.py
```
Trong GUI:
- MQTT: nhập Host/Port/User/Pass, Machine ID
- Serial: chọn cổng COM/tty, Baud, Regex (khi dùng cân thật)
- Simulate Scale: bật mô phỏng -> chọn Fake Mode và tham số
- Printing: chọn Printer (Linux đọc từ CUPS, Windows từ hệ thống), Test Print PDF
- Save Config để lưu thay đổi vào `config.json`
- Start/Stop để khởi chạy/dừng Agent

---
## 6) Chạy bằng CLI (headless)
```bash
python3 weigh_agent_cli.py \
  --simulate \
  --fake-mode sine \
  --fake-hz 0.2
```
Tham số CLI hỗ trợ:
- `--simulate` bật giả lập
- `--fake-mode` `sine|random|saw|step|manual`
- `--fake-min --fake-max --fake-hz --fake-noise --fake-step` chỉnh tín hiệu
- `--manual` đặt cân ban đầu cho manual mode

Khi chạy CLI có thể nhập lệnh tương tác:
- `set 15000` đặt cân thủ công (manual)
- `+ 100` tăng 100; `- 50` giảm 50
- `mode step` đổi fake mode
- `quit` thoát

---
## 7) MQTT Topics & Payloads
- Publish cân: `weigh/{machineId}/reading` (payload text, ví dụ `12345`)
- Publish trạng thái: `weigh/{machineId}/status` (ONLINE, OFFLINE, PRINT_OK, PRINT_ERROR)
- Subscribe lệnh in: `weigh/{machineId}/print`
  - JSON ví dụ:
    ```json
    {
      "secret": "change-me-strong-secret",
      "pdfUrl": "https://example.com/ticket.pdf",
      "printer": "Your_Printer_Name" // tuỳ chọn
    }
    ```
  - Hoặc dùng `pdfBase64` thay cho `pdfUrl`

---
## 8) Backend Push (tuỳ chọn)
- Bật `backendEnabled` và cấu hình:
  - `backendUrl`: ví dụ `http://localhost:4000`
  - `backendEventsEndpoint`: ví dụ `/api/events`
  - `backendApiKey`: nếu backend yêu cầu header `X-API-Key`
  - Throttle: `backendMinIntervalMs`, `backendDeltaThreshold`
- Agent sẽ POST các sự kiện JSON:
  - `{ type: "reading", weight, machineId, timestamp }`
  - `{ type: "status", status, machineId, timestamp }`
  - `{ type: "print", result, machineId, timestamp }`
- Có hàng đợi nội bộ (queue), retry với backoff (1s,2s,5s,10s)

---
## 9) In ấn
- Windows:
  - In PDF qua ShellExecute/StartFile. Cần PDF reader mặc định cài trong máy
  - Có thể chỉ định printer qua payload (`printer`) hoặc cấu hình `printerName`
- Linux/macOS:
  - Dùng `lp` hoặc `lpr` (CUPS). Cài đặt: `sudo apt-get install cups-bsd`
  - Danh sách printer: GUI sẽ tự lấy bằng `lpstat -a`

---
## 10) Đóng gói (PyInstaller)
Cài công cụ:
```bash
pip install -r dev-requirements.txt
```
Build GUI (không hiện console):
```bash
pyinstaller -y pyinstaller_gui.spec
# output: dist/weigh-agent-gui/
```
Build CLI (có console):
```bash
pyinstaller -y pyinstaller_cli.spec
# output: dist/weigh-agent-cli/
```
Khi chạy file đóng gói, đặt `config.json` cạnh file thực thi để cấu hình nhanh.

---
## 11) Tự khởi động (Autostart)
- Linux (systemd, chạy CLI):
  ```ini
  [Unit]
  Description=Weigh Agent
  After=network-online.target

  [Service]
  WorkingDirectory=/path/to/weigh-agent
  Environment=AGENT_API_KEY=your-key
  ExecStart=/path/to/weigh-agent/.venv/bin/python3 /path/to/weigh-agent/weigh_agent_cli.py --simulate
  Restart=always

  [Install]
  WantedBy=multi-user.target
  ```
- Windows: dùng Task Scheduler để chạy `weigh_agent_gui.exe` hoặc `python weigh_agent_gui.py` khi logon

---
## 12) Troubleshooting
- JSONDecodeError: `Invalid \escape` khi mở `config.json`:
  - Hãy đảm bảo regex được escape đúng (ví dụ `"(?P<weight>-?\\d+(?:\\.\\d+)?)"`)
- Không in được (Windows):
  - Cài và đặt mặc định một PDF reader (SumatraPDF/Adobe). Thử in test trong GUI
- Không in được (Linux):
  - Cài `cups-bsd` để có `lp`/`lpr`, chọn đúng printer, thử `lpstat -p -d`
- MQTT không nhận kết nối:
  - Kiểm tra broker (1883), firewall, user/pass nếu có
- Không nhận được số cân thật:
  - Kiểm tra cổng serial, baudrate, định dạng dữ liệu và regex trích xuất số
- Fake mode không thay đổi:
  - Kiểm tra đã bật Simulate Scale. Với manual, dùng nút "Set Manual Weight" hoặc lệnh CLI `set`

---
## 13) Bảo mật (khuyến nghị)
- Đặt `printSecret` mạnh và trùng với Web
- Bật user/password cho MQTT và cấu hình trong agent
- Dùng `backendApiKey` và HTTPS cho Backend push trên môi trường production

---
## License
MIT © Your Team

