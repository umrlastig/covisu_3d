import "ol/ol.css";
import olMap from "ol/Map";
import VectorTileLayer from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import View from "ol/View";
import { createXYZ } from "ol/tilegrid";
import MVT from "ol/format/MVT";
import * as olms from "ol-mapbox-style";
import Feature from "ol/Feature";
import stringify from "json-stringify-safe";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
proj4.defs(
  "EPSG:2154",
  "+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs"
);
register(proj4);
export enum IGN_STYLES {
  PLAN = "PLAN",
  GRIS = "GRIS",
  MUET = "MUET",
  TONER = "TONER"
}

let ignStyleMap = new Map();
ignStyleMap.set(
  IGN_STYLES.PLAN,
  "https://wxs.ign.fr/choisirgeoportail/static/vectorTiles/styles/PLAN.IGN/standard.json"
);
ignStyleMap.set(
  IGN_STYLES.GRIS,
  "https://wxs.ign.fr/choisirgeoportail/static/vectorTiles/styles/PLAN.IGN/gris.json"
);
ignStyleMap.set(
  IGN_STYLES.MUET,
  "https://wxs.ign.fr/choisirgeoportail/static/vectorTiles/styles/PLAN.IGN/sans_toponymes.json"
);

export class OLViewer {
  domElementsForLayers: Map<string, HTMLElement>;
  map: any;
  layer: any;
  domElement: HTMLElement;
  endBaseRenderListeners: any;
  texturesListeners: any[];
  endAllListeners: any[];
  constructor(width, height, center, zoom, styles, olFactor) {
    this.domElementsForLayers = new Map();
    this.endBaseRenderListeners = [];
    this.texturesListeners = [];
    this.endAllListeners = [];
    //we need to use first the first layer to load the features. We then use another dom element to load the other layers with rendered features
    this.createBaseMapElement(
      "olviewer",
      width,
      height,
      olFactor,
      center,
      zoom,
      styles
    );
  }

  async createBaseMapElement(
    id,
    width,
    height,
    olFactor,
    center,
    zoom,
    styles
  ) {
    let elements = this.createMapElement(
      id,
      width,
      height,
      olFactor,
      center,
      zoom,
      new MVT({ featureClass: Feature })
    );
    this.layer = elements.layer;
    this.domElement = elements.domElement;
    this.map = elements.map;
    let result = await this.applyStylePromise(
      styles[0],
      this.map,
      this.layer,
      this.domElement
    );
    for (let listener of this.endBaseRenderListeners) {
      listener(result.canvas, result.domElement, styles[0]);
    }
    await this.createMapTextures(width, height, olFactor, center, zoom, styles);
    for (let listener of this.endAllListeners) {
      listener();
    }
    // this.applyStyle(
    //   styles[0],
    //   this.map,
    //   this.layer,
    //   this.domElement,
    //   (canvas, domElement) => {
    //     for (let listener of this.endBaseRenderListeners) {
    //       listener(canvas, domElement, styles[0]);
    //       this.createMapTextures(width, height, olFactor, center, zoom, styles);
    //     }
    //   }
    // );
  }

  async createMapTextures(width, height, olFactor, center, zoom, styles) {
    for (let i = 1; i < styles.length; i++) {
      let elements = this.createMapElement(
        "secondary"+i,
        width,
        height,
        olFactor,
        center,
        zoom,
        new MVT()
      );
      const result = await this.applyStylePromise(
        styles[i],
        elements.map,
        elements.layer,
        elements.domElement
      );
      for (let listener of this.texturesListeners) {
        listener(styles[i], result.canvas);
      }
      console.log("result promise", result);
    }
  }

  createMapElement(id, width, height, olFactor, center, zoom, format) {
    let domElement = document.body.appendChild(document.createElement("div"));
    domElement.setAttribute("id", id);
    document.getElementById(id).style.visibility = "hidden";
    document.getElementById(id).style.width = width * olFactor + "px";
    document.getElementById(id).style.height = height * olFactor + "px";

    let map = new olMap({
      layers: [],
      //target: "map",
      target: id,
      view: new View({
        center: center,
        zoom: zoom
      })
    });

    let layer = new VectorTileLayer({
      title: "Plan IGN vecteur",
      source: new VectorTileSource({
        tilePixelRatio: 1,
        tileGrid: createXYZ({ maxZoom: 21 }),
        format: format,
        //projection: new Projection({ code: "EPSG:3857" }),
        url:
          "https://wxs.ign.fr/choisirgeoportail/geoportail/tms/1.0.0/PLAN.IGN/{z}/{x}/{y}.pbf"
      }),
      minResolution: 0,
      maxResolution: 200000,
      declutter: true
    });
    return { domElement: domElement, layer: layer, map: map };
  }

  async applyStylePromise(styleName, map, layer, domElement) {
    var defaultUrl = ignStyleMap.get(styleName);
    let response = await fetch(defaultUrl);
    let style = await response.json();

    await olms.applyStyle(layer, style, "plan_ign");
    if (
      !map
        .getLayers()
        .getArray()
        .includes(layer)
    ) {
      map.addLayer(layer);
    }

    return this.createEndEventPromise(map, layer, domElement);
  }

  addEndBaseListener(listener) {
    this.endBaseRenderListeners.push(listener);
  }

  addTexturesListener(listener) {
    this.texturesListeners.push(listener);
  }

  addEndAllListener(listener) {
    this.endAllListeners.push(listener);
  }

  createEndEventPromise(map: any, layer: any, domElement: any) {
    return new Promise((resolve, reject) => {
      let throwRenderComplete = false;
      let timeout = null;
      map.on("rendercomplete", function(data) {
        throwRenderComplete = throwRenderComplete ? false : true;
        if (timeout != null) {
          clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
          if (throwRenderComplete) {
            resolve({
              map: map,
              layer: layer,
              canvas: domElement.getElementsByTagName("canvas")[0],
              domElement
            });
          }
        }, 500);
      });
      layer.on("prerender", function(data) {
        //console.log("pre render!");
        throwRenderComplete = false;
      });
    });
  }
}
