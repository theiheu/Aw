import threading
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import traceback
import sys
from pathlib import Path
import platform

# Local imports
from agent.config import AgentConfig, DEFAULT_CONFIG_PATH
from agent.logger import setup_logging
from agent.serial_reader import ScaleReader
from agent.printing import print_pdf_bytes, PrintError, list_printers, get_default_printer
from agent.app import WeighAgent


class AgentGUI:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Weigh Agent")
        self.root.minsize(960, 640)
        self.cfg = AgentConfig.load(DEFAULT_CONFIG_PATH)
        setup_logging(self.cfg.logLevel)

        # State
        self.agent: WeighAgent | None = None
        self.running = False
        self.latest_weight_var = tk.StringVar(value="--")
        self.status_var = tk.StringVar(value="Idle")

        # Sim/Fake
        self.var_sim = tk.BooleanVar(value=self.cfg.simulateScale)
        self.var_fake_mode = tk.StringVar(value=getattr(self.cfg, "fakeMode", "sine"))

        # Printer
        self.printers: list[str] = []
        self.var_printer = tk.StringVar(value=getattr(self.cfg, "printerName", ""))
        self.var_sumatra = tk.StringVar(value=getattr(self.cfg, "sumatraPath", ""))

        # Optimization
        self.var_reading_json = tk.BooleanVar(value=getattr(self.cfg, "readingJsonEnabled", True))
        self.var_retain = tk.BooleanVar(value=getattr(self.cfg, "retainLastReading", False))
        self.var_retain_status = tk.BooleanVar(value=getattr(self.cfg, "retainStatus", False))
        self.var_only_print_stable = tk.BooleanVar(value=getattr(self.cfg, "onlyPrintWhenStable", False))

        # Serial advanced
        self.var_bytesize = tk.StringVar(value=str(getattr(self.cfg, "bytesize", 8)))
        self.var_parity = tk.StringVar(value=getattr(self.cfg, "parity", "N"))
        self.var_stopbits = tk.StringVar(value=str(getattr(self.cfg, "stopbits", 1)))
        self.var_xonxoff = tk.BooleanVar(value=getattr(self.cfg, "xonxoff", False))
        self.var_rtscts = tk.BooleanVar(value=getattr(self.cfg, "rtscts", False))
        self.var_dsrdtr = tk.BooleanVar(value=getattr(self.cfg, "dsrdtr", False))
        self.var_dtr_on_open = tk.BooleanVar(value=getattr(self.cfg, "dtrOnOpen", False))
        self.var_rts_on_open = tk.BooleanVar(value=getattr(self.cfg, "rtsOnOpen", False))

        # MQTT QoS
        self.var_reading_qos = tk.StringVar(value=str(getattr(self.cfg, "readingQos", 0)))
        self.var_status_qos = tk.StringVar(value=str(getattr(self.cfg, "statusQos", 1)))

        # Build UI
        self._build_ui()
        self._refresh_serial_ports()
        self._refresh_printers()
        self._update_fake_controls_state()
        self._update_loop()

    # ---------------- UI -----------------
    def _build_ui(self) -> None:
        style = ttk.Style()
        try:
            style.theme_use('clam')
        except Exception:
            pass
        style.configure('TFrame', padding=10)
        style.configure('TLabel', padding=2)
        style.configure('TButton', padding=6)
        style.configure('Header.TLabel', font=('Segoe UI', 12, 'bold'))
        style.configure('Weight.TLabel', font=('Segoe UI', 28, 'bold'))
        style.configure('Caption.TLabel', foreground='#666')

        container = ttk.Frame(self.root, padding=10)
        container.grid(row=0, column=0, sticky='nsew')
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

        # Top bar: Title + Status + Quick actions
        top = ttk.Frame(container, padding=(0,0,0,10))
        top.grid(row=0, column=0, sticky='ew')
        container.rowconfigure(1, weight=1)
        container.columnconfigure(0, weight=1)

        left_top = ttk.Frame(top)
        left_top.pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Label(left_top, text='Weigh Agent', style='Header.TLabel').pack(side=tk.LEFT)
        # Status dot
        self.canvas_dot = tk.Canvas(left_top, width=14, height=14, highlightthickness=0, bg=self.root.cget('bg'))
        self.canvas_dot.pack(side=tk.LEFT, padx=(10,0))
        self._set_status_dot('#999')
        ttk.Label(left_top, textvariable=self.status_var, style='Caption.TLabel').pack(side=tk.LEFT, padx=(6,0))

        right_top = ttk.Frame(top)
        right_top.pack(side=tk.RIGHT)
        ttk.Button(right_top, text='Save Config', command=self.on_save).pack(side=tk.LEFT, padx=4)
        ttk.Button(right_top, text='Start', command=self.on_start).pack(side=tk.LEFT, padx=4)
        ttk.Button(right_top, text='Stop', command=self.on_stop).pack(side=tk.LEFT, padx=4)

        # Weight banner
        weight_banner = ttk.Frame(container, padding=(10,8))
        weight_banner.grid(row=1, column=0, sticky='ew')
        weight_banner.columnconfigure(0, weight=1)
        banner_inner = ttk.Frame(weight_banner)
        banner_inner.grid(row=0, column=0, sticky='ew')
        ttk.Label(banner_inner, text='Current Weight', style='Caption.TLabel').pack(side=tk.LEFT)
        ttk.Label(banner_inner, textvariable=self.latest_weight_var, style='Weight.TLabel').pack(side=tk.LEFT, padx=(12,0))
        ttk.Label(banner_inner, text='kg', style='Header.TLabel').pack(side=tk.LEFT, padx=(6,0))

        # Notebook
        nb = ttk.Notebook(container)
        nb.grid(row=2, column=0, sticky='nsew', pady=(10,0))
        container.rowconfigure(2, weight=1)

        tab_conn = ttk.Frame(nb)
        tab_serial = ttk.Frame(nb)
        tab_sim = ttk.Frame(nb)
        tab_print = ttk.Frame(nb)
        tab_opt = ttk.Frame(nb)
        tab_adv = ttk.Frame(nb)
        for t in (tab_conn, tab_serial, tab_sim, tab_print, tab_opt, tab_adv):
            t.columnconfigure(1, weight=1)

        nb.add(tab_conn, text='Kết nối')
        nb.add(tab_serial, text='Serial')
        nb.add(tab_sim, text='Mô phỏng')
        nb.add(tab_print, text='In ấn')
        nb.add(tab_opt, text='Tối ưu')
        nb.add(tab_adv, text='Nâng cao')

        # ---- KẾT NỐI ----
        self._build_tab_connect(tab_conn)
        # ---- SERIAL ----
        self._build_tab_serial(tab_serial)
        # ---- MÔ PHỎNG ----
        self._build_tab_sim(tab_sim)
        # ---- IN ẤN ----
        self._build_tab_print(tab_print)
        # ---- TỐI ƯU ----
        self._build_tab_opt(tab_opt)
        # ---- NÂNG CAO ----
        self._build_tab_adv(tab_adv)

    def _build_tab_connect(self, f: ttk.Frame) -> None:
        ttk.Label(f, text='Machine ID').grid(row=0, column=0, sticky='w', pady=2)
        self.e_machine = ttk.Entry(f)
        self.e_machine.insert(0, self.cfg.machineId)
        self.e_machine.grid(row=0, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='MQTT Host').grid(row=1, column=0, sticky='w', pady=2)
        self.e_host = ttk.Entry(f)
        self.e_host.insert(0, self.cfg.mqttHost)
        self.e_host.grid(row=1, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='MQTT Port').grid(row=2, column=0, sticky='w', pady=2)
        self.e_port = ttk.Entry(f)
        self.e_port.insert(0, str(self.cfg.mqttPort))
        self.e_port.grid(row=2, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='MQTT Username').grid(row=3, column=0, sticky='w', pady=2)
        self.e_user = ttk.Entry(f)
        self.e_user.insert(0, self.cfg.mqttUsername)
        self.e_user.grid(row=3, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='MQTT Password').grid(row=4, column=0, sticky='w', pady=2)
        self.e_pass = ttk.Entry(f, show='*')
        self.e_pass.insert(0, self.cfg.mqttPassword)
        self.e_pass.grid(row=4, column=1, sticky='ew', pady=2)

    def _build_tab_serial(self, f: ttk.Frame) -> None:
        ttk.Label(f, text='Serial Port').grid(row=0, column=0, sticky='w')
        self.cmb_port = ttk.Combobox(f, values=[])
        self.cmb_port.set(self.cfg.serialPort)
        self.cmb_port.grid(row=0, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='Baud Rate').grid(row=1, column=0, sticky='w')
        self.e_baud = ttk.Entry(f)
        self.e_baud.insert(0, str(self.cfg.baudRate))
        self.e_baud.grid(row=1, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='Regex').grid(row=2, column=0, sticky='w')
        self.e_regex = ttk.Entry(f)
        self.e_regex.insert(0, self.cfg.serialRegex)
        self.e_regex.grid(row=2, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='Decimals').grid(row=3, column=0, sticky='w')
        self.e_decimals = ttk.Entry(f)
        self.e_decimals.insert(0, str(self.cfg.decimals))
        self.e_decimals.grid(row=3, column=1, sticky='ew', pady=2)

    def _build_tab_sim(self, f: ttk.Frame) -> None:
        ttk.Checkbutton(f, text='Simulate Scale', variable=self.var_sim, command=self._update_fake_controls_state).grid(row=0, column=0, columnspan=2, sticky='w')
        ttk.Label(f, text='Fake Mode').grid(row=1, column=0, sticky='w')
        self.cmb_fake_mode = ttk.Combobox(f, values=['sine','random','saw','step','manual'], state='readonly', textvariable=self.var_fake_mode)
        self.cmb_fake_mode.grid(row=1, column=1, sticky='ew', pady=2)
        ttk.Label(f, text='Fake Min').grid(row=2, column=0, sticky='w')
        self.e_fake_min = ttk.Entry(f)
        self.e_fake_min.insert(0, str(getattr(self.cfg, 'fakeMin', 1000.0)))
        self.e_fake_min.grid(row=2, column=1, sticky='ew', pady=2)
        ttk.Label(f, text='Fake Max').grid(row=3, column=0, sticky='w')
        self.e_fake_max = ttk.Entry(f)
        self.e_fake_max.insert(0, str(getattr(self.cfg, 'fakeMax', 30000.0)))
        self.e_fake_max.grid(row=3, column=1, sticky='ew', pady=2)
        ttk.Label(f, text='Fake Hz').grid(row=4, column=0, sticky='w')
        self.e_fake_hz = ttk.Entry(f)
        self.e_fake_hz.insert(0, str(getattr(self.cfg, 'fakeHz', 0.2)))
        self.e_fake_hz.grid(row=4, column=1, sticky='ew', pady=2)
        ttk.Label(f, text='Fake Noise').grid(row=5, column=0, sticky='w')
        self.e_fake_noise = ttk.Entry(f)
        self.e_fake_noise.insert(0, str(getattr(self.cfg, 'fakeNoise', 5.0)))
        self.e_fake_noise.grid(row=5, column=1, sticky='ew', pady=2)
        ttk.Label(f, text='Fake Step').grid(row=6, column=0, sticky='w')
        self.e_fake_step = ttk.Entry(f)
        self.e_fake_step.insert(0, str(getattr(self.cfg, 'fakeStep', 250.0)))
        self.e_fake_step.grid(row=6, column=1, sticky='ew', pady=2)
        ttk.Label(f, text='Manual Weight').grid(row=7, column=0, sticky='w')
        self.e_fake_manual = ttk.Entry(f)
        self.e_fake_manual.insert(0, str(getattr(self.cfg, 'fakeManualWeight', 1234.0)))
        self.e_fake_manual.grid(row=7, column=1, sticky='ew', pady=2)
        ttk.Button(f, text='Set Manual Weight', command=self.on_set_manual).grid(row=8, column=1, sticky='e', pady=2)

    def _build_tab_print(self, f: ttk.Frame) -> None:
        ttk.Label(f, text='Print Secret').grid(row=0, column=0, sticky='w')
        self.e_secret = ttk.Entry(f, show='*')
        self.e_secret.insert(0, self.cfg.printSecret)
        self.e_secret.grid(row=0, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='Printer').grid(row=1, column=0, sticky='w')
        self.cmb_printer = ttk.Combobox(f, values=[], textvariable=self.var_printer)
        self.cmb_printer.grid(row=1, column=1, sticky='ew', pady=2)
        ttk.Button(f, text='Refresh', command=self._refresh_printers).grid(row=1, column=2, padx=(6,0))

        ttk.Label(f, text='SumatraPDF.exe (Windows)').grid(row=2, column=0, sticky='w')
        sumatra_frame = ttk.Frame(f)
        sumatra_frame.grid(row=2, column=1, sticky='ew', pady=2)
        self.e_sumatra = ttk.Entry(sumatra_frame)
        self.e_sumatra.insert(0, self.var_sumatra.get())
        self.e_sumatra.pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(sumatra_frame, text='Browse', command=self.on_browse_sumatra).pack(side=tk.LEFT, padx=4)

        ttk.Button(f, text='Test Print PDF', command=self.on_test_print).grid(row=3, column=1, sticky='e', pady=4)

    def _build_tab_opt(self, f: ttk.Frame) -> None:
        ttk.Label(f, text='Min Delta (kg)').grid(row=0, column=0, sticky='w')
        self.e_min_delta = ttk.Entry(f)
        self.e_min_delta.insert(0, str(getattr(self.cfg, 'filterMinDelta', 5.0)))
        self.e_min_delta.grid(row=0, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='Throttle (ms)').grid(row=1, column=0, sticky='w')
        self.e_throttle = ttk.Entry(f)
        self.e_throttle.insert(0, str(getattr(self.cfg, 'filterThrottleMs', 300)))
        self.e_throttle.grid(row=1, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='Median Window').grid(row=2, column=0, sticky='w')
        self.e_median = ttk.Entry(f)
        self.e_median.insert(0, str(getattr(self.cfg, 'filterMedianWindow', 5)))
        self.e_median.grid(row=2, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='Scale Factor').grid(row=3, column=0, sticky='w')
        self.e_scale_factor = ttk.Entry(f)
        self.e_scale_factor.insert(0, str(getattr(self.cfg, 'scaleFactor', 1.0)))
        self.e_scale_factor.grid(row=3, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='Scale Offset').grid(row=4, column=0, sticky='w')
        self.e_scale_offset = ttk.Entry(f)
        self.e_scale_offset.insert(0, str(getattr(self.cfg, 'scaleOffset', 0.0)))
        self.e_scale_offset.grid(row=4, column=1, sticky='ew', pady=2)

        self.chk_json = ttk.Checkbutton(f, text='Publish reading_json', variable=self.var_reading_json)
        self.chk_json.grid(row=5, column=0, columnspan=2, sticky='w')

        self.chk_retain = ttk.Checkbutton(f, text='Retain last reading', variable=self.var_retain)
        self.chk_retain.grid(row=6, column=0, columnspan=2, sticky='w')

        ttk.Label(f, text='Status Heartbeat (sec)').grid(row=7, column=0, sticky='w')
        self.e_hb_sec = ttk.Entry(f)
        self.e_hb_sec.insert(0, str(getattr(self.cfg, 'statusHeartbeatSec', 30)))
        self.e_hb_sec.grid(row=7, column=1, sticky='ew', pady=2)

        ttk.Separator(f).grid(row=8, column=0, columnspan=2, sticky='ew', pady=6)

        ttk.Label(f, text='Stable Window').grid(row=9, column=0, sticky='w')
        self.e_stab_window = ttk.Entry(f)
        self.e_stab_window.insert(0, str(getattr(self.cfg, 'stableWindow', 5)))
        self.e_stab_window.grid(row=9, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='Delta Max (kg)').grid(row=10, column=0, sticky='w')
        self.e_stab_delta = ttk.Entry(f)
        self.e_stab_delta.insert(0, str(getattr(self.cfg, 'stableDeltaMax', 2.0)))
        self.e_stab_delta.grid(row=10, column=1, sticky='ew', pady=2)

        ttk.Label(f, text='Std Max').grid(row=11, column=0, sticky='w')
        self.e_stab_std = ttk.Entry(f)
        self.e_stab_std.insert(0, str(getattr(self.cfg, 'stableStdMax', 0.5)))
        self.e_stab_std.grid(row=11, column=1, sticky='ew', pady=2)

        self.chk_only_print_stable = ttk.Checkbutton(f, text='Only print when stable', variable=self.var_only_print_stable)
        self.chk_only_print_stable.grid(row=12, column=0, columnspan=2, sticky='w')

    def _build_tab_adv(self, f: ttk.Frame) -> None:
        # Serial Advanced
        lab1 = ttk.LabelFrame(f, text='Serial Advanced')
        lab1.grid(row=0, column=0, columnspan=2, sticky='ew', pady=(0, 6))
        ttk.Label(lab1, text='Data bits').grid(row=0, column=0, sticky='w')
        self.cmb_bytesize = ttk.Combobox(lab1, values=['5','6','7','8'], state='readonly', textvariable=self.var_bytesize)
        self.cmb_bytesize.grid(row=0, column=1, sticky='ew', pady=2)
        ttk.Label(lab1, text='Parity').grid(row=1, column=0, sticky='w')
        self.cmb_parity = ttk.Combobox(lab1, values=['N','E','O','M','S'], state='readonly', textvariable=self.var_parity)
        self.cmb_parity.grid(row=1, column=1, sticky='ew', pady=2)
        ttk.Label(lab1, text='Stop bits').grid(row=2, column=0, sticky='w')
        self.cmb_stopbits = ttk.Combobox(lab1, values=['1','2'], state='readonly', textvariable=self.var_stopbits)
        self.cmb_stopbits.grid(row=2, column=1, sticky='ew', pady=2)
        self.chk_xonxoff = ttk.Checkbutton(lab1, text='XON/XOFF', variable=self.var_xonxoff)
        self.chk_xonxoff.grid(row=3, column=0, sticky='w')
        self.chk_rtscts = ttk.Checkbutton(lab1, text='RTS/CTS', variable=self.var_rtscts)
        self.chk_rtscts.grid(row=3, column=1, sticky='w')
        self.chk_dsrdtr = ttk.Checkbutton(lab1, text='DSR/DTR', variable=self.var_dsrdtr)
        self.chk_dsrdtr.grid(row=4, column=0, sticky='w')
        self.chk_dtr_on_open = ttk.Checkbutton(lab1, text='Set DTR on open', variable=self.var_dtr_on_open)
        self.chk_dtr_on_open.grid(row=4, column=1, sticky='w')
        self.chk_rts_on_open = ttk.Checkbutton(lab1, text='Set RTS on open', variable=self.var_rts_on_open)
        self.chk_rts_on_open.grid(row=5, column=0, sticky='w')
        lab1.columnconfigure(1, weight=1)

        # Poll
        lab2 = ttk.LabelFrame(f, text='Poll Command')
        lab2.grid(row=1, column=0, columnspan=2, sticky='ew', pady=(0, 6))
        ttk.Label(lab2, text='Command (supports \\r \\n)').grid(row=0, column=0, sticky='w')
        self.e_poll_cmd = ttk.Entry(lab2)
        self.e_poll_cmd.insert(0, getattr(self.cfg, 'pollCommand', ''))
        self.e_poll_cmd.grid(row=0, column=1, sticky='ew', pady=2)
        ttk.Label(lab2, text='Interval (ms)').grid(row=1, column=0, sticky='w')
        self.e_poll_int = ttk.Entry(lab2)
        self.e_poll_int.insert(0, str(getattr(self.cfg, 'pollIntervalMs', 0)))
        self.e_poll_int.grid(row=1, column=1, sticky='ew', pady=2)
        lab2.columnconfigure(1, weight=1)

        # MQTT QoS & Retain
        lab3 = ttk.LabelFrame(f, text='MQTT QoS & Retain')
        lab3.grid(row=2, column=0, columnspan=2, sticky='ew', pady=(0, 6))
        ttk.Label(lab3, text='Reading QoS').grid(row=0, column=0, sticky='w')
        self.cmb_reading_qos = ttk.Combobox(lab3, values=['0','1'], state='readonly', textvariable=self.var_reading_qos)
        self.cmb_reading_qos.grid(row=0, column=1, sticky='ew', pady=2)
        ttk.Label(lab3, text='Status QoS').grid(row=1, column=0, sticky='w')
        self.cmb_status_qos = ttk.Combobox(lab3, values=['0','1'], state='readonly', textvariable=self.var_status_qos)
        self.cmb_status_qos.grid(row=1, column=1, sticky='ew', pady=2)
        self.chk_retain_status = ttk.Checkbutton(lab3, text='Retain status', variable=self.var_retain_status)
        self.chk_retain_status.grid(row=2, column=0, columnspan=2, sticky='w')
        lab3.columnconfigure(1, weight=1)

    # ------------- Helpers --------------
    def _set_status_dot(self, color: str) -> None:
        self.canvas_dot.delete('all')
        r = 6
        self.canvas_dot.create_oval(1,1,1+2*r,1+2*r, fill=color, outline=color)

    def _refresh_serial_ports(self) -> None:
        ports = ScaleReader.list_serial_ports()
        self.cmb_port['values'] = ports

    def _refresh_printers(self) -> None:
        try:
            self.printers = list_printers()
        except Exception:
            self.printers = []
        default = get_default_printersafe()
        vals = self.printers.copy()
        if default and default not in vals:
            vals.append(default)
        self.cmb_printer['values'] = vals
        target = self.var_printer.get().strip() or default
        if target:
            self.var_printer.set(target)

    def _update_fake_controls_state(self) -> None:
        sim = bool(self.var_sim.get())
        def set_state(widget, enabled: bool):
            try:
                widget.configure(state=('normal' if enabled else 'disabled'))
            except Exception:
                pass
        # Disable basic serial when simulating
        set_state(self.cmb_port, not sim)
        set_state(self.e_baud, not sim)
        set_state(self.e_regex, not sim)

    def on_browse_sumatra(self) -> None:
        if platform.system().lower() == 'windows':
            path = filedialog.askopenfilename(title='Select SumatraPDF.exe', filetypes=[('Executable','*.exe'), ('All files','*.*')])
            if path:
                self.var_sumatra.set(path)
                self.e_sumatra.delete(0, tk.END)
                self.e_sumatra.insert(0, path)
        else:
            messagebox.showinfo('Info', 'SumatraPDF chỉ áp dụng cho Windows')

    # ------------- Actions --------------
    def on_save(self) -> None:
        try:
            self._read_form_into_cfg()
            self.cfg.save(DEFAULT_CONFIG_PATH)
            messagebox.showinfo('Saved', f'Saved config to {DEFAULT_CONFIG_PATH}')
        except Exception:
            traceback.print_exc()
            messagebox.showerror('Error', 'Failed to save config')

    def on_start(self) -> None:
        if self.running:
            return
        try:
            self._read_form_into_cfg()
            self.agent = WeighAgent(self.cfg)
            self.agent.start()
            self.running = True
            self.status_var.set('Running')
            self._set_status_dot('#25a575')
        except Exception:
            traceback.print_exc()
            messagebox.showerror('Error', 'Failed to start agent')

    def on_stop(self) -> None:
        if not self.running:
            return
        try:
            if self.agent:
                self.agent.stop()
        finally:
            self.running = False
            self.status_var.set('Stopped')
            self._set_status_dot('#999')

    def on_set_manual(self) -> None:
        try:
            if not (self.agent and self.running):
                return
            value = float(self.e_fake_manual.get().strip())
            self.agent.scale.set_manual_weight(value)
        except Exception:
            traceback.print_exc()

    def on_test_print(self) -> None:
        try:
            path = filedialog.askopenfilename(title='Select PDF to print', filetypes=[('PDF files','*.pdf')])
            if not path:
                return
            with open(path, 'rb') as f:
                data = f.read()
            print_pdf_bytes(data, printer=(self.var_printer.get().strip() or None), sumatra_path=(self.var_sumatra.get().strip() or None))
            messagebox.showinfo('Printed', 'Sent to printer')
        except PrintError as e:
            messagebox.showerror('Print Error', str(e))
        except Exception:
            traceback.print_exc()
            messagebox.showerror('Error', 'Unexpected error while printing')

    # ---------- Bind config read/write ----------
    def _read_form_into_cfg(self) -> None:
        # MQTT
        self.cfg.machineId = self.e_machine.get().strip()
        self.cfg.mqttHost = self.e_host.get().strip()
        self.cfg.mqttPort = int(self.e_port.get().strip() or 1883)
        self.cfg.mqttUsername = self.e_user.get().strip()
        self.cfg.mqttPassword = self.e_pass.get().strip()
        # Serial
        self.cfg.serialPort = self.cmb_port.get().strip()
        self.cfg.baudRate = int(self.e_baud.get().strip() or 9600)
        self.cfg.serialRegex = self.e_regex.get().strip()
        self.cfg.decimals = int(self.e_decimals.get().strip() or 0)
        self.cfg.simulateScale = bool(self.var_sim.get())
        # Sim params
        self.cfg.fakeMode = self.var_fake_mode.get()
        try:
            self.cfg.fakeMin = float(self.e_fake_min.get().strip())
            self.cfg.fakeMax = float(self.e_fake_max.get().strip())
            self.cfg.fakeHz = float(self.e_fake_hz.get().strip())
            self.cfg.fakeNoise = float(self.e_fake_noise.get().strip())
            self.cfg.fakeStep = float(self.e_fake_step.get().strip())
            self.cfg.fakeManualWeight = float(self.e_fake_manual.get().strip())
        except Exception:
            pass
        # Printing
        self.cfg.printSecret = self.e_secret.get()
        self.cfg.printerName = self.var_printer.get().strip()
        self.cfg.sumatraPath = self.var_sumatra.get().strip()
        # Optimization
        try:
            self.cfg.filterMinDelta = float(self.e_min_delta.get().strip())
            self.cfg.filterThrottleMs = int(self.e_throttle.get().strip())
            self.cfg.filterMedianWindow = int(self.e_median.get().strip())
            self.cfg.scaleFactor = float(self.e_scale_factor.get().strip())
            self.cfg.scaleOffset = float(self.e_scale_offset.get().strip())
            self.cfg.statusHeartbeatSec = int(self.e_hb_sec.get().strip())
        except Exception:
            pass
        self.cfg.readingJsonEnabled = bool(self.var_reading_json.get())
        self.cfg.retainLastReading = bool(self.var_retain.get())
        # Stability
        try:
            self.cfg.stableWindow = int(self.e_stab_window.get().strip())
            self.cfg.stableDeltaMax = float(self.e_stab_delta.get().strip())
            self.cfg.stableStdMax = float(self.e_stab_std.get().strip())
        except Exception:
            pass
        self.cfg.onlyPrintWhenStable = bool(self.var_only_print_stable.get())
        # Serial Advanced
        try:
            self.cfg.bytesize = int(self.var_bytesize.get())
            self.cfg.parity = self.var_parity.get().strip() or 'N'
            self.cfg.stopbits = int(self.var_stopbits.get())
        except Exception:
            pass
        self.cfg.xonxoff = bool(self.var_xonxoff.get())
        self.cfg.rtscts = bool(self.var_rtscts.get())
        self.cfg.dsrdtr = bool(self.var_dsrdtr.get())
        self.cfg.dtrOnOpen = bool(self.var_dtr_on_open.get())
        self.cfg.rtsOnOpen = bool(self.var_rts_on_open.get())
        # Poll
        self.cfg.pollCommand = self.e_poll_cmd.get()
        try:
            self.cfg.pollIntervalMs = int(self.e_poll_int.get().strip() or 0)
        except Exception:
            pass
        # MQTT QoS
        try:
            self.cfg.readingQos = int(self.var_reading_qos.get())
            self.cfg.statusQos = int(self.var_status_qos.get())
        except Exception:
            pass
        self.cfg.retainStatus = bool(self.var_retain_status.get())

    # Live update UI
    def _update_loop(self) -> None:
        if self.agent and self.running:
            w = self.agent.latest_weight
            if w is not None:
                # Render big weight with thousand-sep-like spacing to improve readability
                try:
                    text = f"{w:,.0f}" if float(w).is_integer() else f"{w:,.2f}"
                    text = text.replace(',', ' ')
                except Exception:
                    text = str(w)
                self.latest_weight_var.set(text)
        self.root.after(250, self._update_loop)


def get_default_printersafe():
    try:
        return get_default_printer()
    except Exception:
        return ""


def main() -> int:
    root = tk.Tk()
    app = AgentGUI(root)
    root.mainloop()
    return 0


if __name__ == '__main__':
    sys.exit(main())
