"""Windows desktop observation for the executor: window list and screenshots, never input.

Ported from the pinned Windows package (server/windows_computer.py of Windows-Codex-Local-2026-09-10):
the Win32 declarations, window enumeration, GDI capture and the PNG encoder are the same code;
mouse, keyboard and window activation were not carried over.
"""
from __future__ import annotations

import binascii
import ctypes
import os
import struct
import zlib
from ctypes import wintypes
from pathlib import PureWindowsPath
from typing import Any


IS_WINDOWS = os.name == "nt"


class POINT(ctypes.Structure):
    _fields_ = [("x", wintypes.LONG), ("y", wintypes.LONG)]


class RECT(ctypes.Structure):
    _fields_ = [
        ("left", wintypes.LONG),
        ("top", wintypes.LONG),
        ("right", wintypes.LONG),
        ("bottom", wintypes.LONG),
    ]


class RGBQUAD(ctypes.Structure):
    _fields_ = [
        ("rgbBlue", wintypes.BYTE),
        ("rgbGreen", wintypes.BYTE),
        ("rgbRed", wintypes.BYTE),
        ("rgbReserved", wintypes.BYTE),
    ]


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ("biSize", wintypes.DWORD),
        ("biWidth", wintypes.LONG),
        ("biHeight", wintypes.LONG),
        ("biPlanes", wintypes.WORD),
        ("biBitCount", wintypes.WORD),
        ("biCompression", wintypes.DWORD),
        ("biSizeImage", wintypes.DWORD),
        ("biXPelsPerMeter", wintypes.LONG),
        ("biYPelsPerMeter", wintypes.LONG),
        ("biClrUsed", wintypes.DWORD),
        ("biClrImportant", wintypes.DWORD),
    ]


class BITMAPINFO(ctypes.Structure):
    _fields_ = [
        ("bmiHeader", BITMAPINFOHEADER),
        ("bmiColors", RGBQUAD * 1),
    ]


class CURSORINFO(ctypes.Structure):
    _fields_ = [
        ("cbSize", wintypes.DWORD),
        ("flags", wintypes.DWORD),
        ("hCursor", wintypes.HANDLE),
        ("ptScreenPos", POINT),
    ]


CURSOR_SHOWING = 0x00000001
DI_NORMAL = 0x0003
SRCCOPY = 0x00CC0020
CAPTUREBLT = 0x40000000
HALFTONE = 4
BI_RGB = 0
PW_RENDERFULLCONTENT = 0x00000002


def _png_chunk(chunk_type: bytes, data: bytes) -> bytes:
    payload = chunk_type + data
    return (
        struct.pack(">I", len(data))
        + payload
        + struct.pack(">I", binascii.crc32(payload) & 0xFFFFFFFF)
    )


def encode_bgra_png(raw: bytes, width: int, height: int) -> bytes:
    expected = width * height * 4
    if len(raw) != expected:
        raise ValueError(f"Invalid BGRA buffer size: expected {expected}, got {len(raw)}")
    rgba = bytearray(raw)
    blue = raw[0::4]
    rgba[0::4] = raw[2::4]
    rgba[2::4] = blue
    rgba[3::4] = b"\xff" * (width * height)
    row_bytes = width * 4
    filtered = bytearray((row_bytes + 1) * height)
    for row in range(height):
        target = row * (row_bytes + 1)
        source = row * row_bytes
        filtered[target] = 0
        filtered[target + 1 : target + 1 + row_bytes] = rgba[source : source + row_bytes]
    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", header)
        + _png_chunk(b"IDAT", zlib.compress(filtered, level=6))
        + _png_chunk(b"IEND", b"")
    )


def output_size(width: int, height: int, max_dimension: int) -> tuple[int, int, float]:
    """The executor contract of both systems: 0 keeps the size, otherwise the longest side is at most 100-5000."""
    if max_dimension <= 0:
        return width, height, 1.0
    bounded = max(100, min(int(max_dimension), 5000))
    scale = min(1.0, bounded / max(width, height))
    return max(1, int(round(width * scale))), max(1, int(round(height * scale))), scale


