import proj4 from "proj4";
proj4.defs(
  "EPSG:2154",
  "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
);
export const proj4326 = proj4.defs("EPSG:4326");
export const proj3857 = proj4.defs("EPSG:3857");
export const proj2154 = proj4.defs("EPSG:2154");

export const CAMERA_POSITION = "cameraPosition";
export const TARGET_POSITION = "targetPosition";
export const BUILDING_HEIGHT = "buildingHeight";
export const BUILDING_ALPHA = "buildingAlpha";
export const CAMERA_POSITION_X = "cameraPositionX";
export const CAMERA_POSITION_Y = "cameraPositionY";
export const CAMERA_POSITION_Z = "cameraPositionZ";
export const TARGET_POSITION_X = "targetPositionX";
export const TARGET_POSITION_Y = "targetPositionY";
export const TARGET_POSITION_Z = "targetPositionZ";
export const COUPLED = "Coupled";
export const NOT_COUPLED = "Not Coupled";

export const PLAN_IGN = "GEOGRAPHICALGRIDSYSTEMS.PLANIGN";
export const PLAN_IGN_2 = "GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2";
export const SCAN = "GEOGRAPHICALGRIDSYSTEMS.MAPS.SCAN-EXPRESS.STANDARD";
export const SLOPES = "GEOGRAPHICALGRIDSYSTEMS.SLOPES.MOUNTAIN";
export const BDUNI = "GEOGRAPHICALGRIDSYSTEMS.MAPS.BDUNI.J1";
export const ORTHO = "ORTHOIMAGERY.ORTHOPHOTOS";

export enum INTERACTION_MODE {
  CAMERA_COUPLED,
  GO_TO,
  DRAG_GO,
}

export enum LAYERS_NAMES {
  BUILDINGS,
  ROADS,
}

export enum FEATURES_SOURCE {
  VECTOR_TILES,
  WFS,
}

export interface Layer {
  name: string;
  colors: any;
}
