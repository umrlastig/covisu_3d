import proj4 from "proj4";
import { proj4326, proj3857 } from "./Constants";

import * as THREE from "three";
import * as Constants from "./Constants";
import { isObject } from "lodash";

export enum NEXT_POSITIONS {
  LEFT = "left",
  RIGHT = "right",
  UP = "up",
  DOWN = "down",
}

export const ZOOM_RES_L93 = [
  156543.033928041, 78271.5169640205, 39135.7584820102, 19567.8792410051,
  9783.9396205026, 4891.9698102513, 2445.9849051256, 1222.9924525628,
  611.4962262814, 305.7481131407, 152.8740565704, 76.4370282852, 38.2185141426,
  19.1092570713, 9.5546285356, 4.7773142678, 2.3886571339, 1.194328567,
  0.5971642835, 0.2985821417, 0.1492910709, 0.0746455354,
];

export async function getTilesA(bbox, callback) {
  let tileMatrixSetName = "PM";
  let tileMatrixIndex = 18;
  let url = new URL("https://wxs.ign.fr/choisirgeoportail/geoportail/wmts");
  var params = { service: "WMTS", request: "GetCapabilities" };
  let X0 = 0;
  let Y0 = 0;
  url.search = new URLSearchParams(params).toString();
  let response = await fetch(url);
  let data = await response.text();
  let parser = new DOMParser();
  let xml = parser.parseFromString(data, "application/xml");
  for (let tileMatrixSet of xml
    .getElementsByTagName("Contents")[0]
    .getElementsByTagName("TileMatrixSet")) {
    if (tileMatrixSet.children.length > 0) {
      for (let identifier of tileMatrixSet.getElementsByTagName(
        "ows:Identifier"
      )) {
        if (identifier.parentElement == tileMatrixSet) {
          if (identifier.textContent == tileMatrixSetName) {
            for (let tileMatrix of tileMatrixSet.getElementsByTagName(
              "TileMatrix"
            )) {
              let id = tileMatrix.getElementsByTagName("ows:Identifier")[0];
              if (parseInt(id.textContent) == tileMatrixIndex) {
                let values = tileMatrix
                  .getElementsByTagName("TopLeftCorner")[0]
                  .textContent.split(" ");
                X0 = parseFloat(values[0]);
                Y0 = parseFloat(values[1]);
                // let leftDownCorner = proj4(proj4326, proj3857, [bbox[0], bbox[1]])
                // let upperRightCorner = proj4(proj4326, proj3857, [bbox[2], bbox[3]])
                let leftDownCorner = [bbox[0], bbox[1]];
                let upperRightCorner = [bbox[2], bbox[3]];
                let minXGrid = leftDownCorner[0] - X0;
                let maxXGrid = upperRightCorner[0] - X0;
                let minYGrid = Y0 - leftDownCorner[1];
                let maxYGrid = Y0 - upperRightCorner[1];

                let tileSize = ZOOM_RES_L93[tileMatrixIndex] * 256;
                let tileRowMin = Math.floor(minYGrid / tileSize);
                let tileRowMax = Math.floor(maxYGrid / tileSize);
                let tileColMin = Math.floor(minXGrid / tileSize);
                let tileColMax = Math.floor(maxXGrid / tileSize);
                // requestTiles(
                //   tileRowMin,
                //   tileColMin,
                //   tileRowMax,
                //   tileColMax,
                //   tileSize,
                //   X0,
                //   Y0,
                //   tileMatrixIndex,
                //   tileMatrixSetName,
                //   callback
                // );
                requestTiles2(
                  tileRowMin,
                  tileColMin,
                  tileRowMax,
                  tileColMax,
                  tileSize,
                  X0,
                  Y0,
                  tileMatrixIndex,
                  tileMatrixSetName,
                  callback
                );
                return [
                  tileColMin * tileSize + X0,
                  Y0 - tileRowMin * tileSize,
                  tileColMax * tileSize + X0,
                  Y0 - tileRowMax * tileSize,
                ];
              }
            }
          }
        }
      }
    }
  }
}

