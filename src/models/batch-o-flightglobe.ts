import type { Demo } from './types';

export const demosFlightglobe: Demo[] = [
  {
    id: 'flightglobe',
    added: '2026-10-10',
    title: 'Flight routes globe',
    description:
      'A solid blue globe turning on a tilted axis, with six flight routes arcing off its surface between ten cities and a plane flying each one, round the back and out again. The sphere is a single camera-facing disc that hides whatever turns behind its middle, and each arc is a half circle standing on the chord between its two cities, leant until its plane is nearly level with the equator, so under a camera looking 28° down no arc ever turns edge-on.',
    category: 'css',
    tags: ['loop', 'globe', 'map', 'flights', 'data'],
    technique: ['camera-facing disc hides the far half', 'half-circle arcs leant about their chord', 'rotateY · rotateX · rotateZ placement from coordinates', 'arm-carried plane along an arc'],
  },
];
