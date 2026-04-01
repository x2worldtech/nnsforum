import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// Known ICP datacenter approximate coordinates [lat, lng]
const KNOWN_LOCATIONS: Record<string, [number, number]> = {
  zh1: [47.37, 8.54],
  zh2: [47.37, 8.54],
  fr1: [50.11, 8.68],
  fr2: [50.11, 8.68],
  mu1: [48.14, 11.58],
  ch1: [41.88, -87.63],
  sj1: [37.33, -121.89],
  sj2: [37.33, -121.89],
  fm1: [37.55, -121.98],
  at1: [33.75, -84.39],
  at2: [33.75, -84.39],
  va1: [39.04, -77.49],
  da1: [32.78, -96.8],
  lo1: [51.51, -0.13],
  am1: [52.37, 4.9],
  am2: [52.37, 4.9],
  ty1: [35.69, 139.69],
  ty2: [35.69, 139.69],
  sg1: [1.35, 103.82],
  sg2: [1.35, 103.82],
  to1: [43.65, -79.38],
  sy1: [-33.87, 151.21],
  pr1: [50.08, 14.43],
  bu1: [44.43, 26.1],
  st1: [59.33, 18.07],
  br1: [50.85, 4.35],
  pa1: [48.86, 2.35],
  mb1: [19.08, 72.88],
  se1: [37.57, 126.98],
};

const REGION_COORDS: Array<{ keywords: string[]; coord: [number, number] }> = [
  { keywords: ["switzerland", "zurich", "zrh"], coord: [47.37, 8.54] },
  {
    keywords: ["germany", "frankfurt", "fra", "munich", "muc"],
    coord: [50.11, 8.68],
  },
  { keywords: ["chicago", "ord"], coord: [41.88, -87.63] },
  {
    keywords: ["san jose", "sanjose", "sjc", "fremont"],
    coord: [37.33, -121.89],
  },
  { keywords: ["atlanta", "atl"], coord: [33.75, -84.39] },
  {
    keywords: ["ashburn", "virginia", "iad", "dulles"],
    coord: [39.04, -77.49],
  },
  { keywords: ["dallas", "dfw"], coord: [32.78, -96.8] },
  {
    keywords: ["london", "lhr", "united kingdom", "uk"],
    coord: [51.51, -0.13],
  },
  { keywords: ["amsterdam", "ams", "netherlands"], coord: [52.37, 4.9] },
  { keywords: ["tokyo", "nrt", "japan"], coord: [35.69, 139.69] },
  { keywords: ["singapore", "sin"], coord: [1.35, 103.82] },
  { keywords: ["toronto", "yyz", "canada"], coord: [43.65, -79.38] },
  { keywords: ["sydney", "syd", "australia"], coord: [-33.87, 151.21] },
  { keywords: ["prague", "prg", "czech"], coord: [50.08, 14.43] },
  { keywords: ["bucharest", "romania"], coord: [44.43, 26.1] },
  { keywords: ["stockholm", "sweden"], coord: [59.33, 18.07] },
  { keywords: ["brussels", "belgium", "bru"], coord: [50.85, 4.35] },
  { keywords: ["paris", "france", "cdg"], coord: [48.86, 2.35] },
  { keywords: ["mumbai", "india", "bom"], coord: [19.08, 72.88] },
  { keywords: ["seoul", "korea", "icn"], coord: [37.57, 126.98] },
];

function getCoordFromNode(node: {
  dc_id?: string;
  region?: string;
  country?: string;
}): [number, number] | null {
  const id = (node.dc_id ?? "").toLowerCase();
  if (KNOWN_LOCATIONS[id]) return KNOWN_LOCATIONS[id];
  const regionStr =
    `${node.region ?? ""} ${node.country ?? ""} ${node.dc_id ?? ""}`.toLowerCase();
  for (const { keywords, coord } of REGION_COORDS) {
    if (keywords.some((kw) => regionStr.includes(kw))) return coord;
  }
  return null;
}

