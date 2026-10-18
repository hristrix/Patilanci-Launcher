import React from 'react';

const BLOCK_WIDTH = 22;
const BLOCK_DEPTH = 11;
const BLOCK_HEIGHT = 18;

function project(x, y, height) {
  return [
    640 + (x - y) * BLOCK_WIDTH,
    205 + (x + y) * BLOCK_DEPTH - height * BLOCK_HEIGHT,
  ];
}

function Block({ x, y, height, depth = 1, colors }) {
  const [screenX, screenY] = project(x, y, height);
  const sideHeight = depth * BLOCK_HEIGHT;

  return (
    <g>
      <path
        fill={colors[1]}
        d={`M${screenX - BLOCK_WIDTH} ${screenY + BLOCK_DEPTH} l${BLOCK_WIDTH} ${BLOCK_DEPTH} v${sideHeight} l-${BLOCK_WIDTH} -${BLOCK_DEPTH}Z`}
      />
      <path
        fill={colors[2]}
        d={`M${screenX} ${screenY + BLOCK_DEPTH * 2} l${BLOCK_WIDTH} -${BLOCK_DEPTH} v${sideHeight} l-${BLOCK_WIDTH} ${BLOCK_DEPTH}Z`}
      />
      <path
        fill={colors[0]}
        d={`M${screenX} ${screenY} l${BLOCK_WIDTH} ${BLOCK_DEPTH} l-${BLOCK_WIDTH} ${BLOCK_DEPTH} l-${BLOCK_WIDTH} -${BLOCK_DEPTH}Z`}
      />
    </g>
  );
}

const grassColors = [
  ['#78945a', '#4b5534', '#39442e'],
  ['#879c60', '#505b37', '#3f4932'],
  ['#708851', '#495432', '#35432e'],
];
const woodColors = ['#a07544', '#725031', '#4c3929'];
const leafColors = ['#5f824c', '#3b603c', '#2a4634'];
const lightLeafColors = ['#829253', '#5c733f', '#3c5835'];
const roofColors = ['#bd613f', '#8f3c2c', '#672c27'];
const wallColors = ['#d1b387', '#b29773', '#8e775e'];

function Tree({ x, y, height, golden = false }) {
  const leaves = golden ? lightLeafColors : leafColors;

  return (
    <g>
      <Block
        x={x}
        y={y}
        height={height + 2.5}
        depth={2.5}
        colors={woodColors}
      />
      {[-1, 0, 1].flatMap((offsetX) =>
        [-1, 0, 1].map((offsetY) => (
          <Block
            key={`${offsetX}-${offsetY}`}
            x={x + offsetX * 0.7}
            y={y + offsetY * 0.7}
            height={height + 4}
            depth={1.5}
            colors={leaves}
          />
        )),
      )}
      <Block x={x} y={y} height={height + 5} depth={1.3} colors={leaves} />
    </g>
  );
}

function House() {
  const blocks = [];

  for (let x = 8; x < 12; x += 1) {
    for (let y = 3; y < 6; y += 1) {
      blocks.push(
        <Block
          key={`wall-${x}-${y}`}
          x={x}
          y={y}
          height={6}
          depth={2.5}
          colors={wallColors}
        />,
      );
    }
  }

  for (let x = 7; x < 13; x += 1) {
    for (let y = 2; y < 7; y += 1) {
      const roofHeight = 6.3 + Math.min(y - 2, 6 - y) * 0.7;
      blocks.push(
        <Block
          key={`roof-${x}-${y}`}
          x={x}
          y={y}
          height={roofHeight}
          depth={0.6}
          colors={roofColors}
        />,
      );
    }
  }

  const [doorX, doorY] = project(12, 4, 5.2);

  return (
    <g>
      {blocks}
      <path d={`M${doorX - 18} ${doorY} l13 -6 v29 l-13 6Z`} fill="#f2b632" />
      <path
        d={`M${doorX - 12} ${doorY - 1} v25`}
        stroke="#795231"
        strokeWidth="3"
      />
      <Block
        x={9}
        y={4}
        height={9}
        depth={1.6}
        colors={['#9e9b8d', '#747568', '#525b53']}
      />
    </g>
  );
}

