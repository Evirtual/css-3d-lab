import type { Demo } from './types';

export const demosFlightglobe: Demo[] = [
  {
    id: 'flightglobe',
    added: '2026-10-10',
    title: 'Flight routes globe',
    description:
      'An Earth turning on a tilted axis, its continents cut from flat clip-path sheets laid on the sphere, with six flight routes arcing between ten cities and a plane flying each one, round the back and out again. The ocean is a single camera-facing disc that hides whatever turns behind its middle, and each arc is a half circle on the chord between its two cities, leant nearly level with the equator so that, seen from 28° above, no arc ever turns edge-on.',
    category: 'css',
    tags: ['loop', 'globe', 'earth', 'map', 'flights', 'data'],
    technique: ['camera-facing disc hides the far half', 'continents as clip-path sheets on tangent planes', 'half-circle arcs leant about their chord', 'arm-carried plane along an arc'],
  },
];
