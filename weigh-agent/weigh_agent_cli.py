import argparse
import sys
import threading
import time
import signal

from agent.config import AgentConfig, DEFAULT_CONFIG_PATH
from agent.logger import setup_logging
from agent.app import WeighAgent


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Weigh Agent CLI (no GUI)")
    p.add_argument("--config", type=str, default=str(DEFAULT_CONFIG_PATH), help="Path to config.json")
    p.add_argument("--log", type=str, default=None, help="Log level (DEBUG, INFO, WARNING)")
    # Overrides for quick simulate testing
    p.add_argument("--simulate", action="store_true", help="Force simulate scale mode")
    p.add_argument("--fake-mode", type=str, choices=["sine", "random", "saw", "step", "manual"], help="Fake mode")
    p.add_argument("--fake-min", type=float, help="Fake min weight")
    p.add_argument("--fake-max", type=float, help="Fake max weight")
    p.add_argument("--fake-hz", type=float, help="Fake signal frequency (Hz)")
    p.add_argument("--fake-noise", type=float, help="Fake noise amplitude")
    p.add_argument("--fake-step", type=float, help="Fake step size for step mode")
    p.add_argument("--manual", type=float, help="Initial manual weight when --fake-mode=manual")
    return p.parse_args(argv)


def apply_overrides(cfg: AgentConfig, args: argparse.Namespace) -> None:
    if args.simulate:
        cfg.simulateScale = True
    if args.fake_mode:
        cfg.fakeMode = args.fake_mode
    if args.fake_min is not None:
        cfg.fakeMin = args.fake_min
    if args.fake_max is not None:
        cfg.fakeMax = args.fake_max
    if args.fake_hz is not None:
        cfg.fakeHz = args.fake_hz
    if args.fake_noise is not None:
        cfg.fakeNoise = args.fake_noise
    if args.fake_step is not None:
        cfg.fakeStep = args.fake_step
    if args.manual is not None:
        cfg.fakeManualWeight = args.manual


def input_thread(agent: WeighAgent, stop_evt: threading.Event) -> None:
    help_txt = (
        "Commands: set <value> | + <delta> | - <delta> | mode <sine|random|saw|step|manual> | quit\n"
    )
    print(help_txt, flush=True)
    while not stop_evt.is_set():
        try:
            line = input("> ").strip()
        except EOFError:
            break
        except KeyboardInterrupt:
            break
        if not line:
            continue
        parts = line.split()
        cmd = parts[0].lower()
        try:
            if cmd == "quit" or cmd == "exit":
                stop_evt.set()
                break
            elif cmd == "set" and len(parts) == 2:
                v = float(parts[1])
                agent.scale.set_manual_weight(v)
            elif cmd == "+" and len(parts) == 2:
                v = float(parts[1])
                agent.scale.set_manual_weight((agent.latest_weight or 0.0) + v)
            elif cmd == "-" and len(parts) == 2:
                v = float(parts[1])
                agent.scale.set_manual_weight((agent.latest_weight or 0.0) - v)
            elif cmd == "mode" and len(parts) == 2:
                mode = parts[1].lower()
                if mode in {"sine","random","saw","step","manual"}:
                    agent.scale.fake_mode = mode
                    print(f"Switched fake mode to {mode}")
                else:
                    print("Invalid mode")
            else:
                print("Unknown command")
        except Exception as e:
            print(f"Error: {e}")


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    from pathlib import Path
    cfg_path = Path(args.config) if args.config else DEFAULT_CONFIG_PATH
    cfg = AgentConfig.load(cfg_path)
    setup_logging(args.log or cfg.logLevel)
    apply_overrides(cfg, args)

    agent = WeighAgent(cfg)
    stop_evt = threading.Event()

    def handle_sig(signum, frame):  # type: ignore
        stop_evt.set()

    signal.signal(signal.SIGINT, handle_sig)
    signal.signal(signal.SIGTERM, handle_sig)

    agent.start()
    # If manual specified and manual mode, set it
    try:
        if cfg.simulateScale and cfg.fakeMode == "manual":
            agent.scale.set_manual_weight(cfg.fakeManualWeight)
    except Exception:
        pass

    # Interactive commands (only useful in simulate mode)
    th = threading.Thread(target=input_thread, args=(agent, stop_evt), daemon=True)
    th.start()

    try:
        while not stop_evt.is_set():
            time.sleep(0.2)
    finally:
        agent.stop()
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