class WindowsDesktop:
    def __init__(self) -> None:
        if not IS_WINDOWS:
            raise RuntimeError("Windows desktop observation is available only on Windows")
        self.user32 = ctypes.windll.user32
        self.gdi32 = ctypes.windll.gdi32
        self.kernel32 = ctypes.windll.kernel32
        self._configure_api()
        try:
            self.user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))
        except (AttributeError, OSError):
            pass

    def _configure_api(self) -> None:
        self.user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
        self.user32.GetWindowTextLengthW.restype = ctypes.c_int
        self.user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
        self.user32.GetWindowTextW.restype = ctypes.c_int
        self.user32.GetWindowRect.argtypes = [wintypes.HWND, ctypes.POINTER(RECT)]
        self.user32.GetWindowRect.restype = wintypes.BOOL
        self.user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
        self.user32.GetWindowThreadProcessId.restype = wintypes.DWORD
        self.user32.IsWindow.argtypes = [wintypes.HWND]
        self.user32.IsWindow.restype = wintypes.BOOL
        self.user32.IsWindowVisible.argtypes = [wintypes.HWND]
        self.user32.IsWindowVisible.restype = wintypes.BOOL
        self.user32.IsIconic.argtypes = [wintypes.HWND]
        self.user32.IsIconic.restype = wintypes.BOOL
        self.user32.GetCursorInfo.argtypes = [ctypes.POINTER(CURSORINFO)]
        self.user32.GetCursorInfo.restype = wintypes.BOOL
        self.user32.DrawIconEx.argtypes = [
            wintypes.HDC, ctypes.c_int, ctypes.c_int, wintypes.HANDLE, ctypes.c_int, ctypes.c_int,
            wintypes.UINT, wintypes.HBRUSH, wintypes.UINT,
        ]
        self.user32.DrawIconEx.restype = wintypes.BOOL
        self.user32.PrintWindow.argtypes = [wintypes.HWND, wintypes.HDC, wintypes.UINT]
        self.user32.PrintWindow.restype = wintypes.BOOL
        self.user32.GetDC.argtypes = [wintypes.HWND]
        self.user32.GetDC.restype = wintypes.HDC
        self.user32.ReleaseDC.argtypes = [wintypes.HWND, wintypes.HDC]
        self.user32.ReleaseDC.restype = ctypes.c_int
        self.gdi32.CreateCompatibleDC.argtypes = [wintypes.HDC]
        self.gdi32.CreateCompatibleDC.restype = wintypes.HDC
        self.gdi32.CreateCompatibleBitmap.argtypes = [wintypes.HDC, ctypes.c_int, ctypes.c_int]
        self.gdi32.CreateCompatibleBitmap.restype = wintypes.HBITMAP
        self.gdi32.SelectObject.argtypes = [wintypes.HDC, wintypes.HGDIOBJ]
        self.gdi32.SelectObject.restype = wintypes.HGDIOBJ
        self.gdi32.DeleteObject.argtypes = [wintypes.HGDIOBJ]
        self.gdi32.DeleteObject.restype = wintypes.BOOL
        self.gdi32.DeleteDC.argtypes = [wintypes.HDC]
        self.gdi32.DeleteDC.restype = wintypes.BOOL
        self.gdi32.SetStretchBltMode.argtypes = [wintypes.HDC, ctypes.c_int]
        self.gdi32.SetStretchBltMode.restype = ctypes.c_int
        self.gdi32.StretchBlt.argtypes = [
            wintypes.HDC, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
            wintypes.HDC, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, wintypes.DWORD,
        ]
        self.gdi32.StretchBlt.restype = wintypes.BOOL
        self.gdi32.GetDIBits.argtypes = [
            wintypes.HDC, wintypes.HBITMAP, wintypes.UINT, wintypes.UINT, wintypes.LPVOID,
            ctypes.POINTER(BITMAPINFO), wintypes.UINT,
        ]
        self.gdi32.GetDIBits.restype = ctypes.c_int
        self.kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        self.kernel32.OpenProcess.restype = wintypes.HANDLE
        self.kernel32.QueryFullProcessImageNameW.argtypes = [
            wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD),
        ]
        self.kernel32.QueryFullProcessImageNameW.restype = wintypes.BOOL
        self.kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
        self.kernel32.CloseHandle.restype = wintypes.BOOL

    @staticmethod
    def _handle(value: int) -> wintypes.HWND:
        return wintypes.HWND(int(value))

    @staticmethod
    def _handle_value(value: int | wintypes.HWND) -> int:
        if isinstance(value, int):
            return value
        return int(value.value or 0)

    def _window_title(self, hwnd: wintypes.HWND) -> str:
        length = self.user32.GetWindowTextLengthW(hwnd)
        if length <= 0:
            return ""
        buffer = ctypes.create_unicode_buffer(length + 1)
        self.user32.GetWindowTextW(hwnd, buffer, len(buffer))
        return buffer.value

    def _window_rect(self, hwnd: wintypes.HWND) -> dict[str, int]:
        rect = RECT()
        if not self.user32.GetWindowRect(hwnd, ctypes.byref(rect)):
            raise OSError(ctypes.get_last_error(), "GetWindowRect failed")
        return {
            "x": int(rect.left),
            "y": int(rect.top),
            "width": max(0, int(rect.right - rect.left)),
            "height": max(0, int(rect.bottom - rect.top)),
        }

    def _process_id(self, hwnd: wintypes.HWND) -> int:
        process_id = wintypes.DWORD()
        self.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(process_id))
        return int(process_id.value)

    def _process_path(self, process_id: int) -> str:
        process = self.kernel32.OpenProcess(0x1000, False, process_id)
        if not process:
            return ""
        try:
            size = wintypes.DWORD(32768)
            buffer = ctypes.create_unicode_buffer(size.value)
            if self.kernel32.QueryFullProcessImageNameW(process, 0, buffer, ctypes.byref(size)):
                return buffer.value
            return ""
        finally:
            self.kernel32.CloseHandle(process)

    def screen_geometry(self) -> dict[str, int]:
        return {
            "x": int(self.user32.GetSystemMetrics(76)),
            "y": int(self.user32.GetSystemMetrics(77)),
            "width": int(self.user32.GetSystemMetrics(78)),
            "height": int(self.user32.GetSystemMetrics(79)),
        }

    def list_windows(self) -> list[dict[str, Any]]:
        """Visible titled top-level windows in the fields the executor returns on both systems."""
        handles: list[int] = []
        callback_type = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

        def collect(hwnd: wintypes.HWND, _lparam: wintypes.LPARAM) -> bool:
            if self.user32.IsWindowVisible(hwnd) and self._window_title(hwnd).strip():
                handles.append(self._handle_value(hwnd))
            return True

        callback = callback_type(collect)
        if not self.user32.EnumWindows(callback, 0):
            raise OSError(ctypes.get_last_error(), "EnumWindows failed")
        windows: list[dict[str, Any]] = []
        for handle in handles:
            hwnd = self._handle(handle)
            process_id = self._process_id(hwnd)
            windows.append({
                "window_id": handle,
                "title": self._window_title(hwnd),
                "application": PureWindowsPath(self._process_path(process_id)).stem,
                "pid": process_id,
                "rect": self._window_rect(hwnd),
            })
        return windows

    def capture_screen(self, x: int | None, y: int | None, width: int | None, height: int | None,
                       max_dimension: int, include_cursor: bool) -> bytes:
        geometry = self.screen_geometry()
        return self._capture_region(
            geometry["x"] if x is None else int(x),
            geometry["y"] if y is None else int(y),
            geometry["width"] if width is None else int(width),
            geometry["height"] if height is None else int(height),
            max_dimension,
            include_cursor,
        )

    def capture_window(self, window_id: int, max_dimension: int) -> bytes:
        hwnd = self._handle(window_id)
        if not self.user32.IsWindow(hwnd):
            raise ValueError("window_id is not a valid window")
        if self.user32.IsIconic(hwnd):
            raise ValueError("Window is minimized; restore it before capture")
        rect = self._window_rect(hwnd)
        if rect["width"] <= 0 or rect["height"] <= 0:
            raise ValueError("Window has no visible area")
        # PrintWindow draws the window itself, so another window on top does not get into the picture.
        # A window that refuses it is captured from the screen rectangle, as the pinned package did.
        png = self._print_window(hwnd, rect["width"], rect["height"], max_dimension)
        if png is None:
            png = self._capture_region(rect["x"], rect["y"], rect["width"], rect["height"], max_dimension, False)
        return png

    def _bitmap_png(self, dc: Any, bitmap: Any, width: int, height: int) -> bytes:
        bitmap_info = BITMAPINFO()
        bitmap_info.bmiHeader.biSize = ctypes.sizeof(BITMAPINFOHEADER)
        bitmap_info.bmiHeader.biWidth = width
        bitmap_info.bmiHeader.biHeight = -height
        bitmap_info.bmiHeader.biPlanes = 1
        bitmap_info.bmiHeader.biBitCount = 32
        bitmap_info.bmiHeader.biCompression = BI_RGB
        buffer = ctypes.create_string_buffer(width * height * 4)
        rows = self.gdi32.GetDIBits(dc, bitmap, 0, height, buffer, ctypes.byref(bitmap_info), 0)
        if rows != height:
            raise OSError(ctypes.get_last_error(), "GetDIBits failed")
        return encode_bgra_png(buffer.raw, width, height)

    def _print_window(self, hwnd: wintypes.HWND, width: int, height: int, max_dimension: int) -> bytes | None:
        if width > 32768 or height > 32768:
            raise ValueError("Capture region is too large")
        out_width, out_height, _scale = output_size(width, height, max_dimension)
        screen_dc = self.user32.GetDC(None)
        if not screen_dc:
            return None
        window_dc = self.gdi32.CreateCompatibleDC(screen_dc)
        window_bitmap = self.gdi32.CreateCompatibleBitmap(screen_dc, width, height)
        scaled_dc = self.gdi32.CreateCompatibleDC(screen_dc)
        scaled_bitmap = self.gdi32.CreateCompatibleBitmap(screen_dc, out_width, out_height)
        previous_window = previous_scaled = None
        try:
            if not (window_dc and window_bitmap and scaled_dc and scaled_bitmap):
                return None
            previous_window = self.gdi32.SelectObject(window_dc, window_bitmap)
            if not self.user32.PrintWindow(hwnd, window_dc, PW_RENDERFULLCONTENT):
                return None
            previous_scaled = self.gdi32.SelectObject(scaled_dc, scaled_bitmap)
            self.gdi32.SetStretchBltMode(scaled_dc, HALFTONE)
            if not self.gdi32.StretchBlt(scaled_dc, 0, 0, out_width, out_height, window_dc, 0, 0, width, height, SRCCOPY):
                return None
            self.gdi32.SelectObject(scaled_dc, previous_scaled)
            previous_scaled = None
            return self._bitmap_png(scaled_dc, scaled_bitmap, out_width, out_height)
        except OSError:
            return None
        finally:
            if previous_scaled:
                self.gdi32.SelectObject(scaled_dc, previous_scaled)
            if previous_window:
                self.gdi32.SelectObject(window_dc, previous_window)
            for item in (scaled_bitmap, window_bitmap):
                if item:
                    self.gdi32.DeleteObject(item)
            for item in (scaled_dc, window_dc):
                if item:
                    self.gdi32.DeleteDC(item)
            self.user32.ReleaseDC(None, screen_dc)

    def _capture_region(self, x: int, y: int, width: int, height: int, max_dimension: int, include_cursor: bool) -> bytes:
        if width <= 0 or height <= 0:
            raise ValueError("Capture width and height must be positive")
        if width > 32768 or height > 32768:
            raise ValueError("Capture region is too large")
        output_width, output_height, scale = output_size(width, height, max_dimension)
        source_dc = self.user32.GetDC(None)
        if not source_dc:
            raise OSError(ctypes.get_last_error(), "GetDC failed")
        memory_dc = self.gdi32.CreateCompatibleDC(source_dc)
        bitmap = self.gdi32.CreateCompatibleBitmap(source_dc, output_width, output_height)
        if not memory_dc or not bitmap:
            if bitmap:
                self.gdi32.DeleteObject(bitmap)
            if memory_dc:
                self.gdi32.DeleteDC(memory_dc)
            self.user32.ReleaseDC(None, source_dc)
            raise OSError(ctypes.get_last_error(), "Unable to create capture bitmap")
        previous = self.gdi32.SelectObject(memory_dc, bitmap)
        try:
            self.gdi32.SetStretchBltMode(memory_dc, HALFTONE)
            if not self.gdi32.StretchBlt(
                memory_dc, 0, 0, output_width, output_height,
                source_dc, x, y, width, height, SRCCOPY | CAPTUREBLT,
            ):
                raise OSError(ctypes.get_last_error(), "StretchBlt failed")
            if include_cursor:
                cursor_info = CURSORINFO()
                cursor_info.cbSize = ctypes.sizeof(CURSORINFO)
                if self.user32.GetCursorInfo(ctypes.byref(cursor_info)):
                    if cursor_info.flags & CURSOR_SHOWING:
                        cursor_x = int((cursor_info.ptScreenPos.x - x) * scale)
                        cursor_y = int((cursor_info.ptScreenPos.y - y) * scale)
                        if 0 <= cursor_x < output_width and 0 <= cursor_y < output_height:
                            self.user32.DrawIconEx(memory_dc, cursor_x, cursor_y, cursor_info.hCursor, 0, 0, 0, None, DI_NORMAL)
            self.gdi32.SelectObject(memory_dc, previous)
            previous = None
            return self._bitmap_png(memory_dc, bitmap, output_width, output_height)
        finally:
            if previous:
                self.gdi32.SelectObject(memory_dc, previous)
            self.gdi32.DeleteObject(bitmap)
            self.gdi32.DeleteDC(memory_dc)
            self.user32.ReleaseDC(None, source_dc)
