#!/usr/bin/env python3
import os
import sys
import subprocess
import threading

TARGET = ["node", "/home/regulus/Programs/easycopy/mcp-server/bin/easycopy-mcp.js"]
LOG_DIR = "/tmp/easycopy-mcp-proxy"
os.makedirs(LOG_DIR, exist_ok=True)

stdin_log = open(os.path.join(LOG_DIR, "stdin.bin"), "ab", buffering=0)
stdout_log = open(os.path.join(LOG_DIR, "stdout.bin"), "ab", buffering=0)
stderr_log = open(os.path.join(LOG_DIR, "stderr.bin"), "ab", buffering=0)

p = subprocess.Popen(
    TARGET, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE
)


def pump_stdin():
    while True:
        chunk = sys.stdin.buffer.read(4096)
        if not chunk:
            try:
                p.stdin.close()
            except Exception:
                pass
            return
        stdin_log.write(chunk)
        p.stdin.write(chunk)
        p.stdin.flush()


def pump_stdout():
    while True:
        chunk = p.stdout.read(4096)
        if not chunk:
            return
        stdout_log.write(chunk)
        sys.stdout.buffer.write(chunk)
        sys.stdout.buffer.flush()


def pump_stderr():
    while True:
        chunk = p.stderr.read(4096)
        if not chunk:
            return
        stderr_log.write(chunk)
        sys.stderr.buffer.write(chunk)
        sys.stderr.buffer.flush()


t_in = threading.Thread(target=pump_stdin, daemon=True)
t_out = threading.Thread(target=pump_stdout, daemon=True)
t_err = threading.Thread(target=pump_stderr, daemon=True)

t_in.start()
t_out.start()
t_err.start()

code = p.wait()
stdin_log.close()
stdout_log.close()
stderr_log.close()
sys.exit(code)
