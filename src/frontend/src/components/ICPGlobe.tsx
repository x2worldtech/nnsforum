import {
  type GeoPermissibleObjects,
  geoGraticule,
  geoOrthographic,
  geoPath,
} from "d3-geo";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface GeoJsonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}
interface GeoJson {
  type: string;
  features: GeoJsonFeature[];
}

interface Marker {
  lat: number;
  lng: number;
  label: string;
}

// d3-geo accepts a "Sphere" object (not in standard GeoJSON spec)
type SphereObject = { type: "Sphere" };

// ─── Known ICP datacenter locations ───────────────────────────────────────────
const KNOWN_LOCATIONS: Record<string, [number, number]> = {
  zh1: [47.37, 8.54],
  zh2: [47.37, 8.54],
  zh3: [47.37, 8.54],
  zh4: [47.37, 8.54],
  ge1: [46.2, 6.15],
  be1: [46.95, 7.44],
  fr1: [50.11, 8.68],
  fr2: [50.11, 8.68],
  mu1: [48.14, 11.58],
  am1: [52.37, 4.9],
  am2: [52.37, 4.9],
  am3: [52.37, 4.9],
  br1: [50.85, 4.35],
  lo1: [51.51, -0.13],
  lo2: [51.51, -0.13],
  pa1: [48.86, 2.35],
  st1: [59.33, 18.07],
  st2: [59.33, 18.07],
  he1: [60.17, 24.94],
  os1: [59.91, 10.75],
  co1: [55.68, 12.57],
  pr1: [50.08, 14.43],
  bu1: [44.43, 26.1],
  wa1: [52.23, 21.01],
  vi1: [48.21, 16.37],
  ba1: [41.38, 2.18],
  ma1: [40.42, -3.7],
  ro1: [41.9, 12.48],
  du1: [53.33, -6.25],
  sj1: [37.33, -121.89],
  sj2: [37.33, -121.89],
  sj3: [37.33, -121.89],
  fm1: [37.55, -121.98],
  fm2: [37.55, -121.98],
  la1: [34.05, -118.24],
  se2: [47.61, -122.33],
  ch1: [41.88, -87.63],
  ch2: [41.88, -87.63],
  at1: [33.75, -84.39],
  at2: [33.75, -84.39],
  at3: [33.75, -84.39],
  da1: [32.78, -96.8],
  da2: [32.78, -96.8],
  mi1: [25.77, -80.19],
  ph1: [33.45, -112.07],
  de1: [39.74, -104.98],
  va1: [39.04, -77.49],
  va2: [39.04, -77.49],
  va3: [39.04, -77.49],
  ny1: [40.71, -74.01],
  ny2: [40.71, -74.01],
  to1: [43.65, -79.38],
  to2: [43.65, -79.38],
  mo1: [45.5, -73.57],
  ty1: [35.69, 139.69],
  ty2: [35.69, 139.69],
  ty3: [35.69, 139.69],
  os2: [34.69, 135.5],
  sg1: [1.35, 103.82],
  sg2: [1.35, 103.82],
  sg3: [1.35, 103.82],
  se1: [37.57, 126.98],
  bj1: [39.9, 116.4],
  sh1: [31.23, 121.47],
  ta1: [25.04, 121.56],
  hk1: [22.32, 114.17],
  mb1: [19.08, 72.88],
  mb2: [19.08, 72.88],
  bl1: [12.97, 77.59],
  sy1: [-33.87, 151.21],
  sy2: [-33.87, 151.21],
  me1: [-37.81, 144.96],
  sp1: [-23.55, -46.63],
  db1: [25.2, 55.27],
  ct1: [-33.93, 18.42],
  jo1: [-26.2, 28.04],
};