function latLngToVec3(lat: number, lng: number, R: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -R * Math.sin(phi) * Math.cos(theta),
    R * Math.cos(phi),
    R * Math.sin(phi) * Math.sin(theta),
  );
}

const CONTINENT_POLYS: Array<Array<[number, number]>> = [
  // North America
  [
    [72, -140],
    [70, -120],
    [72, -96],
    [82, -75],
    [78, -68],
    [70, -75],
    [63, -65],
    [52, -55],
    [46, -60],
    [44, -66],
    [44, -70],
    [42, -70],
    [35, -75],
    [25, -80],
    [25, -82],
    [20, -87],
    [15, -85],
    [15, -92],
    [18, -95],
    [22, -97],
    [25, -97],
    [30, -97],
    [28, -95],
    [29, -90],
    [29, -89],
    [30, -84],
    [25, -80],
    [32, -117],
    [38, -122],
    [46, -124],
    [52, -128],
    [58, -136],
    [62, -145],
    [60, -150],
    [58, -152],
    [56, -158],
    [54, -163],
    [57, -170],
    [62, -165],
    [64, -166],
    [66, -163],
    [68, -162],
    [70, -157],
    [71, -152],
    [70, -142],
    [72, -140],
  ],
  // South America
  [
    [12, -71],
    [10, -62],
    [8, -60],
    [5, -52],
    [0, -50],
    [-5, -35],
    [-10, -37],
    [-15, -38],
    [-20, -40],
    [-23, -43],
    [-30, -50],
    [-35, -57],
    [-38, -57],
    [-42, -63],
    [-45, -65],
    [-48, -66],
    [-52, -68],
    [-55, -67],
    [-54, -64],
    [-52, -58],
    [-46, -52],
    [-38, -52],
    [-32, -52],
    [-28, -49],
    [-22, -43],
    [-18, -40],
    [-10, -36],
    [-5, -35],
    [0, -48],
    [5, -52],
    [8, -60],
    [10, -62],
    [12, -70],
    [12, -71],
  ],
  // Europe
  [
    [71, 28],
    [70, 20],
    [69, 18],
    [65, 14],
    [58, 5],
    [51, 2],
    [51, -2],
    [48, -4],
    [44, -8],
    [36, -9],
    [36, -6],
    [36, 10],
    [37, 11],
    [38, 15],
    [40, 18],
    [42, 19],
    [41, 20],
    [42, 21],
    [44, 28],
    [44, 30],
    [46, 30],
    [47, 37],
    [43, 40],
    [42, 45],
    [44, 47],
    [48, 44],
    [50, 40],
    [55, 38],
    [60, 30],
    [60, 25],
    [63, 25],
    [65, 28],
    [68, 28],
    [70, 28],
    [71, 28],
  ],
  // Africa
  [
    [37, -5],
    [37, 10],
    [33, 11],
    [32, 23],
    [28, 34],
    [22, 37],
    [12, 43],
    [12, 45],
    [5, 42],
    [0, 42],
    [-5, 40],
    [-10, 40],
    [-15, 36],
    [-20, 35],
    [-25, 33],
    [-30, 31],
    [-34, 26],
    [-34, 18],
    [-30, 17],
    [-25, 15],
    [-20, 13],
    [-15, 12],
    [-10, 14],
    [-5, 10],
    [0, 9],
    [4, 6],
    [5, 2],
    [4, -1],
    [5, -5],
    [5, -8],
    [5, -16],
    [10, -15],
    [14, -17],
    [15, -16],
    [18, -15],
    [20, -17],
    [22, -17],
    [28, -13],
    [32, -5],
    [35, -5],
    [37, -5],
  ],
  // Asia
  [
    [42, 45],
    [42, 50],
    [44, 52],
    [44, 58],
    [40, 60],
    [36, 62],
    [28, 62],
    [22, 60],
    [20, 68],
    [22, 72],
    [18, 74],
    [8, 78],
    [6, 80],
    [10, 80],
    [10, 90],
    [12, 100],
    [10, 104],
    [1, 104],
    [1, 110],
    [5, 115],
    [5, 120],
    [8, 117],
    [15, 120],
    [20, 120],
    [25, 120],
    [30, 122],
    [35, 121],
    [38, 121],
    [40, 122],
    [43, 130],
    [48, 135],
    [52, 142],
    [55, 135],
    [52, 130],
    [50, 120],
    [52, 110],
    [55, 103],
    [55, 83],
    [57, 74],
    [56, 69],
    [55, 64],
    [54, 57],
    [50, 50],
    [46, 49],
    [42, 50],
    [42, 45],
  ],
  // Australia
  [
    [-14, 126],
    [-16, 123],
    [-20, 119],
    [-24, 114],
    [-30, 115],
    [-32, 116],
    [-34, 119],
    [-34, 123],
    [-36, 137],
    [-38, 140],
    [-38, 146],
    [-36, 150],
    [-34, 151],
    [-28, 154],
    [-22, 154],
    [-18, 148],
    [-15, 145],
    [-12, 142],
    [-12, 135],
    [-14, 130],
    [-14, 126],
  ],
  // Greenland
  [
    [83, -45],
    [80, -25],
    [75, -20],
    [70, -25],
    [65, -38],
    [66, -42],
    [70, -52],
    [72, -56],
    [75, -62],
    [78, -68],
    [80, -68],
    [82, -55],
    [83, -45],
  ],
];

