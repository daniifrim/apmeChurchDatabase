// County boundaries for Romania (approximate center coordinates)
export const COUNTY_BOUNDARIES: Record<string, {
  center: [number, number];
  bounds: [[number, number], [number, number]];
  region: string;
}> = {
  'Alba': {
    center: [46.0667, 23.5833],
    bounds: [[45.5, 22.8], [46.6, 24.3]],
    region: 'Transilvania'
  },
  'Arad': {
    center: [46.1833, 21.3167],
    bounds: [[45.8, 20.7], [46.6, 22.0]],
    region: 'Banat'
  },
  'Argeș': {
    center: [44.8667, 24.8667],
    bounds: [[44.5, 24.3], [45.3, 25.5]],
    region: 'Muntenia'
  },
  'Bacău': {
    center: [46.5833, 26.9167],
    bounds: [[46.0, 26.0], [47.2, 27.8]],
    region: 'Moldova'
  },
  'Bihor': {
    center: [47.0667, 21.9333],
    bounds: [[46.4, 21.0], [47.7, 22.9]],
    region: 'Crișana'
  },
  'Bistrița-Năsăud': {
    center: [47.1333, 24.5000],
    bounds: [[46.8, 23.8], [47.5, 25.2]],
    region: 'Transilvania'
  },
  'Botoșani': {
    center: [47.7500, 26.6667],
    bounds: [[47.4, 26.0], [48.1, 27.3]],
    region: 'Moldova'
  },
  'Brașov': {
    center: [45.6667, 25.5833],
    bounds: [[45.3, 24.8], [46.0, 26.4]],
    region: 'Transilvania'
  },
  'Brăila': {
    center: [45.2667, 27.9833],
    bounds: [[44.9, 27.4], [45.6, 28.6]],
    region: 'Muntenia'
  },
  'Buzău': {
    center: [45.1500, 26.8167],
    bounds: [[44.7, 26.2], [45.6, 27.4]],
    region: 'Muntenia'
  },
  'Caraș-Severin': {
    center: [45.1667, 22.0500],
    bounds: [[44.6, 21.3], [45.8, 22.8]],
    region: 'Banat'
  },
  'Călărași': {
    center: [44.2000, 27.3333],
    bounds: [[43.8, 26.7], [44.6, 28.0]],
    region: 'Muntenia'
  },
  'Cluj': {
    center: [46.7667, 23.5833],
    bounds: [[46.4, 22.9], [47.2, 24.3]],
    region: 'Transilvania'
  },
  'Constanța': {
    center: [44.1833, 28.6333],
    bounds: [[43.7, 27.9], [44.7, 29.4]],
    region: 'Dobrogea'
  },
  'Covasna': {
    center: [45.8667, 25.7833],
    bounds: [[45.5, 25.1], [46.2, 26.5]],
    region: 'Transilvania'
  },
  'Dâmbovița': {
    center: [44.9333, 25.4333],
    bounds: [[44.5, 24.8], [45.4, 26.1]],
    region: 'Muntenia'
  },
  'Dolj': {
    center: [44.3167, 23.8000],
    bounds: [[43.8, 23.1], [44.8, 24.5]],
    region: 'Oltenia'
  },
  'Galați': {
    center: [45.4500, 28.0500],
    bounds: [[45.0, 27.4], [45.9, 28.7]],
    region: 'Moldova'
  },
  'Giurgiu': {
    center: [43.8833, 25.9667],
    bounds: [[43.5, 25.3], [44.3, 26.6]],
    region: 'Muntenia'
  },
  'Gorj': {
    center: [44.9500, 23.3667],
    bounds: [[44.5, 22.7], [45.4, 24.0]],
    region: 'Oltenia'
  },
  'Harghita': {
    center: [46.4333, 25.8167],
    bounds: [[46.0, 25.1], [46.9, 26.5]],
    region: 'Transilvania'
  },
  'Hunedoara': {
    center: [45.7500, 22.9167],
    bounds: [[45.3, 22.2], [46.2, 23.6]],
    region: 'Transilvania'
  },
  'Ialomița': {
    center: [44.6000, 27.3500],
    bounds: [[44.2, 26.7], [45.0, 28.0]],
    region: 'Muntenia'
  },
  'Iași': {
    center: [47.1667, 27.6000],
    bounds: [[46.8, 26.9], [47.6, 28.3]],
    region: 'Moldova'
  },
  'Ilfov': {
    center: [44.5000, 26.1667],
    bounds: [[44.2, 25.5], [44.8, 26.8]],
    region: 'Muntenia'
  },
  'Maramureș': {
    center: [47.6667, 23.5833],
    bounds: [[47.3, 22.9], [48.0, 24.3]],
    region: 'Maramureș'
  },
  'Mehedinți': {
    center: [44.6333, 22.9167],
    bounds: [[44.2, 22.2], [45.1, 23.6]],
    region: 'Oltenia'
  },
  'Mureș': {
    center: [46.5500, 24.5500],
    bounds: [[46.2, 23.9], [46.9, 25.2]],
    region: 'Transilvania'
  },
  'Neamț': {
    center: [47.2000, 26.3667],
    bounds: [[46.8, 25.7], [47.6, 27.0]],
    region: 'Moldova'
  },
  'Olt': {
    center: [44.4333, 24.3667],
    bounds: [[44.0, 23.7], [44.9, 25.0]],
    region: 'Oltenia'
  },
  'Prahova': {
    center: [44.9500, 26.0333],
    bounds: [[44.5, 25.4], [45.4, 26.7]],
    region: 'Muntenia'
  },
  'Satu Mare': {
    center: [47.8000, 22.8833],
    bounds: [[47.4, 22.2], [48.2, 23.6]],
    region: 'Crișana'
  },
  'Sălaj': {
    center: [47.1833, 23.0500],
    bounds: [[46.8, 22.4], [47.6, 23.7]],
    region: 'Transilvania'
  },
  'Sibiu': {
    center: [45.8000, 24.1500],
    bounds: [[45.4, 23.5], [46.2, 24.8]],
    region: 'Transilvania'
  },
  'Suceava': {
    center: [47.6500, 26.2500],
    bounds: [[47.2, 25.5], [48.1, 27.0]],
    region: 'Bucovina'
  },
  'Teleorman': {
    center: [43.9000, 25.3333],
    bounds: [[43.5, 24.7], [44.3, 26.0]],
    region: 'Muntenia'
  },
  'Timiș': {
    center: [45.7500, 21.2167],
    bounds: [[45.3, 20.5], [46.2, 21.9]],
    region: 'Banat'
  },
  'Tulcea': {
    center: [45.1833, 28.8000],
    bounds: [[44.7, 28.1], [45.7, 29.5]],
    region: 'Dobrogea'
  },
  'Vaslui': {
    center: [46.6333, 27.7333],
    bounds: [[46.2, 27.1], [47.1, 28.4]],
    region: 'Moldova'
  },
  'Vâlcea': {
    center: [45.1000, 24.3667],
    bounds: [[44.7, 23.7], [45.5, 25.0]],
    region: 'Oltenia'
  },
  'Vrancea': {
    center: [45.7000, 27.1833],
    bounds: [[45.3, 26.5], [46.1, 27.9]],
    region: 'Moldova'
  }
};