const REGION_COORDS: Array<{ keywords: string[]; coord: [number, number] }> = [
  { keywords: ["switzerland", "zurich", "zrh", "zh"], coord: [47.37, 8.54] },
  { keywords: ["geneva"], coord: [46.2, 6.15] },
  { keywords: ["germany", "frankfurt", "fra", "fr"], coord: [50.11, 8.68] },
  { keywords: ["munich", "muc", "mu"], coord: [48.14, 11.58] },
  { keywords: ["chicago", "ord", "ch"], coord: [41.88, -87.63] },
  { keywords: ["san jose", "sanjose", "sjc", "sj"], coord: [37.33, -121.89] },
  { keywords: ["fremont", "fm"], coord: [37.55, -121.98] },
  { keywords: ["atlanta", "atl", "at"], coord: [33.75, -84.39] },
  {
    keywords: ["ashburn", "virginia", "iad", "dulles", "va"],
    coord: [39.04, -77.49],
  },
  { keywords: ["dallas", "dfw", "da"], coord: [32.78, -96.8] },
  {
    keywords: ["london", "lhr", "united kingdom", "uk", "lo"],
    coord: [51.51, -0.13],
  },
  { keywords: ["amsterdam", "ams", "netherlands", "am"], coord: [52.37, 4.9] },
  { keywords: ["brussels", "belgium", "bru", "br"], coord: [50.85, 4.35] },
  { keywords: ["paris", "france", "cdg", "pa"], coord: [48.86, 2.35] },
  { keywords: ["stockholm", "sweden", "st"], coord: [59.33, 18.07] },
  { keywords: ["helsinki", "finland", "he"], coord: [60.17, 24.94] },
  { keywords: ["oslo", "norway", "os"], coord: [59.91, 10.75] },
  { keywords: ["copenhagen", "denmark", "co"], coord: [55.68, 12.57] },
  { keywords: ["prague", "prg", "czech", "pr"], coord: [50.08, 14.43] },
  { keywords: ["bucharest", "romania", "bu"], coord: [44.43, 26.1] },
  { keywords: ["warsaw", "poland", "wa"], coord: [52.23, 21.01] },
  { keywords: ["vienna", "austria", "vi"], coord: [48.21, 16.37] },
  { keywords: ["barcelona", "ba"], coord: [41.38, 2.18] },
  { keywords: ["madrid", "spain", "ma"], coord: [40.42, -3.7] },
  { keywords: ["rome", "italy", "ro"], coord: [41.9, 12.48] },
  { keywords: ["dublin", "ireland", "du"], coord: [53.33, -6.25] },
  { keywords: ["tokyo", "nrt", "japan", "ty"], coord: [35.69, 139.69] },
  { keywords: ["osaka", "kix"], coord: [34.69, 135.5] },
  { keywords: ["singapore", "sin", "sg"], coord: [1.35, 103.82] },
  { keywords: ["seoul", "korea", "icn", "se1"], coord: [37.57, 126.98] },
  { keywords: ["seattle", "sea", "se2"], coord: [47.61, -122.33] },
  { keywords: ["new york", "nyc", "jfk", "ny"], coord: [40.71, -74.01] },
  { keywords: ["los angeles", "lax", "la"], coord: [34.05, -118.24] },
  { keywords: ["miami", "mia", "mi"], coord: [25.77, -80.19] },
  { keywords: ["toronto", "yyz", "canada", "to"], coord: [43.65, -79.38] },
  { keywords: ["montreal", "yul", "mo"], coord: [45.5, -73.57] },
  { keywords: ["mumbai", "india", "bom", "mb"], coord: [19.08, 72.88] },
  { keywords: ["bangalore", "bengaluru", "bl"], coord: [12.97, 77.59] },
  { keywords: ["hong kong", "hkg", "hk"], coord: [22.32, 114.17] },
  { keywords: ["beijing", "bj"], coord: [39.9, 116.4] },
  { keywords: ["shanghai", "sh"], coord: [31.23, 121.47] },
  { keywords: ["taipei", "taiwan", "ta"], coord: [25.04, 121.56] },
  { keywords: ["sydney", "syd", "australia", "sy"], coord: [-33.87, 151.21] },
  { keywords: ["melbourne", "mel", "me"], coord: [-37.81, 144.96] },
  { keywords: ["sao paulo", "gru", "sp"], coord: [-23.55, -46.63] },
  { keywords: ["dubai", "uae", "db"], coord: [25.2, 55.27] },
  { keywords: ["cape town", "cpt", "ct"], coord: [-33.93, 18.42] },
  { keywords: ["johannesburg", "jnb", "jo"], coord: [-26.2, 28.04] },
];

