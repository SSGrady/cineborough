declare module "*.geojson" {
  const value: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      properties: Record<string, string>;
      geometry: {
        type: string;
        coordinates: number[][][] | [number, number][];
      };
    }>;
  };
  export default value;
}