export function getTiles(bbox, callback) {
  let tileMatrixSetName = "PM";
  let tileMatrixIndex = 18;
  let url = new URL("https://wxs.ign.fr/choisirgeoportail/geoportail/wmts");
  var params = { service: "WMTS", request: "GetCapabilities" };
  let X0 = 0;
  let Y0 = 0;
  url.search = new URLSearchParams(params).toString();
  fetch(url)
    .then(function (response) {
      return response.text();
    })
    .then(function (data) {
      let parser = new DOMParser();
      let xml = parser.parseFromString(data, "application/xml");
      for (let tileMatrixSet of xml
        .getElementsByTagName("Contents")[0]
        .getElementsByTagName("TileMatrixSet")) {
        if (tileMatrixSet.children.length > 0) {
          for (let identifier of tileMatrixSet.getElementsByTagName(
            "ows:Identifier"
          )) {
            if (identifier.parentElement == tileMatrixSet) {
              if (identifier.textContent == tileMatrixSetName) {
                for (let tileMatrix of tileMatrixSet.getElementsByTagName(
                  "TileMatrix"
                )) {
                  let id = tileMatrix.getElementsByTagName("ows:Identifier")[0];
                  if (parseInt(id.textContent) == tileMatrixIndex) {
                    let values = tileMatrix
                      .getElementsByTagName("TopLeftCorner")[0]
                      .textContent.split(" ");
                    X0 = parseFloat(values[0]);
                    Y0 = parseFloat(values[1]);
                    // let leftDownCorner = proj4(proj4326, proj3857, [bbox[0], bbox[1]])
                    // let upperRightCorner = proj4(proj4326, proj3857, [bbox[2], bbox[3]])
                    let leftDownCorner = [bbox[0], bbox[1]];
                    let upperRightCorner = [bbox[2], bbox[3]];
                    let minXGrid = leftDownCorner[0] - X0;
                    let maxXGrid = upperRightCorner[0] - X0;
                    let minYGrid = Y0 - leftDownCorner[1];
                    let maxYGrid = Y0 - upperRightCorner[1];

                    let tileSize = ZOOM_RES_L93[tileMatrixIndex] * 256;
                    let tileRowMin = Math.floor(minYGrid / tileSize);
                    let tileRowMax = Math.floor(maxYGrid / tileSize);
                    let tileColMin = Math.floor(minXGrid / tileSize);
                    let tileColMax = Math.floor(maxXGrid / tileSize);
                    requestTiles(
                      tileRowMin,
                      tileColMin,
                      tileRowMax,
                      tileColMax,
                      tileSize,
                      X0,
                      Y0,
                      tileMatrixIndex,
                      tileMatrixSetName,
                      callback
                    );
                    return [
                      tileColMin * tileSize + X0,
                      Y0 - tileRowMin * tileSize,
                      tileColMax * tileSize + X0,
                      Y0 - tileRowMax * tileSize,
                    ];
                  }
                }
              }
            }
          }
        }
      }
    });
}

async function requestTile(
  url: URL,
  layer: string,
  params,
  row: number,
  col: number
) {
  url.search = new URLSearchParams({
    ...params,
    layer: layer,
    tilerow: row,
    tilecol: col,
  }).toString();

  let responseScan = await fetch(url);
  let blobScan = await responseScan.blob();
  let objectURL = URL.createObjectURL(blobScan);
  return objectURL;
}

async function requestTileSet(
  url: URL,
  layers: string[],
  params,
  row: number,
  col: number
) {
  let promises = [];
  for (let layer of layers) {
    promises.push(requestTile(url, layer, params, row, col));
  }
  let tiles = await Promise.all(promises);
  return tiles;
}

