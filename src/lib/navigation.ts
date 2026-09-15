export interface NavigationTarget {
  latitude: number;
  longitude: number;
  label?: string;
}

export function buildNavigationLinks(target: NavigationTarget): {
  geoUri: string;
  openStreetMapUrl: string;
} {
  const { latitude, longitude, label } = target;
  const destination = `${latitude},${longitude}`;
  const labelPart = label ? `(${encodeURIComponent(label)})` : '';

  return {
    geoUri: `geo:${destination}?q=${destination}${labelPart}`,
    openStreetMapUrl: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
  };
}

export function openNavigationHandoff(target: NavigationTarget): void {
  const { geoUri, openStreetMapUrl } = buildNavigationLinks(target);

  // Try native navigation handoff first, then fallback to OSM web map.
  window.location.href = geoUri;
  window.setTimeout(() => {
    window.open(openStreetMapUrl, '_blank', 'noopener,noreferrer');
  }, 700);
}
