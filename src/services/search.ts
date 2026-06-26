import { KARTVERKET_API, NOMINATIM_API } from '../constants/config';

export interface SearchResult {
  name: string;
  type: string;
  municipality: string;
  county: string;
  lat: number;
  lng: number;
}

export async function searchPlaces(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const results = await searchKartverket(query);
  if (results.length > 0) return results;

  return searchNominatim(query);
}

async function searchKartverket(query: string): Promise<SearchResult[]> {
  try {
    const url = `${KARTVERKET_API}?sok=${encodeURIComponent(query)}&fuzzy=true&treffPerSide=10`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.navn?.length) return [];

    return data.navn
      .filter((n: any) => n.representasjonspunkt)
      .map((n: any) => ({
        name: n.skrivemåte || n.stedsnavn?.[0]?.skrivemåte || query,
        type: n.navneobjekttype || '',
        municipality: n.kommuner?.[0]?.kommunenavn || '',
        county: n.fylker?.[0]?.fylkesnavn || '',
        lat: n.representasjonspunkt.nord,
        lng: n.representasjonspunkt.øst,
      }));
  } catch {
    return [];
  }
}

async function searchNominatim(query: string): Promise<SearchResult[]> {
  try {
    const url = `${NOMINATIM_API}?q=${encodeURIComponent(query)}&countrycodes=no&format=json&limit=10`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    return data.map((item: any) => ({
      name: item.display_name?.split(',')[0] || query,
      type: item.type || '',
      municipality: item.display_name?.split(',')[1]?.trim() || '',
      county: item.display_name?.split(',')[2]?.trim() || '',
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch {
    return [];
  }
}
