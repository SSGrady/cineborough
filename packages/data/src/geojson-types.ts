export interface ZipBoundaryProperties {
  zip: string;
  name: string;
}

export interface ZipBoundaryFeature {
  type: "Feature";
  properties: ZipBoundaryProperties;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export interface ZipBoundaryCollection {
  type: "FeatureCollection";
  features: ZipBoundaryFeature[];
}
