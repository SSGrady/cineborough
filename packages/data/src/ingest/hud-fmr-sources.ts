export const HUD_FMR_ATTRIBUTION =
  "Fair Market Rent estimates from HUD User SAFMR bulk data (annual).";

export interface HudZipFmrRecord {
  zipCode: string;
  fmr2Br: number;
  fmr3Br: number;
}

export interface HudFmrNormalizedBundle {
  source: "hud-safmr-zip";
  attribution: string;
  downloadedAt: string;
  vintage: string;
  recordCount: number;
  records: Record<string, HudZipFmrRecord>;
}