export default function WorldScene() {
  const terrain = [];

  for (let x = 0; x < 18; x += 1) {
    for (let y = 0; y < 15; y += 1) {
      if ((x < 2 && y < 3) || (x > 15 && y > 11) || (x < 3 && y > 12)) continue;

      const river = Math.abs(y - (8 + Math.sin(x * 0.4) * 1.7)) < 1.3;
      const hill = y < 5 && x < 7 ? Math.floor((7 - x) / 2) : 0;
      const height = river ? 2.6 : 3.4 + hill;
      const colors = river
        ? ['#638b9a', '#38566a', '#2e4558']
        : grassColors[(x * 7 + y * 3) % grassColors.length];

      terrain.push(
        <Block
          key={`${x}-${y}`}
          x={x}
          y={y}
          height={height}
          depth={height + 1.8 + ((x + y) % 3) * 0.3}
          colors={colors}
        />,
      );
    }
  }

  return (
    <svg
      className="world-scene"
      viewBox="0 0 1100 620"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="world-sky" x2="0.8" y2="1">
          <stop stopColor="#15141d" />
          <stop offset="0.55" stopColor="#4b3732" />
          <stop offset="1" stopColor="#a5683d" />
        </linearGradient>
        <radialGradient id="sun-glow">
          <stop stopColor="#f2b632" stopOpacity="0.3" />
          <stop offset="1" stopColor="#f2b632" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="island-shade" x2="0" y2="1">
          <stop stopColor="#17191d" stopOpacity="0" />
          <stop offset="1" stopColor="#17191d" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path fill="url(#world-sky)" d="M0 0h1100v620H0z" />
      <circle cx="830" cy="190" r="260" fill="url(#sun-glow)" />
      <path fill="#e7b974" d="M803 110h65v65h-65z" />
      <path fill="#f4d09a" opacity="0.4" d="M803 110h65v9h-65z" />
      <g fill="#dfc7ab" opacity="0.18">
        <path d="M585 97h79v13h35v12H571v-12h14z" />
        <path d="M918 191h90v14h34v12H898v-12h20z" />
        <path d="M320 162h52v12h24v11h-98v-11h22z" />
      </g>
      <g fill="#f4e7cf" opacity="0.5">
        <path d="M514 66h3v3h-3zM740 48h3v3h-3zM958 84h3v3h-3zM1030 141h3v3h-3zM425 123h3v3h-3z" />
      </g>
      <path
        fill="#493d3a"
        d="M320 360h45v-57h43v-44h37v-33h51v45h32v49h61v-49h38v-67h42v-36h41v58h43v54h47v-28h39v-62h42v-51h41v54h42v56h45v-30h45v51h67v300H320z"
      />
      <path
        fill="#313534"
        d="M270 413h50v-63h69v-41h45v52h41v41h70v-54h63v-30h65v55h61v31h68v-69h70v-39h47v60h64v-42h47v41h70v265H270z"
      />
      <ellipse
        cx="685"
        cy="540"
        rx="256"
        ry="38"
        fill="#111319"
        opacity="0.6"
      />
      <g transform="translate(5,26)">
        {terrain}
        <Tree x={2} y={2} height={5.4} />
        <Tree x={5} y={3} height={4.4} golden />
        <Tree x={1} y={6} height={3.4} />
        <Tree x={15} y={2} height={3.4} golden />
        <House />
        <Tree x={3} y={12} height={3.4} />
        <Tree x={6} y={13} height={3.4} golden />
        <Tree x={15} y={10} height={3.4} />
        <Tree x={12} y={12} height={3.4} golden />
        {[7, 8, 9, 10].map((y) => (
          <Block
            key={y}
            x={10}
            y={y}
            height={3.6}
            depth={0.25}
            colors={woodColors}
          />
        ))}
      </g>
      <path fill="url(#island-shade)" d="M0 430h1100v190H0z" />
    </svg>
  );
}