async function requestTiles2(
  tileRowMin,
  tileColMin,
  tileRowMax,
  tileColMax,
  tileSize,
  X0,
  Y0,
  tileMatrixIndex,
  tileMatrixSetName,
  callback
) {
  let url = new URL("https://wxs.ign.fr/choisirgeoportail/geoportail/wmts");
  let layers = [Constants.SCAN, Constants.ORTHO];
  var params = {
    service: "WMTS",
    request: "GetTile",
    version: "1.0.0",
    style: "normal",
    tilematrixset: tileMatrixSetName,
    tilematrix: tileMatrixIndex,
    format: "image/jpeg",
  };
  let promises = [];
  for (let row = tileRowMax; row <= tileRowMin; row++) {
    for (let col = tileColMin; col <= tileColMax; col++) {
      promises.push(
        requestTileSet(url, layers, params, row, col).then((result) => {
          callback(
            [col * tileSize + X0, Y0 - row * tileSize],
            result,
            tileSize
          );
        })
      );
    }
  }
  await Promise.all(promises);
  return true;
}

async function requestTiles(
  tileRowMin,
  tileColMin,
  tileRowMax,
  tileColMax,
  tileSize,
  X0,
  Y0,
  tileMatrixIndex,
  tileMatrixSetName,
  callback
) {
  for (let row = tileRowMax; row <= tileRowMin; row++) {
    for (let col = tileColMin; col <= tileColMax; col++) {
      let url = new URL("https://wxs.ign.fr/choisirgeoportail/geoportail/wmts");
      let scanLayer = Constants.SCAN;
      let orthoLayer = "ORTHOIMAGERY.ORTHOPHOTOS";
      var params = {
        service: "WMTS",
        request: "GetTile",
        version: "1.0.0",
        //layer: scanLayer,
        style: "normal",
        tilematrixset: tileMatrixSetName,
        tilematrix: tileMatrixIndex,
        tilerow: row,
        tilecol: col,
        format: "image/jpeg",
      };
      url.search = new URLSearchParams({
        ...params,
        layer: scanLayer,
      }).toString();
      let responseScan = await fetch(url);
      let blobScan = await responseScan.blob();
      let scanObjectURL = URL.createObjectURL(blobScan);

      url.search = new URLSearchParams({
        ...params,
        layer: orthoLayer,
      }).toString();
      let responseOrtho = await fetch(url);
      let blobOrtho = await responseOrtho.blob();
      let orthoObjectURL = URL.createObjectURL(blobOrtho);

      callback(
        [col * tileSize + X0, Y0 - row * tileSize],
        [scanObjectURL, orthoObjectURL],
        tileSize
      );
      //let responseOrtho =
      //   fetch(url)
      //     .then(function(response) {
      //       return response.blob();
      //     })
      //     .then(function(myBlob) {
      //       console.log(myBlob);
      //       var scanObjectURL = URL.createObjectURL(myBlob);
      //       callback(
      //         [col * tileSize + X0, Y0 - row * tileSize],
      //         scanObjectURL,
      //         tileSize
      //       );
      //       //myImage.src = objectURL;
      //     });
    }
  }
}

//https://stackoverflow.com/questions/34156282/how-do-i-save-json-to-local-text-file
export function downloadJSON(content, fileName, contentType) {
  var a = document.createElement("a");
  var file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
}

export function getClosestObjectToPoint(
  point: THREE.Vector3,
  objects: THREE.Mesh[],
  directionClosest: NEXT_POSITIONS,
  directionView: THREE.Vector3
) {
  switch (directionClosest) {
    case NEXT_POSITIONS.RIGHT: {
      // let directionVector = new THREE.Vector3(
      //   directionView.y,
      //   -directionView.x,
      //   directionView.z
      // );
      let directionVector = new THREE.Vector3(
        directionView.y,
        -directionView.x,
        directionView.z
      );
      //let directionVector = new THREE.Vector3(1, 1, directionView.z);
      directionVector.normalize();
      let raycaster = new THREE.Raycaster();
      let delta = 0;
      let intersects = [];

      while (intersects.length == 0) {
        let origin = new THREE.Vector3(point.x, point.y + delta, 1);
        raycaster.set(origin, directionVector);
        intersects = raycaster.intersectObjects(objects);
        delta += 1;
      }
      return intersects[0].object;

      // if (intersects.length > 0) {
      //   console.log("intersecteeeeeeed");
      //   return intersects[0].object;
      // }
    }
  }
}