/**
 * Get county center coordinates
 */
export function getCountyCenter(countyName: string): [number, number] | null {
  const normalizedName = countyName
    .toLowerCase()
    .replace(/[^a-zăâîșț-]/g, '')
    .replace(/ț/, 't')
    .replace(/ș/, 's')
    .replace(/ă/, 'a')
    .replace(/â/, 'a')
    .replace(/î/, 'i');

  for (const [name, data] of Object.entries(COUNTY_BOUNDARIES)) {
    const normalizedCounty = name
      .toLowerCase()
      .replace(/[^a-zăâîșț-]/g, '')
      .replace(/ț/, 't')
      .replace(/ș/, 's')
      .replace(/ă/, 'a')
      .replace(/â/, 'a')
      .replace(/î/, 'i');

    if (normalizedCounty.includes(normalizedName) || normalizedName.includes(normalizedCounty)) {
      return data.center;
    }
  }

  return null;
}

/**
 * Get county bounds for map fitting
 */
export function getCountyBounds(countyName: string): [[number, number], [number, number]] | null {
  const normalizedName = countyName
    .toLowerCase()
    .replace(/[^a-zăâîșț-]/g, '')
    .replace(/ț/, 't')
    .replace(/ș/, 's')
    .replace(/ă/, 'a')
    .replace(/â/, 'a')
    .replace(/î/, 'i');

  for (const [name, data] of Object.entries(COUNTY_BOUNDARIES)) {
    const normalizedCounty = name
      .toLowerCase()
      .replace(/[^a-zăâîșț-]/g, '')
      .replace(/ț/, 't')
      .replace(/ș/, 's')
      .replace(/ă/, 'a')
      .replace(/â/, 'a')
      .replace(/î/, 'i');

    if (normalizedCounty.includes(normalizedName) || normalizedName.includes(normalizedCounty)) {
      return data.bounds;
    }
  }

  return null;
}

/**
 * Get region for a county
 */
export function getCountyRegion(countyName: string): string | null {
  const normalizedName = countyName
    .toLowerCase()
    .replace(/[^a-zăâîșț-]/g, '')
    .replace(/ț/, 't')
    .replace(/ș/, 's')
    .replace(/ă/, 'a')
    .replace(/â/, 'a')
    .replace(/î/, 'i');

  for (const [name, data] of Object.entries(COUNTY_BOUNDARIES)) {
    const normalizedCounty = name
      .toLowerCase()
      .replace(/[^a-zăâîșț-]/g, '')
      .replace(/ț/, 't')
      .replace(/ș/, 's')
      .replace(/ă/, 'a')
      .replace(/â/, 'a')
      .replace(/î/, 'i');

    if (normalizedCounty.includes(normalizedName) || normalizedName.includes(normalizedCounty)) {
      return data.region;
    }
  }

  return null;
}

/**
 * Get all counties in a region
 */
export function getCountiesByRegion(region: string): string[] {
  return Object.entries(COUNTY_BOUNDARIES)
    .filter(([_, data]) => data.region.toLowerCase() === region.toLowerCase())
    .map(([county]) => county);
}