function getCoordFromNode(node: {
  dc_id?: string;
  region?: string;
  country?: string;
  name?: string;
}): [number, number] | null {
  const id = (node.dc_id ?? node.name ?? "").toLowerCase();
  for (const [k, v] of Object.entries(KNOWN_LOCATIONS)) {
    if (id.startsWith(k) || k.startsWith(id.replace(/[0-9]/g, ""))) return v;
  }
  if (KNOWN_LOCATIONS[id]) return KNOWN_LOCATIONS[id];
  const regionStr =
    `${node.region ?? ""} ${node.country ?? ""} ${node.dc_id ?? ""} ${node.name ?? ""}`.toLowerCase();
  for (const { keywords, coord } of REGION_COORDS) {
    if (keywords.some((kw) => regionStr.includes(kw))) return coord;
  }
  return null;
}

// ─── Inline TopoJSON → GeoJSON converter ──────────────────────────────────────
function topoToGeo(topo: Record<string, unknown>, objectName: string): GeoJson {
  try {
    const objects = topo.objects as Record<string, unknown>;
    const obj = objects?.[objectName] as {
      type?: string;
      geometries?: unknown[];
    };
    if (!obj) return { type: "FeatureCollection", features: [] };

    const transform = topo.transform as
      | { scale?: [number, number]; translate?: [number, number] }
      | undefined;
    const arcs = topo.arcs as number[][][];

    function decodeArc(arcIndex: number): number[][] {
      const isReversed = arcIndex < 0;
      const idx = isReversed ? ~arcIndex : arcIndex;
      const arc = arcs[idx];
      const coords: number[][] = [];
      let cx = 0;
      let cy = 0;
      for (const delta of arc) {
        cx += delta[0];
        cy += delta[1];
        let lon = cx;
        let lat = cy;
        if (transform?.scale && transform?.translate) {
          lon = cx * transform.scale[0] + transform.translate[0];
          lat = cy * transform.scale[1] + transform.translate[1];
        }
        coords.push([lon, lat]);
      }
      return isReversed ? coords.reverse() : coords;
    }

    function decodeRing(arcIndices: number[]): number[][] {
      const coords: number[][] = [];
      for (const i of arcIndices) {
        const arcCoords = decodeArc(i);
        if (coords.length > 0) arcCoords.shift();
        coords.push(...arcCoords);
      }
      return coords;
    }

    function decodeGeometry(geom: {
      type?: string;
      arcs?: unknown;
    }): GeoJsonFeature | null {
      if (geom.type === "Polygon") {
        const rings = (geom.arcs as number[][]).map((r) => decodeRing(r));
        return {
          type: "Feature",
          geometry: { type: "Polygon", coordinates: rings },
        };
      }
      if (geom.type === "MultiPolygon") {
        const polys = (geom.arcs as number[][][]).map((poly) =>
          poly.map((r) => decodeRing(r)),
        );
        return {
          type: "Feature",
          geometry: { type: "MultiPolygon", coordinates: polys },
        };
      }
      return null;
    }

    const features: GeoJsonFeature[] = [];
    if (obj.type === "GeometryCollection" && obj.geometries) {
      for (const geom of obj.geometries as {
        type?: string;
        arcs?: unknown;
      }[]) {
        const f = decodeGeometry(geom);
        if (f) features.push(f);
      }
    }
    return { type: "FeatureCollection", features };
  } catch {
    return { type: "FeatureCollection", features: [] };
  }
}