// Stable star data generated once
const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: `star-${i}`,
  w: (i * 37 + 13) % 3 === 0 ? "2px" : "1px",
  h: (i * 37 + 13) % 3 === 0 ? "2px" : "1px",
  top: `${((i * 137.508 + 0.5) % 1) * 100}%`,
  left: `${((i * 97.618 + 0.5) % 1) * 100}%`,
  opacity: 0.1 + ((i * 53 + 7) % 10) * 0.04,
}));

function createGlobeTexture(): THREE.CanvasTexture {
  const W = 2048;
  const H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#020918";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(30, 80, 160, 0.18)";
  ctx.lineWidth = 0.7;
  for (let lat = -90; lat <= 90; lat += 20) {
    const y = ((90 - lat) / 180) * H;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let lng = -180; lng <= 180; lng += 30) {
    const x = ((lng + 180) / 360) * W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }

  const toXY = (lat: number, lng: number): [number, number] => [
    ((lng + 180) / 360) * W,
    ((90 - lat) / 180) * H,
  ];

  for (const poly of CONTINENT_POLYS) {
    ctx.beginPath();
    const [sx, sy] = toXY(poly[0][0], poly[0][1]);
    ctx.moveTo(sx, sy);
    for (let i = 1; i < poly.length; i++) {
      const [px, py] = toXY(poly[i][0], poly[i][1]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(15, 50, 120, 0.55)";
    ctx.fill();
    ctx.strokeStyle = "rgba(80, 160, 255, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  return new THREE.CanvasTexture(canvas);
}

interface GlobeMarker {
  position: THREE.Vector3;
  label: string;
}

function PulsingMarker({ position }: { position: THREE.Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    t.current += delta * 2;
    const scale = 1 + 0.35 * Math.sin(t.current);
    if (glowRef.current) {
      glowRef.current.scale.setScalar(scale);
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + 0.15 * Math.sin(t.current);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshBasicMaterial color="#60c4ff" />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial
          color="#3399ff"
          transparent
          opacity={0.25}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function GlobeScene({ markers }: { markers: GlobeMarker[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useMemo(() => createGlobeTexture(), []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial map={texture} roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.06, 32, 32]} />
        <meshBasicMaterial
          color="#1a6aff"
          transparent
          opacity={0.045}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.025, 32, 32]} />
        <meshBasicMaterial
          color="#4488ff"
          transparent
          opacity={0.065}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      {markers.map((m) => (
        <PulsingMarker key={m.label} position={m.position} />
      ))}
    </group>
  );
}

async function fetchNodeLocations(): Promise<GlobeMarker[]> {
  try {
    const res = await fetch(
      "https://ic-api.internetcomputer.org/api/v3/nodes",
      {
        headers: { Accept: "application/json" },
      },
    );
    const json = await res.json();
    const nodes: Array<{ dc_id?: string; region?: string; country?: string }> =
      Array.isArray(json) ? json : Array.isArray(json?.nodes) ? json.nodes : [];

    const seen = new Set<string>();
    const markers: GlobeMarker[] = [];
    const usedCoords = new Map<string, number>();

    for (const node of nodes) {
      const dcId = (node.dc_id ?? "").toLowerCase();
      if (seen.has(dcId)) continue;
      seen.add(dcId);
      const coord = getCoordFromNode(node);
      if (!coord) continue;
      const coordKey = `${coord[0].toFixed(1)},${coord[1].toFixed(1)}`;
      const offset = usedCoords.get(coordKey) ?? 0;
      usedCoords.set(coordKey, offset + 1);
      const jitter = offset * 0.02;
      const pos = latLngToVec3(coord[0] + jitter, coord[1] + jitter, 1.015);
      markers.push({ position: pos, label: dcId });
    }

    if (markers.length === 0) {
      for (const [key, coord] of Object.entries(KNOWN_LOCATIONS)) {
        markers.push({
          position: latLngToVec3(coord[0], coord[1], 1.015),
          label: key,
        });
      }
    }
    return markers;
  } catch {
    return Object.entries(KNOWN_LOCATIONS).map(([key, coord]) => ({
      position: latLngToVec3(coord[0], coord[1], 1.015),
      label: key,
    }));
  }
}

function GlobeSkeletonFallback() {
  return (
    <div
      className="w-full flex items-center justify-center"
      style={{ height: "clamp(280px, 45vw, 500px)" }}
    >
      <div className="relative">
        <div
          className="rounded-full animate-pulse"
          style={{
            width: "clamp(240px, 38vw, 420px)",
            height: "clamp(240px, 38vw, 420px)",
            background:
              "radial-gradient(circle at 35% 35%, oklch(0.25 0.08 240), oklch(0.08 0.04 240))",
          }}
        />
      </div>
    </div>
  );
}

export function ICPGlobe() {
  const [markers, setMarkers] = useState<GlobeMarker[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetchNodeLocations().then((m) => {
      setMarkers(m);
      setLoaded(true);
    });
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ background: "#030c1a" }}
    >
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 40%, #030c1a 100%)",
        }}
      />

      {/* Stars */}
      <div className="absolute inset-0">
        {STARS.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              width: s.w,
              height: s.h,
              top: s.top,
              left: s.left,
              opacity: s.opacity,
            }}
          />
        ))}
      </div>

      <div style={{ height: "clamp(280px, 45vw, 500px)" }}>
        {!loaded ? (
          <GlobeSkeletonFallback />
        ) : (
          <Canvas
            frameloop="always"
            camera={{ position: [0, 0, 2.6], fov: 42 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: "transparent" }}
          >
            <ambientLight intensity={0.45} />
            <directionalLight
              position={[3, 4, 3]}
              intensity={0.8}
              color="#b8d4ff"
            />
            <directionalLight
              position={[-3, -2, -1]}
              intensity={0.12}
              color="#4466aa"
            />
            <Suspense fallback={null}>
              <GlobeScene markers={markers} />
            </Suspense>
          </Canvas>
        )}
      </div>

      {/* Label */}
      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1 z-20 pointer-events-none">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#60c4ff" }}
          />
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "rgba(150,200,255,0.75)" }}
          >
            ICP Network · Live Datacenter Locations
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#60c4ff", animationDelay: "0.5s" }}
          />
        </div>
        {loaded && markers.length > 0 && (
          <span className="text-xs" style={{ color: "rgba(100,150,200,0.55)" }}>
            {markers.length} datacenters tracked
          </span>
        )}
      </div>
    </div>
  );
}
