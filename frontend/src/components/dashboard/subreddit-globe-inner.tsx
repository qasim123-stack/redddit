"use client";

import { useEffect, useRef } from "react";
import GlobeGL, { GlobeMethods } from "react-globe.gl";

const SUBREDDIT_POINTS = [
  { lat: 37.7749,  lng: -122.4194, name: "r/technology",      radius: 0.65, color: "#FF4500" },
  { lat: 51.5074,  lng: -0.1278,   name: "r/worldnews",       radius: 0.5,  color: "#FF6534" },
  { lat: 35.6762,  lng: 139.6503,  name: "r/anime",           radius: 0.55, color: "#7c3aed" },
  { lat: -33.8688, lng: 151.2093,  name: "r/australia",       radius: 0.4,  color: "#FF4500" },
  { lat: 48.8566,  lng: 2.3522,    name: "r/france",          radius: 0.38, color: "#a855f7" },
  { lat: 52.5200,  lng: 13.4050,   name: "r/de",              radius: 0.38, color: "#7c3aed" },
  { lat: 55.7558,  lng: 37.6176,   name: "r/russia",          radius: 0.35, color: "#FF4500" },
  { lat: 28.6139,  lng: 77.2090,   name: "r/india",           radius: 0.52, color: "#FF6534" },
  { lat: 39.9042,  lng: 116.4074,  name: "r/china",           radius: 0.45, color: "#7c3aed" },
  { lat: 40.7128,  lng: -74.0060,  name: "r/wallstreetbets",  radius: 0.62, color: "#FF4500" },
  { lat: 43.6532,  lng: -79.3832,  name: "r/canada",          radius: 0.4,  color: "#FF6534" },
  { lat: -23.5505, lng: -46.6333,  name: "r/brasil",          radius: 0.45, color: "#7c3aed" },
  { lat: 19.4326,  lng: -99.1332,  name: "r/mexico",          radius: 0.35, color: "#FF4500" },
  { lat: 1.3521,   lng: 103.8198,  name: "r/singapore",       radius: 0.3,  color: "#a855f7" },
  { lat: 25.2048,  lng: 55.2708,   name: "r/dubai",           radius: 0.28, color: "#FF4500" },
  { lat: 34.0522,  lng: -118.2437, name: "r/MachineLearning", radius: 0.58, color: "#7c3aed" },
];

const ARC_DATA = [
  { startLat: 37.77, startLng: -122.42, endLat: 51.50,  endLng: -0.12,   color: ["#FF4500", "#7c3aed"] },
  { startLat: 37.77, startLng: -122.42, endLat: 35.68,  endLng: 139.65,  color: ["#FF4500", "#a855f7"] },
  { startLat: 40.71, startLng: -74.00,  endLat: 48.86,  endLng: 2.35,    color: ["#FF6534", "#7c3aed"] },
  { startLat: 51.50, startLng: -0.12,   endLat: 28.61,  endLng: 77.21,   color: ["#7c3aed", "#FF4500"] },
  { startLat: -33.87, startLng: 151.21, endLat: 1.35,   endLng: 103.82,  color: ["#FF4500", "#a855f7"] },
];

export default function GlobeInner() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);

  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls() as {
      autoRotate: boolean;
      autoRotateSpeed: number;
      enableZoom: boolean;
    };
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    controls.enableZoom = false;
  }, []);

  return (
    <GlobeGL
      ref={globeRef}
      width={400}
      height={300}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
      backgroundColor="rgba(0,0,0,0)"
      globeMaterial={undefined}
      atmosphereColor="#FF4500"
      atmosphereAltitude={0.15}
      showGraticules={false}
      pointsData={SUBREDDIT_POINTS}
      pointLat="lat"
      pointLng="lng"
      pointAltitude={0.01}
      pointColor="color"
      pointRadius="radius"
      pointLabel="name"
      pointResolution={12}
      arcsData={ARC_DATA}
      arcStartLat="startLat"
      arcStartLng="startLng"
      arcEndLat="endLat"
      arcEndLng="endLng"
      arcColor="color"
      arcDashLength={0.4}
      arcDashGap={0.15}
      arcDashAnimateTime={2000}
      arcAltitude={0.06}
      arcStroke={0.6}
    />
  );
}
