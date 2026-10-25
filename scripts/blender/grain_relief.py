"""Painted end-grain relief derived from the photographed grain atlas (numpy only).

The photo atlas shows ~30 narrow rings per cell around a pith 1.5-4 cells away, so any
crop of it reads as straight parallel lines. Real tiles show ~8-14 broad, curved rings
around a pith just off the tile. For every atlas cell we keep its measured radial ring
profile (real, irregular spacing and strength), then redraw it as arcs around a closer
pith with fewer rings, a little waviness, and rounded latewood ridges.
Returns an (H, W, 2) float array: [..., 0] latewood mask, [..., 1] soft relief height.
"""
import numpy as np


def blur(image, sigma):
    """Gaussian blur with reflected borders (FFT, numpy only)."""
    if sigma <= 0:
        return image
    h, w = image.shape
    py, px = (int(min(max(3 * sigma, 1), n - 1)) for n in (h, w))
    padded = np.pad(image, ((py, py), (px, px)), mode='reflect')
    fy = np.fft.fftfreq(padded.shape[0])[:, None]
    fx = np.fft.fftfreq(padded.shape[1])[None, :]
    kernel = np.exp(-2 * (np.pi * sigma) ** 2 * (fx * fx + fy * fy))
    out = np.real(np.fft.ifft2(np.fft.fft2(padded) * kernel))
    return out[py:py + h, px:px + w]


def blur1d(signal, sigma):
    return blur(np.tile(signal, (8, 1)), sigma)[0] if sigma > 0 else signal


def _ring_coherence(cell, cx, cy):
    """Share of the cell's variance explained by distance from (cx, cy)."""
    yy, xx = np.indices(cell.shape) + 0.5
    bins = np.hypot(xx - cx, yy - cy).astype(int).ravel()
    values = cell.ravel()
    count = np.bincount(bins)
    total = np.bincount(bins, values)
    return np.sum(total * total / np.maximum(count, 1)) / np.sum(values * values)


def find_pith(cell, P):
    """Pith (in cell units) whose concentric circles best explain the cell's rings."""
    f = P['grain_relief_search_downsample']
    small = cell.reshape(cell.shape[0] // f, f, cell.shape[1] // f, f).mean(axis=(1, 3))
    n = small.shape[0]
    lo, hi = P['grain_relief_pith_search_range']
    best = (-1, 0.5, 0.5)
    for step in P['grain_relief_pith_search_steps']:
        if best[0] < 0:
            grid = np.arange(lo, hi + step / 2, step)
            candidates = [(x, y) for x in grid for y in grid if not (0 <= x <= 1 and 0 <= y <= 1)]
        else:
            around = np.arange(-4, 5) * step
            candidates = [(best[1] + dx, best[2] + dy) for dx in around for dy in around]
        for x, y in candidates:
            score = _ring_coherence(small, x * n, y * n)
            if score > best[0]:
                best = (score, x, y)
    return np.array(best[1:])


def ring_profile(cell, pith):
    """Mean latewood signal (dark rings in the photo -> high) by integer pixel radius."""
    yy, xx = np.indices(cell.shape) + 0.5
    radius = np.hypot(xx - pith[0] * cell.shape[1], yy - pith[1] * cell.shape[0])
    bins = radius.astype(int).ravel()
    count = np.bincount(bins)
    total = np.bincount(bins, -cell.ravel())
    valid = np.nonzero(count >= 0.25 * count.max())[0]
    start, stop = valid.min(), valid.max() + 1
    profile = total[start:stop] / np.maximum(count[start:stop], 1)
    profile = profile - blur1d(profile, len(profile) / 8)
    return profile / (profile.std() + 1e-9)


def ring_spacing(profile, P):
    """Dominant ring period in pixels (spectral centroid inside the plausible band)."""
    power = np.abs(np.fft.rfft(profile)) ** 2
    freq = np.fft.rfftfreq(len(profile))
    lo, hi = P['grain_relief_source_period_px']
    band = (freq >= 1 / hi) & (freq <= 1 / lo)
    return 1 / (np.sum(freq[band] * power[band]) / np.sum(power[band]))


def smooth_noise(shape, sigma, rng):
    noise = blur(rng.standard_normal(shape), sigma)
    return noise / (noise.std() + 1e-9)


def relief_cell(cell, P, rng):
    size = cell.shape[0]
    highpass = cell - blur(cell, size * P['grain_relief_flatten_fraction'])
    pith = find_pith(highpass, P)
    profile = ring_profile(highpass, pith)
    source_period = ring_spacing(profile, P)
    rings = rng.uniform(*P['grain_relief_rings_per_tile'])
    period = size / rings
    # New pith: same direction as the photographed one, but just off the tile.
    direction = pith - 0.5
    direction /= np.linalg.norm(direction)
    jitter = rng.uniform(-1, 1) * np.radians(P['grain_relief_pith_angle_jitter_deg'])
    c, s = np.cos(jitter), np.sin(jitter)
    direction = np.array([c * direction[0] - s * direction[1], s * direction[0] + c * direction[1]])
    center = (0.5 + direction * rng.uniform(*P['grain_relief_pith_distance'])) * size
    yy, xx = np.indices(cell.shape) + 0.5
    dx, dy = xx - center[0], yy - center[1]
    # Mild ellipticity, then low-frequency waviness measured in ring periods.
    axis = rng.uniform(0, np.pi)
    stretch = rng.uniform(1, P['grain_relief_max_ellipticity'])
    along = dx * np.cos(axis) + dy * np.sin(axis)
    across = -dx * np.sin(axis) + dy * np.cos(axis)
    radius = np.hypot(along / stretch, across)
    radius += period * P['grain_relief_wobble_rings'] * smooth_noise(cell.shape, size * P['grain_relief_wobble_scale'], rng)
    radius -= radius.min()
    span = radius.max()
    source_span = span * source_period / period
    offset = rng.uniform(0, max(len(profile) - 1 - source_span, 0))
    source_radius = np.clip(offset + radius * source_period / period, 0, len(profile) - 1)
    signal = np.interp(source_radius, np.arange(len(profile)), profile)
    signal = blur(signal, period * P['grain_relief_signal_blur_rings'])
    signal = (signal - signal.mean()) / (signal.std() + 1e-9)
    # Latewood bands: the top fraction of the signal, with soft edges.
    threshold = np.quantile(signal, 1 - rng.uniform(*P['grain_relief_latewood_fraction']))
    latewood = 1 / (1 + np.exp(-(signal - threshold) / P['grain_relief_edge_softness']))
    height = blur(latewood, period * P['grain_relief_height_blur_rings'])
    height = (height - height.min()) / (np.ptp(height) + 1e-9)
    return latewood, height, dict(source_pith=pith.round(2).tolist(), source_period=round(float(source_period), 1), rings=round(float(rings), 1))


def build_relief(atlas_luminance, P, cells_used=None):
    """atlas_luminance: (H, W) float in [0, 1], top row first."""
    grid = P['grain_relief_atlas_grid']
    size = atlas_luminance.shape[0] // grid
    out = np.zeros(atlas_luminance.shape + (2,))
    out[..., 1] = 0.5
    info = []
    rng = np.random.default_rng(P['grain_relief_seed'])
    for index in range(cells_used or grid * grid):
        row, col = divmod(index, grid)
        window = (slice(row * size, (row + 1) * size), slice(col * size, (col + 1) * size))
        latewood, height, meta = relief_cell(atlas_luminance[window], P, rng)
        out[window + (0,)] = latewood
        out[window + (1,)] = height
        info.append(meta)
    return out, info
