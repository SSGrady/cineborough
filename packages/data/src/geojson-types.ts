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

export interface TransitPathProperties {
  name: string;
  type: string;
  zip?: string;
}

export interface TransitPathFeature {
  type: "Feature";
  properties: TransitPathProperties;
  geometry: {
    type: "LineString";
    coordinates: [number, number][];
  };
}

export interface TransitPathCollection {
  type: "FeatureCollection";
  features: TransitPathFeature[];
}
