/** The 32 counties of Ireland (mirrors backend/app/domain/counties.py). */
export const COUNTIES = [
  "Antrim", "Armagh", "Carlow", "Cavan", "Clare", "Cork", "Derry",
  "Donegal", "Down", "Dublin", "Fermanagh", "Galway", "Kerry", "Kildare",
  "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", "Louth", "Mayo",
  "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary",
  "Tyrone", "Waterford", "Westmeath", "Wexford", "Wicklow",
] as const;

export type County = (typeof COUNTIES)[number];

export const DEFAULT_COUNTY: County = "Galway";