// Sphere object constant - d3-geo treats { type: "Sphere" } as the full globe outline
const SPHERE = { type: "Sphere" } as unknown as GeoPermissibleObjects;

// ─── Pulse state for sequential blinking (max 3, never simultaneous) ──────────
const MAX_BLINK_SLOTS = 3;
const CYCLE_DURATION = 4.0;
const BLINK_DURATION = 0.9;
const SLOT_OFFSET = CYCLE_DURATION / MAX_BLINK_SLOTS;

// ─── Check if a lat/lng point is on the visible hemisphere ───────────────────
// The globe is rotated by [rotLon, rotLat]. A point is visible when the
// dot-product of its 3D unit vector with the camera direction is > 0.
function isPointVisible(
  lat: number,
  lng: number,
  rotLon: number,
  rotLat: number,
): boolean {
  // Convert marker geographic coords to radians
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180;

  // Convert rotation to radians (d3 rotate is [lon, lat] = [-λ, -φ] applied)
  const rotLonR = (rotLon * Math.PI) / 180;
  const rotLatR = (rotLat * Math.PI) / 180;

  // Marker unit vector in globe-local space
  const mx = Math.cos(latR) * Math.cos(lngR);
  const my = Math.cos(latR) * Math.sin(lngR);
  const mz = Math.sin(latR);

  // Camera direction in globe-local space:
  // d3 geoOrthographic with rotate([rotLon, rotLat]) means the viewer looks at
  // the point on the globe with longitude = -rotLon, latitude = -rotLat.
  const viewLat = -rotLatR;
  const viewLng = -rotLonR;
  const cx = Math.cos(viewLat) * Math.cos(viewLng);
  const cy2 = Math.cos(viewLat) * Math.sin(viewLng);
  const cz = Math.sin(viewLat);

  // Dot product: positive means facing the viewer
  return mx * cx + my * cy2 + mz * cz > 0;
}

