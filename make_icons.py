"""Рисует icon-192.png и icon-512.png (щит с замочной скважиной) без сторонних библиотек."""
import os
import struct
import zlib

BG = (17, 24, 28)
SHIELD = (61, 220, 132)


def inside_shield(x, y):
    # координаты 0..1; щит занимает центр (запас под «маскируемую» иконку Android)
    if not (0.27 <= x <= 0.73 and 0.22 <= y <= 0.80):
        return False
    if y <= 0.52:
        return True
    # нижняя часть сужается к острию
    half = 0.23 * (1 - ((y - 0.52) / 0.28) ** 1.6)
    return abs(x - 0.5) <= half


def keyhole(x, y):
    if (x - 0.5) ** 2 + (y - 0.43) ** 2 <= 0.055 ** 2:
        return True
    return abs(x - 0.5) <= 0.025 and 0.43 <= y <= 0.6


def png(size, path):
    ss = 3  # сглаживание: 3×3 выборки на пиксель
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            hit = 0
            for sy in range(ss):
                for sx in range(ss):
                    x = (px + (sx + 0.5) / ss) / size
                    y = (py + (sy + 0.5) / ss) / size
                    hit += inside_shield(x, y) and not keyhole(x, y)
            a = hit / (ss * ss)
            row += bytes(round(BG[i] * (1 - a) + SHIELD[i] * a) for i in range(3))
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)

    def chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)))
        f.write(chunk(b'IDAT', raw))
        f.write(chunk(b'IEND', b''))


if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    for s in (192, 512):
        png(s, os.path.join(here, f'icon-{s}.png'))
    print('ok')
