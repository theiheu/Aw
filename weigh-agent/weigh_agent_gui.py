import threading
import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import traceback
import sys
from pathlib import Path

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
        self.cfg = AgentConfig.load(DEFAULT_CONFIG_PATH)
        setup_logging(self.cfg.logLevel)

        self.agent: WeighAgent | None = None
        self.running = False
        self.latest_weight_var = tk.StringVar(value="--")
        self.status_var = tk.StringVar(value="Idle")

        # Sim/Fake variables
        self.var_sim = tk.BooleanVar(value=self.cfg.simulateScale)
        self.var_fake_mode = tk.StringVar(value=getattr(self.cfg, "fakeMode", "sine"))

        # Printer variables
        self.printers: list[str] = []
        self.var_printer = tk.StringVar(value=getattr(self.cfg, "printerName", ""))

        self._build_ui()
        self._refresh_serial_ports()
        self._refresh_printers()
        self._update_fake_controls_state()
        self._update_loop()

    def _build_ui(self) -> None:
        frm = ttk.Frame(self.root, padding=10)
        frm.grid(row=0, column=0, sticky="nsew")
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

        # MQTT
        ttk.Label(frm, text="Machine ID").grid(row=0, column=0, sticky="w")
        self.e_machine = ttk.Entry(frm)
        self.e_machine.insert(0, self.cfg.machineId)
        self.e_machine.grid(row=0, column=1, sticky="ew")

        ttk.Label(frm, text="MQTT Host").grid(row=1, column=0, sticky="w")
        self.e_host = ttk.Entry(frm)
        self.e_host.insert(0, self.cfg.mqttHost)
        self.e_host.grid(row=1, column=1, sticky="ew")

        ttk.Label(frm, text="MQTT Port").grid(row=2, column=0, sticky="w")
        self.e_port = ttk.Entry(frm)
        self.e_port.insert(0, str(self.cfg.mqttPort))
        self.e_port.grid(row=2, column=1, sticky="ew")

        ttk.Label(frm, text="MQTT Username").grid(row=3, column=0, sticky="w")
        self.e_user = ttk.Entry(frm)
        self.e_user.insert(0, self.cfg.mqttUsername)
        self.e_user.grid(row=3, column=1, sticky="ew")

        ttk.Label(frm, text="MQTT Password").grid(row=4, column=0, sticky="w")
        self.e_pass = ttk.Entry(frm, show="*")
        self.e_pass.insert(0, self.cfg.mqttPassword)
        self.e_pass.grid(row=4, column=1, sticky="ew")

        ttk.Separator(frm).grid(row=5, column=0, columnspan=2, sticky="ew", pady=6)

        # Serial
        ttk.Label(frm, text="Serial Port").grid(row=6, column=0, sticky="w")
        self.cmb_port = ttk.Combobox(frm, values=[])
        self.cmb_port.set(self.cfg.serialPort)
        self.cmb_port.grid(row=6, column=1, sticky="ew")

        ttk.Label(frm, text="Baud Rate").grid(row=7, column=0, sticky="w")
        self.e_baud = ttk.Entry(frm)
        self.e_baud.insert(0, str(self.cfg.baudRate))
        self.e_baud.grid(row=7, column=1, sticky="ew")

        ttk.Label(frm, text="Regex").grid(row=8, column=0, sticky="w")
        self.e_regex = ttk.Entry(frm)
        self.e_regex.insert(0, self.cfg.serialRegex)
        self.e_regex.grid(row=8, column=1, sticky="ew")

        ttk.Label(frm, text="Decimals").grid(row=9, column=0, sticky="w")
        self.e_decimals = ttk.Entry(frm)
        self.e_decimals.insert(0, str(self.cfg.decimals))
        self.e_decimals.grid(row=9, column=1, sticky="ew")

        # Simulate/Fake block
        ttk.Checkbutton(frm, text="Simulate Scale", variable=self.var_sim, command=self._update_fake_controls_state).grid(row=10, column=0, columnspan=2, sticky="w")

        ttk.Label(frm, text="Fake Mode").grid(row=11, column=0, sticky="w")
        self.cmb_fake_mode = ttk.Combobox(frm, values=["sine", "random", "saw", "step", "manual"], state="readonly", textvariable=self.var_fake_mode)
        self.cmb_fake_mode.grid(row=11, column=1, sticky="ew")
        self.cmb_fake_mode.bind("<<ComboboxSelected>>", lambda e: self._update_fake_controls_state())

        ttk.Label(frm, text="Fake Min").grid(row=12, column=0, sticky="w")
        self.e_fake_min = ttk.Entry(frm)
        self.e_fake_min.insert(0, str(getattr(self.cfg, "fakeMin", 1000.0)))
        self.e_fake_min.grid(row=12, column=1, sticky="ew")

        ttk.Label(frm, text="Fake Max").grid(row=13, column=0, sticky="w")
        self.e_fake_max = ttk.Entry(frm)
        self.e_fake_max.insert(0, str(getattr(self.cfg, "fakeMax", 30000.0)))
        self.e_fake_max.grid(row=13, column=1, sticky="ew")

        ttk.Label(frm, text="Fake Hz").grid(row=14, column=0, sticky="w")
        self.e_fake_hz = ttk.Entry(frm)
        self.e_fake_hz.insert(0, str(getattr(self.cfg, "fakeHz", 0.2)))
        self.e_fake_hz.grid(row=14, column=1, sticky="ew")

        ttk.Label(frm, text="Fake Noise").grid(row=15, column=0, sticky="w")
        self.e_fake_noise = ttk.Entry(frm)
        self.e_fake_noise.insert(0, str(getattr(self.cfg, "fakeNoise", 5.0)))
        self.e_fake_noise.grid(row=15, column=1, sticky="ew")

        ttk.Label(frm, text="Fake Step").grid(row=16, column=0, sticky="w")
        self.e_fake_step = ttk.Entry(frm)
        self.e_fake_step.insert(0, str(getattr(self.cfg, "fakeStep", 250.0)))
        self.e_fake_step.grid(row=16, column=1, sticky="ew")

        ttk.Label(frm, text="Manual Weight").grid(row=17, column=0, sticky="w")
        self.e_fake_manual = ttk.Entry(frm)
        self.e_fake_manual.insert(0, str(getattr(self.cfg, "fakeManualWeight", 1234.0)))
        self.e_fake_manual.grid(row=17, column=1, sticky="ew")

        self.btn_set_manual = ttk.Button(frm, text="Set Manual Weight", command=self.on_set_manual)
        self.btn_set_manual.grid(row=18, column=0, columnspan=2, sticky="e", pady=(4, 0))

        ttk.Separator(frm).grid(row=19, column=0, columnspan=2, sticky="ew", pady=6)

        # Printing
        ttk.Label(frm, text="Print Secret").grid(row=20, column=0, sticky="w")
        self.e_secret = ttk.Entry(frm, show="*")
        self.e_secret.insert(0, self.cfg.printSecret)
        self.e_secret.grid(row=20, column=1, sticky="ew")

        ttk.Label(frm, text="Printer").grid(row=21, column=0, sticky="w")
        self.cmb_printer = ttk.Combobox(frm, values=[], textvariable=self.var_printer)
        self.cmb_printer.grid(row=21, column=1, sticky="ew")

        self.btn_refresh_printers = ttk.Button(frm, text="Refresh Printers", command=self._refresh_printers)
        self.btn_refresh_printers.grid(row=22, column=0, columnspan=2, sticky="e")

        # Actions
        btn_frame = ttk.Frame(frm)
        btn_frame.grid(row=23, column=0, columnspan=2, pady=8, sticky="ew")
        ttk.Button(btn_frame, text="Save Config", command=self.on_save).pack(side=tk.LEFT)
        ttk.Button(btn_frame, text="Start", command=self.on_start).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="Stop", command=self.on_stop).pack(side=tk.LEFT)
        ttk.Button(btn_frame, text="Test Print PDF", command=self.on_test_print).pack(side=tk.RIGHT)

        # Status
        stat = ttk.Frame(frm)
        stat.grid(row=24, column=0, columnspan=2, sticky="ew")
        ttk.Label(stat, text="Weight:").pack(side=tk.LEFT)
        ttk.Label(stat, textvariable=self.latest_weight_var, width=12).pack(side=tk.LEFT)
        ttk.Label(stat, text="Status:").pack(side=tk.LEFT, padx=(10, 0))
        ttk.Label(stat, textvariable=self.status_var).pack(side=tk.LEFT)

        for i in range(0, 2):
            frm.columnconfigure(i, weight=1)

    def _refresh_serial_ports(self) -> None:
        ports = ScaleReader.list_serial_ports()
        self.cmb_port["values"] = ports

    def _refresh_printers(self) -> None:
        try:
            self.printers = list_printers()
        except Exception:
            self.printers = []
        # If empty, still try default
        default = get_default_printer() or ""
        vals = self.printers.copy()
        if default and default not in vals:
            vals.append(default)
        self.cmb_printer["values"] = vals
        # Select config printer or default
        target = self.var_printer.get().strip() or default
        if target:
            self.var_printer.set(target)

    def _update_fake_controls_state(self) -> None:
        sim = bool(self.var_sim.get())
        mode = self.var_fake_mode.get()
        def set_state(widget, enabled: bool):
            try:
                widget.configure(state=("normal" if enabled else "disabled"))
            except Exception:
                pass
        # Enable fake controls only if simulate is on
        for w in [self.cmb_fake_mode, self.e_fake_min, self.e_fake_max, self.e_fake_hz, self.e_fake_noise, self.e_fake_step, self.e_fake_manual, self.btn_set_manual]:
            set_state(w, sim)
        # Manual weight editor only if manual mode
        only_manual = (sim and mode == "manual")
        set_state(self.e_fake_manual, only_manual)
        set_state(self.btn_set_manual, only_manual)
        # Optionally disable serial port controls when simulating
        set_state(self.cmb_port, not sim)
        set_state(self.e_baud, not sim)
        set_state(self.e_regex, not sim)

    def on_save(self) -> None:
        try:
            self._read_form_into_cfg()
            self.cfg.save(DEFAULT_CONFIG_PATH)
            messagebox.showinfo("Saved", f"Saved config to {DEFAULT_CONFIG_PATH}")
        except Exception:
            traceback.print_exc()
            messagebox.showerror("Error", "Failed to save config")

    def on_start(self) -> None:
        if self.running:
            return
        try:
            self._read_form_into_cfg()
            self.agent = WeighAgent(self.cfg)
            self.agent.start()
            # If manual mode, push initial manual value
            if self.cfg.simulateScale and self.cfg.fakeMode == "manual":
                try:
                    self.agent.scale.set_manual_weight(float(self.e_fake_manual.get().strip()))
                except Exception:
                    pass
            self.running = True
            self.status_var.set("Running")
        except Exception:
            traceback.print_exc()
            messagebox.showerror("Error", "Failed to start agent")

    def on_stop(self) -> None:
        if not self.running:
            return
        try:
            if self.agent:
                self.agent.stop()
        finally:
            self.running = False
            self.status_var.set("Stopped")

    def on_set_manual(self) -> None:
        try:
            if not (self.agent and self.running):
                return
            if not (self.cfg.simulateScale and self.cfg.fakeMode == "manual"):
                return
            value = float(self.e_fake_manual.get().strip())
            self.agent.scale.set_manual_weight(value)
        except Exception:
            traceback.print_exc()

    def on_test_print(self) -> None:
        try:
            path = filedialog.askopenfilename(title="Select PDF to print", filetypes=[("PDF files", "*.pdf")])
            if not path:
                return
            with open(path, "rb") as f:
                data = f.read()
            print_pdf_bytes(data, printer=(self.var_printer.get().strip() or None))
            messagebox.showinfo("Printed", "Sent to printer")
        except PrintError as e:
            messagebox.showerror("Print Error", str(e))
        except Exception:
            traceback.print_exc()
            messagebox.showerror("Error", "Unexpected error while printing")

    def _read_form_into_cfg(self) -> None:
        self.cfg.machineId = self.e_machine.get().strip()
        self.cfg.mqttHost = self.e_host.get().strip()
        self.cfg.mqttPort = int(self.e_port.get().strip() or 1883)
        self.cfg.mqttUsername = self.e_user.get().strip()
        self.cfg.mqttPassword = self.e_pass.get().strip()
        self.cfg.serialPort = self.cmb_port.get().strip()
        self.cfg.baudRate = int(self.e_baud.get().strip() or 9600)
        self.cfg.serialRegex = self.e_regex.get().strip()
        self.cfg.decimals = int(self.e_decimals.get().strip() or 0)
        self.cfg.simulateScale = bool(self.var_sim.get())
        # Fake params
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
        self.cfg.printSecret = self.e_secret.get()
        self.cfg.printerName = self.var_printer.get().strip()

    def _update_loop(self) -> None:
        if self.agent and self.running:
            w = self.agent.latest_weight
            if w is not None:
                self.latest_weight_var.set(f"{w}")
        self.root.after(300, self._update_loop)


def main() -> int:
    root = tk.Tk()
    app = AgentGUI(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    sys.exit(main())