export function getObjectsOnRadius(
  point: THREE.Vector3,
  objects: THREE.Mesh[],
  radius: number
) {
  let closeObjects = [];
  for (let object of objects) {
    if (object.position.distanceTo(point) < radius) {
      closeObjects.push(object);
    }
  }
  return closeObjects;
}

export function interpolateVectors(
  vector1: THREE.Vector3,
  vector2: THREE.Vector3,
  t: number
) {
  let x = vector1.x * (1 - t) + vector2.x * t;
  let y = vector1.y * (1 - t) + vector2.y * t;
  let z = vector1.z * (1 - t) + vector2.z * t;
  return new THREE.Vector3(x, y, z);
}

//f(min)=a
//f(max) = b
//returns f(x)
export function interpolateFromTo(min, max, a, b, value) {
  if (max - min != 0) {
    return a + ((b - a) * (value - min)) / (max - min);
  } else {
    return a + (b - a) * (value - min);
  }
}

export function interpolateValue01(startValue, endValue, t) {
  return startValue * (1 - t) + endValue * t;
}

export function getCoordsFromKeyPoints(
  keyPointsCoords,
  keyPointsMap: Map<any, THREE.Vector3>,
  keyPoints
) {
  let result = { x: null, y: null, z: null };
  if (isObject(keyPointsCoords)) {
    for (let coord in keyPointsCoords) {
      for (let keyValue of Object.values(keyPoints)) {
        if (keyPointsCoords[coord] == keyValue) {
          result[coord] = keyPointsMap.get(keyValue)[coord];
        }
      }
    }
  } else {
    for (let keyValue of Object.values(keyPoints)) {
      if (keyPointsCoords == keyValue) {
        result["x"] = keyPointsMap.get(keyValue)["x"];
        result["y"] = keyPointsMap.get(keyValue)["y"];
        result["z"] = keyPointsMap.get(keyValue)["z"];
      }
    }
  }
  return result;
}

//from https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269
/**
 * Convert vertical field of view to horizontal field of view, given an aspect
 * ratio. See https://arstechnica.com/civis/viewtopic.php?f=6&t=37447
 *
 * @param vfov - The vertical field of view.
 * @param aspect - The aspect ratio, which is generally width/height of the viewport.
 * @returns - The horizontal field of view.
 */
function vfovToHfov(vfov: number, aspect: number): number {
  const { tan, atan } = Math;
  return atan(aspect * tan(vfov / 2)) * 2;
}

/**
 * Get the distance from the camera to fit an object in view by either its
 * horizontal or its vertical dimension.
 *
 * @param size - This should be the width or height of the object to fit.
 * @param fov - If `size` is the object's width, `fov` should be the horizontal
 * field of view of the view camera. If `size` is the object's height, then
 * `fov` should be the view camera's vertical field of view.
 * @returns - The distance from the camera so that the object will fit from
 * edge to edge of the viewport.
 */
function _distanceToFitObjectInView(size: number, fov: number): number {
  const { tan } = Math;
  return size / (2 * tan(fov / 2));
}

export function distanceToFitObjectToView(
  cameraAspect: number,
  cameraVFov: number,
  objWidth: number,
  objHeight: number
): number {
  const objAspect = objWidth / objHeight;
  const cameraHFov = vfovToHfov(cameraVFov, cameraAspect);

  let distance: number = 0;

  if (objAspect > cameraAspect) {
    distance = _distanceToFitObjectInView(objHeight, cameraVFov);
  } else if (objAspect <= cameraAspect) {
    distance = _distanceToFitObjectInView(objWidth, cameraHFov);
  }

  return distance;
}
