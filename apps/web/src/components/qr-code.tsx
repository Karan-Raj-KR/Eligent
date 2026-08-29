"use client";

import { useMemo } from "react";

function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic, decorative QR-style pattern used to represent the
 * UPI scan target in the Apply Mode unlock screen.
 */
export function PseudoQR({ seed, size = 150 }: { seed: string; size?: number }) {
  const cells = useMemo(() => {
    const rand = mulberry32(hashString(seed));
    const grid: boolean[][] = Array.from({ length: 25 }, () =>
      Array.from({ length: 25 }, () => rand() > 0.52),
    );
    const finder = (ox: number, oy: number) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const border = x === 0 || x === 6 || y === 0 || y === 6;
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          grid[oy + y][ox + x] = border || core;
        }
      }
    };
    finder(0, 0);
    finder(18, 0);
    finder(0, 18);
    for (let i = 8; i < 17; i++) grid[6][i] = !(i % 2 === 0);
    for (let i = 8; i < 17; i++) grid[i][6] = !(i % 2 === 0);
    return grid;
  }, [seed]);

  const cell = size / 25;

  return (
    <span className="inline-grid place-items-center rounded-2xl bg-surface p-3 shadow-[var(--shadow-clay-sm)]">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="UPI payment QR code"
        className="block"
      >
        {cells.map((row, y) =>
          row.map((on, x) =>
            on ? (
              <rect
                key={`${x}-${y}`}
                x={x * cell}
                y={y * cell}
                width={cell}
                height={cell}
                rx={cell * 0.18}
                fill="#171525"
              />
            ) : null,
          ),
        )}
        <rect
          x={size * 0.36}
          y={size * 0.36}
          width={size * 0.28}
          height={size * 0.28}
          rx={size * 0.06}
          fill="#FFF8F0"
        />
        <text
          x={size * 0.5}
          y={size * 0.55}
          textAnchor="middle"
          fontSize={size * 0.12}
          fontWeight={700}
          fontFamily="var(--font-space-grotesk), sans-serif"
          fill="#171525"
        >
          E
        </text>
      </svg>
    </span>
  );
}