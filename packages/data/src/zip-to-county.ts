import { ALL_SANDBOX_ZIPS } from "./validation";

/** 5-digit county FIPS (state + county) for sandbox ZIPs — HUD/USPS crosswalk */
export const ZIP_TO_COUNTY: Record<string, string> = {
  // DC metro — Arlington, Alexandria, DC, Montgomery
  "22201": "51013",
  "22202": "51013",
  "22203": "51013",
  "22204": "51013",
  "22205": "51013",
  "22206": "51013",
  "22207": "51013",
  "20001": "11001",
  "20002": "11001",
  "20003": "11001",
  "20009": "11001",
  "20037": "11001",
  "22301": "51510",
  "22302": "51510",
  "22304": "51510",
  "20814": "24031",
  "20815": "24031",
  "20816": "24031",
  // Orlando — Orange + Osceola
  "32801": "12095",
  "32803": "12095",
  "32804": "12095",
  "32805": "12095",
  "32806": "12095",
  "32807": "12095",
  "32814": "12095",
  "32819": "12095",
  "32822": "12095",
  "32825": "12095",
  "32828": "12095",
  "32832": "12095",
  "32835": "12095",
  "32789": "12095",
  "34741": "12097",
  "34747": "12097",
  // SF Bay — San Francisco, Alameda, Contra Costa
  "94102": "06075",
  "94103": "06075",
  "94107": "06075",
  "94109": "06075",
  "94110": "06075",
  "94114": "06075",
  "94117": "06075",
  "94122": "06075",
  "94123": "06075",
  "94131": "06075",
  "94601": "06001",
  "94607": "06001",
  "94611": "06001",
  "94704": "06001",
  "94705": "06001",
  "94596": "06013",
  "94520": "06013",
  "94549": "06013",
  // San Jose — Santa Clara
  "95110": "06085",
  "95112": "06085",
  "95116": "06085",
  "95125": "06085",
  "95126": "06085",
  "95128": "06085",
  "95129": "06085",
  "94086": "06085",
  "95050": "06085",
  "94301": "06085",
  "94306": "06085",
  "94040": "06085",
  "95014": "06085",
  "95008": "06085",
  "95030": "06085",
  "95035": "06085",
};

/** County FIPS present in sandbox metros */
export const SANDBOX_COUNTY_FIPS = [
  ...new Set(Object.values(ZIP_TO_COUNTY)),
] as const;

/** States with sandbox county coverage */
export const SANDBOX_COUNTY_STATES = ["VA", "MD", "DC", "FL", "CA"] as const;

export const COUNTY_FIPS_TO_NAME: Record<string, string> = {
  "11001": "District of Columbia",
  "51013": "Arlington",
  "51510": "Alexandria",
  "24031": "Montgomery",
  "12095": "Orange",
  "12097": "Osceola",
  "06075": "San Francisco",
  "06001": "Alameda",
  "06013": "Contra Costa",
  "06085": "Santa Clara",
};

/** Sandbox county FIPS → nearest metro shard CBSA */
export const COUNTY_FIPS_TO_CBSA: Record<string, string> = {
  "11001": "47900",
  "51013": "47900",
  "51510": "47900",
  "24031": "47900",
  "12095": "36740",
  "12097": "36740",
  "06075": "41860",
  "06001": "41860",
  "06013": "41860",
  "06085": "41940",
};

export function sandboxCbsaForCounty(countyFips: string): string | null {
  return COUNTY_FIPS_TO_CBSA[countyFips] ?? null;
}

/** Validate every sandbox ZIP has a county mapping */
for (const zip of ALL_SANDBOX_ZIPS) {
  if (!ZIP_TO_COUNTY[zip]) {
    throw new Error(`Missing ZIP_TO_COUNTY entry for sandbox ZIP ${zip}`);
  }
}