// ─── Globe canvas renderer using d3-geo ───────────────────────────────────────
function drawGlobe(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  geoJson: GeoJson | null,
  markers: Marker[],
  activeMarkerIndices: number[],
  rotLon: number,
  rotLat: number,
  pulseT: number,
  dpr: number,
) {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.42;

  const projection = geoOrthographic()
    .scale(radius)
    .translate([cx, cy])
    .rotate([rotLon, rotLat, 0])
    .clipAngle(90);

  const pathGen = geoPath(projection, ctx);
  const graticule = geoGraticule().step([30, 20]);

  // ── Ocean fill ───────────────────────────────────────────────────────────────
  const oceanGrad = ctx.createRadialGradient(
    cx - radius * 0.2,
    cy - radius * 0.2,
    radius * 0.05,
    cx,
    cy,
    radius,
  );
  oceanGrad.addColorStop(0, "#0b2044");
  oceanGrad.addColorStop(0.5, "#06122e");
  oceanGrad.addColorStop(1, "#020810");

  ctx.beginPath();
  pathGen(SPHERE);
  ctx.fillStyle = oceanGrad;
  ctx.fill();

  // ── Graticule ────────────────────────────────────────────────────────────────
  ctx.beginPath();
  pathGen(graticule());
  ctx.strokeStyle = "rgba(30, 80, 160, 0.25)";
  ctx.lineWidth = 0.5 * dpr;
  ctx.stroke();

  // ── Land fill ────────────────────────────────────────────────────────────────
  if (geoJson) {
    ctx.beginPath();
    for (const feature of geoJson.features) {
      pathGen(feature as unknown as GeoPermissibleObjects);
    }
    ctx.fillStyle = "rgba(28, 85, 180, 0.55)";
    ctx.fill();

    ctx.beginPath();
    for (const feature of geoJson.features) {
      pathGen(feature as unknown as GeoPermissibleObjects);
    }
    ctx.strokeStyle = "rgba(80, 160, 255, 0.9)";
    ctx.lineWidth = 0.8 * dpr;
    ctx.stroke();
  }

  // ── Globe border ─────────────────────────────────────────────────────────────
  ctx.beginPath();
  pathGen(SPHERE);
  ctx.strokeStyle = "rgba(60, 140, 255, 0.4)";
  ctx.lineWidth = 1.5 * dpr;
  ctx.stroke();

  // ── Datacenter markers ────────────────────────────────────────────────────────
  // Build blink intensities for active slots
  const blinkIntensity = new Map<number, number>();
  for (let slot = 0; slot < MAX_BLINK_SLOTS; slot++) {
    const phase =
      (((pulseT + slot * SLOT_OFFSET) % CYCLE_DURATION) + CYCLE_DURATION) %
      CYCLE_DURATION;
    if (phase < BLINK_DURATION) {
      if (activeMarkerIndices.length > 0) {
        const markerIdx =
          activeMarkerIndices[
            (slot * Math.ceil(activeMarkerIndices.length / MAX_BLINK_SLOTS)) %
              activeMarkerIndices.length
          ];
        const t = phase / BLINK_DURATION;
        const intensity = Math.sin(t * Math.PI);
        blinkIntensity.set(markerIdx, intensity);
      }
    }
  }

  for (let i = 0; i < markers.length; i++) {
    const m = markers[i];

    // ── Visibility check: skip markers on the back of the globe ──────────────
    if (!isPointVisible(m.lat, m.lng, rotLon, rotLat)) continue;

    const projected = projection([m.lng, m.lat]);
    if (projected === null) continue;
    const [x, y] = projected;

    const intensity = blinkIntensity.get(i) ?? 0;

    if (intensity > 0) {
      // Expanding ring — only when blinking
      const ringExpand = intensity * 0.85;
      const ringR = (6 + 14 * ringExpand) * dpr;
      ctx.beginPath();
      ctx.arc(x, y, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 229, 255, ${0.55 * intensity})`;
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      // Glow
      const glowGrad = ctx.createRadialGradient(x, y, 0, x, y, 8 * dpr);
      glowGrad.addColorStop(0, `rgba(0, 229, 255, ${0.5 * intensity})`);
      glowGrad.addColorStop(1, "rgba(0, 229, 255, 0)");
      ctx.beginPath();
      ctx.arc(x, y, 8 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();
    }

    // Core dot — always visible on front hemisphere, slightly brighter when blinking
    ctx.beginPath();
    ctx.arc(x, y, 3 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.55 + 0.4 * intensity})`;
    ctx.fill();
  }

  // ── Atmosphere glow ───────────────────────────────────────────────────────────
  const atmGrad = ctx.createRadialGradient(
    cx,
    cy,
    radius * 0.95,
    cx,
    cy,
    radius * 1.12,
  );
  atmGrad.addColorStop(0, "rgba(0, 80, 255, 0.0)");
  atmGrad.addColorStop(0.6, "rgba(0, 100, 255, 0.06)");
  atmGrad.addColorStop(1, "rgba(0, 140, 255, 0.18)");
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.12, 0, Math.PI * 2);
  ctx.fillStyle = atmGrad;
  ctx.fill();

  // ── Specular highlight ────────────────────────────────────────────────────────
  const hlGrad = ctx.createRadialGradient(
    cx - radius * 0.35,
    cy - radius * 0.35,
    0,
    cx - radius * 0.1,
    cy - radius * 0.15,
    radius * 0.65,
  );
  hlGrad.addColorStop(0, "rgba(255,255,255,0.07)");
  hlGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = hlGrad;
  ctx.fill();
}

