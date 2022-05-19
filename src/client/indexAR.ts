import covidDataJacques from "../../data/covid_data_jacques.json";
import covidDataMaxime from "../../data/data_maxime.json";
import { IGN_STYLES } from "./OLViewer2";
import proj4 from "proj4";
import { proj4326, proj3857, FEATURES_SOURCE } from "./Constants";
import {
  zoomValuesJacques,
  zoomValuesMaxime,
  zoomValuesMaximeAR,
} from "./ZoomValues";
import { VTController } from "./VTController";
import { RENDER_MODE, GraphicParams } from "./VTThreeViewer";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { SpatioTemporalCube } from "./STC";
import { HexagonGroup } from "./HexagonGroup";

const width = window.innerWidth; // this makes the 3D canvas full screen
const height = window.innerHeight; // this makes the 3D canvas full screen

let parisLatLon = [48.8534, 2.3488];
let parisCenter = proj4(proj4326, proj3857, [parisLatLon[1], parisLatLon[0]]);

const paramsCovid = {
  center: parisCenter,
  zoom: 16,
  layers: [],
  style: IGN_STYLES.PLAN,
};

let paramsJacques = {
  data: covidDataJacques,
  zoomValues: zoomValuesJacques,
  temporalScale: 300,
};

let paramsMaxime = {
  data: covidDataMaxime,
  zoomValues: zoomValuesMaximeAR,
  temporalScale: 500,
};

let paramsViz = paramsMaxime;

const zoom = 17;
const olFactor = 1;

let buildingColors = [0x594736];

let startGraphicParams: GraphicParams = {
  planeTexture: IGN_STYLES.PLAN,
  layerParams: new Map(),
};

let controller = new VTController(
  width,
  height,
  parisCenter,
  0,
  zoom,
  olFactor,
  [],
  [IGN_STYLES.PLAN],
  RENDER_MODE.SINGLE,
  FEATURES_SOURCE.WFS
);
let stc = null;
let startDataMaxime = "2021/08/16";
let infoPanel = document.getElementById("infoPanel");

const render = () => {
  controller.threeViewer.render();
  let dist = Math.sqrt(
    controller.threeViewer.currentCamera.position.x ** 2 +
      controller.threeViewer.currentCamera.position.y ** 2 +
      controller.threeViewer.currentCamera.position.z ** 2
  );
  stc.render(dist);
};

const animate = () => {
  controller.threeViewer.renderer.setAnimationLoop(render);
};

controller.init(parisCenter, paramsCovid.zoom).then(() => {
  //   controller.threeViewer.setPlaneTexture(
  //     controller.textures.get(IGN_STYLES.PLAN)
  //   );
  stc = new SpatioTemporalCube(
    paramsViz.data,
    startDataMaxime,
    controller,
    paramsViz.zoomValues,
    infoPanel,
    paramsViz.temporalScale
  );

  stc.hexGroups.forEach((hexagonGroup: HexagonGroup) => {
    hexagonGroup.group.position.z = -2;
    hexagonGroup.group.rotateX(-Math.PI / 2);
    hexagonGroup.group.scale.set(0.001, 0.001, 0.001);

    if (hexagonGroup.floorGroup != null) {
      hexagonGroup.floorGroup.position.z = -2;
      hexagonGroup.floorGroup.rotateX(-Math.PI / 2);
      hexagonGroup.floorGroup.scale.set(0.001, 0.001, 0.001);
    }
  });

  controller.setInitialGraphicParams(startGraphicParams);
  document.body.appendChild(
    ARButton.createButton(controller.threeViewer.renderer, {
      requiredFeatures: ["hit-test"],
    })
  );

  //controller.threeViewer.setSceneForXR();
  //   document.body.appendChild(
  //     VRButton.createButton(controller.threeViewer.renderer)
  //   );
  //render();
  animate();
});
