import { VTController } from "./VTController";
import { IGN_STYLES } from "./OLViewer";
import { RENDER_MODE, GraphicParams } from "./VTThreeViewer";
import { FEATURES_SOURCE } from "./Constants";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { VRButton } from "three/examples/jsm/webxr/VRButton.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const width = window.innerWidth;
const height = window.innerHeight;
const zoom = 17;
const olFactor = 1;

let center = [259909, 6249540];
let centerZ = 0;

let controller = new VTController(
  width,
  height,
  center,
  centerZ,
  zoom,
  olFactor,
  [],
  [IGN_STYLES.PLAN],
  RENDER_MODE.SINGLE,
  FEATURES_SOURCE.WFS
);

let startGraphicParams: GraphicParams = {
  planeTexture: IGN_STYLES.PLAN,
  layerParams: new Map(),
};

controller.init(center, zoom).then(() => {
  controller.setInitialGraphicParams(startGraphicParams);
  let controls = new OrbitControls(
    controller.threeViewer.currentCamera,
    controller.threeViewer.renderer.domElement
  );
  controls.target.set(0, 0, 0);
  controls.update();
  controller.threeViewer.animate();
});
