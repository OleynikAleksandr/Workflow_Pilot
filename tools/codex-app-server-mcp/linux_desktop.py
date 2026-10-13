"""Read-only X11 observation using python-xlib, mss and Pillow. No input APIs."""
import io
import os


def require_x11(environ=None):
    env = os.environ if environ is None else environ
    if env.get('XDG_SESSION_TYPE') == 'wayland' or env.get('WAYLAND_DISPLAY'):
        raise ValueError('LINUX_WAYLAND_UNSUPPORTED: select Ubuntu on Xorg; XWayland is not full desktop access')
    if not env.get('DISPLAY'):
        raise ValueError('LINUX_DISPLAY_MISSING: an authenticated X11 desktop session is required')
    return env['DISPLAY']


def png(image, max_dimension):
    from PIL import Image
    if max_dimension > 0:
        limit = max(100, min(int(max_dimension), 5000))
        image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    image.save(output, format='PNG')
    return output.getvalue()


def dimensions(width, height):
    if width <= 0 or height <= 0 or width * height > 50_000_000:
        raise ValueError('LINUX_CAPTURE_SIZE_UNSUPPORTED')


def decode_drawable(data, width, height, bits, pad, byte_order, masks):
    from PIL import Image
    dimensions(width, height)
    if bits not in (24, 32) or pad not in (8, 16, 32) or byte_order not in (0, 1) or masks != (0xff0000, 0xff00, 0xff):
        raise ValueError('LINUX_X11_FORMAT_UNSUPPORTED: this drawable is not supported TrueColor RGB')
    stride = ((width * bits + pad - 1) // pad) * (pad // 8)
    if len(data) != stride * height:
        raise ValueError('LINUX_X11_IMAGE_INCOMPLETE')
    mode = ('BGRX' if byte_order == 0 else 'XRGB') if bits == 32 else ('BGR' if byte_order == 0 else 'RGB')
    return Image.frombytes('RGB', (width, height), data, 'raw', mode, stride, 1)


class LinuxDesktop:
    def __init__(self, environ=None, display_factory=None, capture_factory=None):
        self.environ = os.environ if environ is None else environ
        require_x11(self.environ)
        self.display_factory = display_factory
        self.capture_factory = capture_factory

    def _display(self):
        name = require_x11(self.environ)
        try:
            if self.display_factory:
                return self.display_factory(name)
            from Xlib.display import Display
            return Display(name)
        except Exception as error:
            raise ValueError('LINUX_X11_ACCESS_DENIED: check DISPLAY and XAUTHORITY for this user session') from error

    @staticmethod
    def _property(display, window, name):
        value = window.get_full_property(display.intern_atom(name), 0)
        return None if value is None else value.value

    def list_windows(self):
        display = self._display()
        try:
            root = display.screen().root
            ids = self._property(display, root, '_NET_CLIENT_LIST_STACKING')
            if ids is None:
                ids = [child.id for child in root.query_tree().children]
            rows = []
            for identifier in ids:
                try:
                    window = display.create_resource_object('window', int(identifier))
                    if window.get_attributes().map_state != 2:  # X.IsViewable
                        continue
                    bounds = window.get_geometry()
                    position = root.translate_coords(window, 0, 0)
                    title = self._property(display, window, '_NET_WM_NAME')
                    if title is None:
                        title = window.get_wm_name() or ''
                    if isinstance(title, bytes):
                        title = title.decode('utf-8', errors='replace')
                    owner = window.get_wm_class() or ('', '')
                    pid = self._property(display, window, '_NET_WM_PID')
                    rows.append({'window_id': int(identifier), 'application': str(owner[-1]), 'title': str(title),
                                 'pid': int(pid[0]) if pid is not None and len(pid) else None,
                                 'rect': {'x': position.x, 'y': position.y, 'width': bounds.width, 'height': bounds.height}})
                except Exception:
                    # A window may disappear during enumeration. Capture of that
                    # explicit ID reports failure rather than substituting another.
                    continue
            return rows
        finally:
            display.close()

    def capture_screen(self, x=None, y=None, width=None, height=None, max_dimension=1600, include_cursor=True):
        from PIL import Image
        require_x11(self.environ)
        try:
            factory = self.capture_factory
            if factory is None:
                from mss import mss
                factory = mss
            with factory(display=self.environ['DISPLAY'], with_cursor=include_cursor) as capture:
                monitor = capture.monitors[0]
                region = monitor if None in (x, y, width, height) else {'left': int(x), 'top': int(y), 'width': int(width), 'height': int(height)}
                dimensions(region['width'], region['height'])
                if (region['left'] < monitor['left'] or region['top'] < monitor['top']
                        or region['left'] + region['width'] > monitor['left'] + monitor['width']
                        or region['top'] + region['height'] > monitor['top'] + monitor['height']):
                    raise ValueError('LINUX_CAPTURE_REGION_INVALID')
                shot = capture.grab(region)
                return png(Image.frombytes('RGB', shot.size, shot.rgb), max_dimension)
        except Exception as error:
            raise ValueError('LINUX_SCREEN_CAPTURE_FAILED: X11 capture unavailable') from error

    def capture_window(self, window_id, max_dimension=1600):
        if isinstance(window_id, bool) or not isinstance(window_id, int) or window_id <= 0:
            raise ValueError('window_id must be a positive integer from computer_list_windows')
        display = self._display()
        try:
            window = display.create_resource_object('window', window_id)
            attributes, bounds = window.get_attributes(), window.get_geometry()
            if attributes.map_state != 2:
                raise ValueError('LINUX_WINDOW_NOT_VIEWABLE')
            dimensions(bounds.width, bounds.height)
            info = display.display.info
            visual = next(v for screen in info.roots for depth in screen.allowed_depths for v in depth.visuals if v.visual_id == attributes.visual)
            if visual.visual_class != 4:  # X.TrueColor
                raise ValueError('LINUX_X11_FORMAT_UNSUPPORTED')
            format = next(f for f in info.pixmap_formats if f.depth == bounds.depth)
            image = window.get_image(0, 0, bounds.width, bounds.height, 2, 0xffffffff)  # X.ZPixmap
            decoded = decode_drawable(image.data, bounds.width, bounds.height, format.bits_per_pixel,
                format.scanline_pad, info.image_byte_order, (visual.red_mask, visual.green_mask, visual.blue_mask))
            return png(decoded, max_dimension)
        except Exception as error:
            raise ValueError('LINUX_WINDOW_CAPTURE_FAILED: window unavailable, minimized or unsupported drawable; obscured areas depend on the X server') from error
        finally:
            display.close()
