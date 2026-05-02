type Props = {
  size?: number;
  className?: string;
};

export default function LogoMark({ size = 40, className = "" }: Props) {
  const r = size / 2;
  const s3 = Math.sqrt(3) / 2;
  // Flat-top hexagon: 6 vertices, radius = r*0.88 for inner clearance
  const hr = r * 0.88;
  const pts = [0, 60, 120, 180, 240, 300]
    .map((deg) => {
      const rad = (deg * Math.PI) / 180;
      return `${r + hr * Math.cos(rad)},${r + hr * Math.sin(rad)}`;
    })
    .join(" ");

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Layover Legends mark"
      className={className}
    >
      <polygon
        points={pts}
        stroke="#C9963A"
        strokeWidth={size * 0.035}
        strokeLinejoin="round"
        fill="none"
      />
      <g transform={`translate(${r},${r}) rotate(-35) scale(${size * 0.011})`}>
        <rect x="-1.5" y="-14" width="3" height="28" rx="1.5" fill="#C9963A" />
        <polygon points="-1.5,-4 -13,6 -1.5,4" fill="#C9963A" />
        <polygon points="1.5,-4 13,6 1.5,4" fill="#C9963A" />
        <polygon points="-1.5,10 -7,14 -1.5,12" fill="#C9963A" />
        <polygon points="1.5,10 7,14 1.5,12" fill="#C9963A" />
      </g>
    </svg>
  );
}
