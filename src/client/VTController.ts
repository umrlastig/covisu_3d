import {
  VTThreeViewer,
  RENDER_MODE,
  GraphicParams,
  MATERIAL_TYPE,
} from "./VTThreeViewer";
import { OLViewer, IGN_STYLES } from "./OLViewer";
import { ZOOM_RES_L93 } from "./Utils";
import { proj3857, proj4326, FEATURES_SOURCE, Layer } from "./Constants";
import proj4 from "proj4";
import GeoportalWfsClient from "../libs/geoportal-wfs-client-master/dist/geoportal-wfs-client.js";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
export class VTController {
  threeViewer: VTThreeViewer;
  olViewer: OLViewer;
  renderer: THREE.WebGLRenderer;
  width: number;
  height: number;
  center: number[];
  centerZ: number;
  olFactor: number;
  renderMode: RENDER_MODE;
  backgroundColor: any;
  state: any;
  layers: Layer[];
  features: Map<string, Map<number, any>>;
  textures: Map<IGN_STYLES, THREE.Texture>;
  styles: IGN_STYLES[];
  scale: number;
  source: FEATURES_SOURCE;
  constructor(
    width: number,
    height: number,
    center,
    centerZ,
    zoom: number,
    olFactor: number,
    layers: Layer[],
    styles: IGN_STYLES[],
    renderMode: RENDER_MODE,
    source: FEATURES_SOURCE
  ) {
    this.width = width;
    this.height = height;
    this.center = center;
    this.centerZ = centerZ;
    this.olFactor = olFactor;
    this.layers = layers;
    this.styles = styles;
    this.renderMode = renderMode;
    this.backgroundColor = 0xffffff;
    this.state = { loading: 0 };
    this.features = new Map();
    this.loadTileFeatures = this.loadTileFeatures.bind(this);
    this.textures = new Map();
    this.source = source;
  }

  async init(center: number[], zoom: number) {
    return new Promise((resolve, reject) => {
      this.threeViewer = new VTThreeViewer(
        this.width,
        this.height,
        this.backgroundColor,
        center,
        ZOOM_RES_L93[zoom]
      );
      this.olViewer = new OLViewer(
        this.width,
        this.height,
        center,
        zoom,
        this.styles,
        this.olFactor
      );

      let extent = this.olViewer.map.getView().calculateExtent();
      this.threeViewer.createPlane(
        extent[2] - extent[0],
        extent[3] - extent[1],
        [0, 0],
        this.centerZ
      );

      console.log(proj4(proj3857, proj4326, [extent[0], extent[1]]));
      console.log(proj4(proj3857, proj4326, [extent[2], extent[3]]));
      let self = this;

      this.olViewer.addEndBaseListener((canvas, domElement, style) => {
        console.log("end base listener", style);
        this.textures.set(
          style,
          this.threeViewer.createTextureFromCanvas(canvas)
        );
        self.state.loading = 0;
      });
      this.olViewer.addTexturesListener((style, canvas) => {
        console.log("textures listener", style);
        this.textures.set(
          style,
          this.threeViewer.createTextureFromCanvas(canvas)
        );
      });

      this.olViewer.addEndAllListener(() => {
        if (self.source == FEATURES_SOURCE.VECTOR_TILES) {
          resolve();
        } else if (self.source == FEATURES_SOURCE.WFS) {
          if (self.layers.length == 0) {
            resolve();
          } else {
            for (let layer of self.layers) {
              self.createWFSClient(extent, layer).then(() => {
                resolve();
              });
            }
          }
          //this will work only for one layer have to fix for multiple layers
        }
      });

      this.olViewer.layer.getSource().on("tileloadstart", function (evt) {
        self.state.loading++;
      });
      if (self.source == FEATURES_SOURCE.VECTOR_TILES) {
        this.olViewer.layer
          .getSource()
          .on("tileloadend", this.loadTileFeatures);
      }
    });
  }