// ─── Stars ─────────────────────────────────────────────────────────────────────
const STARS = Array.from({ length: 150 }, (_, i) => ({
  id: i,
  top: `${((i * 137.508 + 0.5) % 1) * 100}%`,
  left: `${((i * 97.618 + 0.5) % 1) * 100}%`,
  size: (i * 37 + 13) % 7 === 0 ? 2 : 1,
  opacity: 0.08 + ((i * 53 + 7) % 10) * 0.035,
}));

// Maximum pitch angle in degrees (prevents pole-flipping)
const MAX_PITCH_DEG = 65;
const TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ─── Data fetching ─────────────────────────────────────────────────────────────
async function fetchData(): Promise<{
  geoJson: GeoJson | null;
  markers: Marker[];
  officialDcCount: number | null;
}> {
  let geoJson: GeoJson | null = null;
  try {
    const res = await fetch(TOPO_URL);
    if (res.ok) {
      const topo = await res.json();
      geoJson = topoToGeo(topo, "land");
    }
  } catch {
    /* use null */
  }

  let officialDcCount: number | null = null;
  const seen = new Set<string>();
  const usedCoords = new Map<string, number>();
  const markers: Marker[] = [];

  const addMarker = (label: string, coord: [number, number]) => {
    if (seen.has(label)) return;
    seen.add(label);
    const key = `${coord[0].toFixed(1)},${coord[1].toFixed(1)}`;
    const offset = usedCoords.get(key) ?? 0;
    usedCoords.set(key, offset + 1);
    const jitter = offset * 0.018;
    markers.push({
      lat: coord[0] + jitter,
      lng: coord[1] + jitter * 1.3,
      label,
    });
  };

  try {
    const [nodesRes, dcRes] = await Promise.allSettled([
      fetch("https://ic-api.internetcomputer.org/api/v3/nodes", {
        headers: { Accept: "application/json" },
      }),
      fetch("https://ic-api.internetcomputer.org/api/v3/data-centers", {
        headers: { Accept: "application/json" },
      }),
    ]);

    if (dcRes.status === "fulfilled" && dcRes.value.ok) {
      const json = await dcRes.value.json();
      const dcs: Array<{
        id?: string;
        dc_id?: string;
        name?: string;
        region?: string;
        country?: string;
        location?: { lat?: number; long?: number; longitude?: number };
      }> = Array.isArray(json)
        ? json
        : Array.isArray(json?.data_centers)
          ? json.data_centers
          : [];
      if (dcs.length > 0) officialDcCount = dcs.length;
      for (const dc of dcs) {
        const id = (dc.id ?? dc.dc_id ?? dc.name ?? "").toLowerCase();
        const lat = dc.location?.lat;
        const lng = dc.location?.long ?? dc.location?.longitude;
        if (lat !== undefined && lng !== undefined && id) {
          addMarker(id, [lat, lng]);
        } else {
          const coord = getCoordFromNode({
            dc_id: id,
            region: dc.region,
            country: dc.country,
            name: dc.name,
          });
          if (coord) addMarker(id, coord);
        }
      }
    }

    if (nodesRes.status === "fulfilled" && nodesRes.value.ok) {
      const json = await nodesRes.value.json();
      const nodes: Array<{
        dc_id?: string;
        region?: string;
        country?: string;
      }> = Array.isArray(json)
        ? json
        : Array.isArray(json?.nodes)
          ? json.nodes
          : [];
      for (const node of nodes) {
        const dcId = (node.dc_id ?? "").toLowerCase();
        if (!dcId) continue;
        const coord = getCoordFromNode(node);
        if (coord) addMarker(dcId, coord);
      }
    }
  } catch {
    /* fall through */
  }

  for (const [key, coord] of Object.entries(KNOWN_LOCATIONS)) {
    addMarker(key, coord);
  }

  return { geoJson, markers, officialDcCount };
}

