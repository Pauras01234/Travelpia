/**
 * Static editorial metadata for the 32 counties, used by the Home screen's
 * discovery lists and hero card. Province/region are facts; `tagline` and
 * `places` are curated content — `places` is a placeholder count to be
 * replaced by real counts once the places DB (Supabase) drives it.
 */
export type Province = "Leinster" | "Munster" | "Connacht" | "Ulster";

export interface CountyMeta {
  province: Province;
  region: string; // rough compass region, e.g. "West"
  tagline: string;
  places: number;
}

export const COUNTY_META: Record<string, CountyMeta> = {
  Antrim: { province: "Ulster", region: "North", tagline: "Causeway Coast", places: 42 },
  Armagh: { province: "Ulster", region: "North", tagline: "Orchard County", places: 24 },
  Carlow: { province: "Leinster", region: "South-East", tagline: "Dolmen country", places: 21 },
  Cavan: { province: "Ulster", region: "North", tagline: "Lakelands", places: 28 },
  Clare: { province: "Munster", region: "West", tagline: "Cliffs & the Burren", places: 47 },
  Cork: { province: "Munster", region: "South", tagline: "The Rebel County", places: 61 },
  Derry: { province: "Ulster", region: "North", tagline: "The Walled City", places: 33 },
  Donegal: { province: "Ulster", region: "North-West", tagline: "Wild headlands", places: 52 },
  Down: { province: "Ulster", region: "North", tagline: "Mournes & coast", places: 38 },
  Dublin: { province: "Leinster", region: "East", tagline: "The capital", places: 64 },
  Fermanagh: { province: "Ulster", region: "North-West", tagline: "Lakelands", places: 26 },
  Galway: { province: "Connacht", region: "West", tagline: "Wild Atlantic Way", places: 48 },
  Kerry: { province: "Munster", region: "South-West", tagline: "The Kingdom", places: 54 },
  Kildare: { province: "Leinster", region: "East", tagline: "Thoroughbred country", places: 27 },
  Kilkenny: { province: "Leinster", region: "South-East", tagline: "Medieval city", places: 34 },
  Laois: { province: "Leinster", region: "Midlands", tagline: "Slieve Bloom", places: 20 },
  Leitrim: { province: "Connacht", region: "North-West", tagline: "Lakes & drumlins", places: 22 },
  Limerick: { province: "Munster", region: "South-West", tagline: "The Treaty City", places: 39 },
  Longford: { province: "Leinster", region: "Midlands", tagline: "Goldsmith country", places: 18 },
  Louth: { province: "Leinster", region: "East", tagline: "The Wee County", places: 25 },
  Mayo: { province: "Connacht", region: "West", tagline: "Greenway & Croagh Patrick", places: 44 },
  Meath: { province: "Leinster", region: "East", tagline: "The Royal County", places: 31 },
  Monaghan: { province: "Ulster", region: "North", tagline: "Drumlin country", places: 19 },
  Offaly: { province: "Leinster", region: "Midlands", tagline: "Bogs & Clonmacnoise", places: 23 },
  Roscommon: { province: "Connacht", region: "West", tagline: "Rathcroghan royal site", places: 21 },
  Sligo: { province: "Connacht", region: "North-West", tagline: "Yeats country", places: 36 },
  Tipperary: { province: "Munster", region: "South", tagline: "The Golden Vale", places: 35 },
  Tyrone: { province: "Ulster", region: "North", tagline: "The Sperrins", places: 24 },
  Waterford: { province: "Munster", region: "South-East", tagline: "Ireland's oldest city", places: 37 },
  Westmeath: { province: "Leinster", region: "Midlands", tagline: "Lake District", places: 22 },
  Wexford: { province: "Leinster", region: "South-East", tagline: "Sunny South-East", places: 40 },
  Wicklow: { province: "Leinster", region: "East", tagline: "Garden of Ireland", places: 43 },
};

/** A curated shortlist highlighted in the "Featured counties" carousel. */
export const FEATURED_COUNTIES: string[] = [
  "Galway",
  "Kerry",
  "Dublin",
  "Cork",
  "Donegal",
  "Clare",
];

export function countyMeta(county: string): CountyMeta {
  return (
    COUNTY_META[county] ?? {
      province: "Leinster",
      region: "Ireland",
      tagline: "Explore Ireland",
      places: 0,
    }
  );
}