  createWFSClient(extent, layer) {
    return new Promise((resolve, error) => {
      let lowerCorner = proj4(proj3857, proj4326, [extent[0], extent[1]]);
      let upperCorner = proj4(proj3857, proj4326, [extent[2], extent[3]]);
      let bbox = [
        lowerCorner[0],
        lowerCorner[1],
        upperCorner[0],
        upperCorner[1],
      ];
      var options = {
        //apiKey: "choisirgeoportail",
        //apiKey: "3ht7xcw6f7nciopo16etuqp2",
        //defaultGeomFieldName: "geometrie",
        //apiKey: "3jt7xcw6f7nciopo16etuqp2",
        apiKey: "essentiels",
      };
      var client = new GeoportalWfsClient(options);
      var params = {
        bbox: bbox,
      };
      let layers = [
        // "BDTOPO_BDD_WLD_WGS84G:bati_indifferencie",
        // "BDTOPO_BDD_WLD_WGS84G:bati_remarquable",
        //"BDTOPO_V3:batiment",
        layer.name,
      ];
      let self = this;
      let i = 0;
      for (let layerWFS of layers) {
        client
          .getFeatures(layerWFS, params)
          .then(function (featureCollection) {
            console.log(featureCollection);
            self.threeViewer.addFeatures(
              featureCollection.features,
              self.olViewer.map.getView().getCenter(),
              ZOOM_RES_L93[self.olViewer.map.getView().getZoom()],
              layerWFS,
              self.renderMode,
              (coords) => {
                let coords3857 = proj4(proj4326, proj3857, coords);
                return [
                  coords3857[0] - self.center[0],
                  coords3857[1] - self.center[1],
                ];
              },
              self.centerZ,
              layer.colors,
              (feature) => feature.geometry,
              (geometry) => geometry.coordinates[0],
              (feature) => feature.properties
            );
            i++;
            if (i == layers.length) {
              resolve();
            }
          })
          .catch((error) => {
            console.log("error!", error);
          });
      }
    });
  }

  loadTileFeatures(evt) {
    var z = evt.tile.getTileCoord()[0];
    var features = evt.tile.getFeatures();
    //console.log("features! ", features);
    let layer = "";
    let self = this;
    let tileFeatures = new Map<String, any[]>();
    for (let feature of features) {
      for (let layerName of self.layers) {
        if (feature.getProperties().layer == layerName) {
          layer = feature.getProperties().layer;
          if (!self.features.has(layer)) {
            self.features.set(layer, new Map());
          }
          if (!tileFeatures.has(layer)) {
            tileFeatures.set(layer, []);
          }
          if (!self.features.get(layer).has(feature.ol_uid)) {
            if (feature.getProperties().hauteur > 0) {
              self.features.get(layer).set(feature.ol_uid, feature);
              tileFeatures.get(layer).push(feature);
            }
          }
        }
      }
    }
    tileFeatures.forEach((value, key) => {
      self.threeViewer.addFeatures(
        value,
        self.olViewer.map.getView().getCenter(),
        ZOOM_RES_L93[self.olViewer.map.getView().getZoom()],
        key,
        self.renderMode,
        (coords) => {
          return [coords[0] - this.center[0], coords[1] - this.center[1]];
        },
        this.centerZ,
        self.buildingsColors,
        (feature) => feature.getGeometry(),
        (geometry) => geometry.getCoordinates(),
        (feature) => feature.getProperties()
      );
    });

    self.state.loading--;
  }

  setInitialGraphicParams(graphicParams: GraphicParams) {
    this.threeViewer.setPlaneMaterialType(MATERIAL_TYPE.TEXTURE);
    this.threeViewer.setPlaneTexture(
      this.textures.get(graphicParams.planeTexture)
    );

    for (let feature of this.threeViewer.featuresAllGroup) {
      feature.material.opacity = graphicParams.buildingsOpacity;
      feature.scale.set(
        1,
        1,
        feature.userData.height * graphicParams.buildingsHeight
      );
    }
  }

  enableVR() {
    document.body.appendChild(VRButton.createButton(this.threeViewer.renderer));
  }

  enableAR() {
    document.body.appendChild(
      ARButton.createButton(this.threeViewer.renderer, {
        requiredFeatures: ["hit-test"],
      })
    );
  }

  render() {
    this.threeViewer.render();
  }
}