// ─── Build a stable list of blink-candidate indices (spread across the globe) ──
function buildActiveMarkerIndices(markers: Marker[]): number[] {
  if (markers.length === 0) return [];
  const count = Math.min(MAX_BLINK_SLOTS, markers.length);
  return Array.from({ length: count }, (_, i) =>
    Math.floor((i * markers.length) / count),
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export function ICPGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [grabbing, setGrabbing] = useState(false);
  const [officialDcCount, setOfficialDcCount] = useState<number | null>(null);
  const [markerCount, setMarkerCount] = useState(0);

  const rotRef = useRef({ lon: 0, lat: 0 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const pulseT = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTime = useRef<number | null>(null);
  const geoJsonRef = useRef<GeoJson | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const activeMarkerIndicesRef = useRef<number[]>([]);

  // Suppress unused type
  const _unusedSphereType: SphereObject = { type: "Sphere" };
  void _unusedSphereType;

  useEffect(() => {
    fetchData().then(({ geoJson, markers, officialDcCount: cnt }) => {
      geoJsonRef.current = geoJson;
      markersRef.current = markers;
      activeMarkerIndicesRef.current = buildActiveMarkerIndices(markers);
      setOfficialDcCount(cnt);
      setMarkerCount(markers.length);
      setLoaded(true);
    });
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    drawGlobe(
      ctx,
      canvas.width,
      canvas.height,
      geoJsonRef.current,
      markersRef.current,
      activeMarkerIndicesRef.current,
      rotRef.current.lon,
      rotRef.current.lat,
      pulseT.current,
      dpr,
    );
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const loop = (ts: number) => {
      const dt =
        lastTime.current !== null ? (ts - lastTime.current) / 1000 : 0.016;
      lastTime.current = ts;
      if (!isDragging.current) {
        rotRef.current.lon -= dt * 5.73;
      }
      pulseT.current += dt * 1.0;
      render();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [loaded, render]);

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current;
      const container = canvas?.parentElement;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = Math.min(w, 520);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      render();
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [render]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setGrabbing(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    rotRef.current.lon += dx * 0.3;
    rotRef.current.lat = Math.max(
      -MAX_PITCH_DEG,
      Math.min(MAX_PITCH_DEG, rotRef.current.lat - dy * 0.3),
    );
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    setGrabbing(false);
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{ background: "#020810" }}
    >
      {/* Stars */}
      <div className="absolute inset-0 pointer-events-none">
        {STARS.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full bg-white"
            style={{
              width: s.size,
              height: s.size,
              top: s.top,
              left: s.left,
              opacity: s.opacity,
            }}
          />
        ))}
      </div>

      {/* Canvas */}
      <div
        style={{ cursor: grabbing ? "grabbing" : "grab", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {!loaded && (
          <div
            className="flex items-center justify-center"
            style={{ height: "clamp(300px, 48vw, 520px)" }}
          >
            <div
              className="rounded-full animate-pulse"
              style={{
                width: "clamp(260px, 40vw, 440px)",
                height: "clamp(260px, 40vw, 440px)",
                background:
                  "radial-gradient(circle at 35% 35%, oklch(0.22 0.08 240), oklch(0.06 0.04 240))",
              }}
            />
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{
            display: loaded ? "block" : "none",
            width: "100%",
            height: "clamp(300px, 48vw, 520px)",
          }}
        />
      </div>

      {/* Label */}
      <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1 z-20 pointer-events-none">
        <div className="flex items-center gap-2">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#00e5ff" }}
          />
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: "rgba(100,200,255,0.8)" }}
          >
            ICP Network · Live Datacenter Locations
          </span>
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#00e5ff", animationDelay: "0.5s" }}
          />
        </div>
        {loaded && (
          <span className="text-xs" style={{ color: "rgba(80,150,200,0.6)" }}>
            {officialDcCount !== null ? officialDcCount : markerCount}{" "}
            datacenters tracked
          </span>
        )}
      </div>
    </div>
  );
}
