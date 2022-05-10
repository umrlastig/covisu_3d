import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
import { OrbitCamera } from "./OrbitCamera";
// import { PlanarControls } from "./controls/PlanarControlsLiteXState";
// import { StreetControls } from "./controls/StreetControlsXState";
import * as Utils from "./Utils";
import { IGN_STYLES } from "./OLViewer";
import vert from "./shaders/basic_tex_vert.glsl";
import frag from "./shaders/mix_textures.glsl";
import fragTextColor from "./shaders/mix_color_texture.glsl";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export enum RENDER_MODE {
  MERGED,
  SINGLE,
}

export enum CONTROLS_TYPE {
  PLANAR,
  STREET,
}

export enum MATERIAL_TYPE {
  MIX_TWO_TEXTURES,
  MIX_TEXTURE_COLOR,
  COLOR,
  TEXTURE,
}

export interface GraphicParams {
  //planeMaterial: THREE.Material;
  planeTexture: IGN_STYLES;
  //planeColor: any;
  buildingsHeight: number;
  buildingsOpacity: number;
  //colorBuildings: any;
}

let graphicParams = {
  planeTexture: null,
  planeMaterial: null,
  planeColor: null,
  buildingsHeight: 0,
  buildingsOpacity: 0,
  colorBuildings: 0,
};

let ids = [];
export class VTThreeViewer {
  perspectiveCamera: THREE.PerspectiveCamera;
  orthoCamera: THREE.OrthographicCamera;
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  width: number;
  height: number;
  controls: any;
  currentCamera: THREE.Camera;
  //planes: THREE.Group;
  planes: THREE.Mesh[];
  featuresGroup: Map<string, THREE.Mesh[]>;
  featuresAllGroup: THREE.Mesh[];
  zoomFactor: any;
  mapCenter: any;
  rayCaster: THREE.Raycaster;
  orbitCamera: OrbitCamera;
  clock: THREE.Clock;
  animationClock: THREE.Clock;
  interactionClock: THREE.Clock;
  cameraListeners: any[];
  controlsMap: Map<CONTROLS_TYPE, any>;
  materialsMap: Map<MATERIAL_TYPE, THREE.Material>;
  startCameraPosition: THREE.Vector3;
  startCameraQuaternion: THREE.Quaternion;
  sceneGroup: THREE.Group;
  //graphicParams: GraphicParams;
  constructor(
    width: number,
    height: number,
    backgroundColor,
    mapCenter,
    zoomFactor
  ) {
    this.width = width;
    this.height = height;
    this.mapCenter = mapCenter;
    this.zoomFactor = zoomFactor;
    //this.planes = new THREE.Group();
    this.planes = [];
    this.featuresAllGroup = [];
    this.featuresGroup = new Map();
    this.controlsMap = new Map();
    this.clock = new THREE.Clock();
    this.animationClock = new THREE.Clock();
    console.log("animationClock", this.animationClock);
    this.animationClock.autoStart = false;
    this.interactionClock = new THREE.Clock();
    this.interactionClock.autoStart = false;
    this.materialsMap = new Map();
    this.rayCaster = new THREE.Raycaster();
    this.startCameraPosition = new THREE.Vector3();
    this.startCameraQuaternion = new THREE.Quaternion();
    this.sceneGroup = new THREE.Group();
    //this.graphicParams = graphicParams;
    this.cameraListeners = [];
    this.animate = this.animate.bind(this);
    this.getRealCoords = this.getRealCoords.bind(this);
    this.getWorldCoords = this.getWorldCoords.bind(this);
    this.render = this.render.bind(this);
    this.onWindowResize = this.onWindowResize.bind(this);
    this.initThree(backgroundColor);
    this.addHemisphereLights();
  }

  initThree(backgroundColor) {
    let container = document.createElement("div");
    document.body.appendChild(container);
    this.renderer = new THREE.WebGLRenderer({
      logarithmicDepthBuffer: true,
      antialias: true,
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    //this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);
    // document.body.appendChild(this.renderer.domElement);
    // this.renderer.domElement.style.position = "absolute";
    // this.renderer.domElement.style.top = "0px";

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(backgroundColor);
    let perspectiveValue = 75;
    var depht_s = Math.tan(((perspectiveValue / 2.0) * Math.PI) / 180.0) * 2.0;
    let z = this.height / depht_s;

    this.renderer.xr.enabled = true;

    this.orthoCamera = new THREE.OrthographicCamera(
      this.width / -2,
      this.width / 2,
      this.height / 2,
      this.height / -2,
      1,
      1000
    );
    this.orthoCamera.position.set(0, 0, z);

    this.perspectiveCamera = new THREE.PerspectiveCamera(
      perspectiveValue,
      this.width / this.height,
      1,
      1000000
    );

    this.perspectiveCamera.up.set(0, 0, 1);

    this.perspectiveCamera.position.set(0, 0, 20);
    this.orbitCamera = new OrbitCamera(this.perspectiveCamera);
    this.currentCamera = this.perspectiveCamera;
    this.scene.add(this.currentCamera);
    this.scene.add(this.sceneGroup);

    // let planarControls = new PlanarControls(
    //   this.perspectiveCamera,
    //   this.renderer,
    //   [...this.featuresAllGroup, ...this.planes.children]
    // );
    // //planarControls.enabled = false;
    // this.controlsMap.set(CONTROLS_TYPE.PLANAR, planarControls);

    // let streetControls = new StreetControls(
    //   this.perspectiveCamera,
    //   this.renderer,
    //   this.scene
    // );
    // //streetControls.enabled = false;
    // this.controlsMap.set(CONTROLS_TYPE.STREET, streetControls);

    this.createMaterials();
    window.addEventListener("resize", this.onWindowResize);
  }

  setSceneForXR() {
    this.sceneGroup.position.z = -2;
    this.sceneGroup.rotateX(-Math.PI / 2);
    this.sceneGroup.scale.set(0.001, 0.001, 0.001);
    this.renderer.outputEncoding = THREE.sRGBEncoding;
  }

  addHemisphereLights() {
    var light = new THREE.HemisphereLight(0xf1ecdb, 0x777788, 1);
    light.position.set(5, 7.5, 10);
    this.scene.add(light);
  }

  createPlane(width, height, center, centerZ) {
    var geometry = new THREE.PlaneBufferGeometry(width, height, 100);
    var material = new THREE.MeshBasicMaterial({
      transparent: true,
      //color: 0xffff00
    });
    material.depthWrite = false;
    var plane = new THREE.Mesh(geometry, material);

    plane.position.set(center[0], center[1], 0);

    this.currentCamera.position.setX(center[0]);
    this.currentCamera.position.setY(center[1]);

    // for full screen
    if (this.currentCamera == this.perspectiveCamera) {
      let vFov = (this.perspectiveCamera.fov * Math.PI) / 180;
      let zPerspective = Utils.distanceToFitObjectToView(
        this.perspectiveCamera.aspect,
        vFov,
        width,
        height
      );
      this.currentCamera.position.setZ(zPerspective);
      this.startCameraPosition = this.currentCamera.position.clone();
      this.startCameraQuaternion = this.currentCamera.quaternion.clone();
    }
    this.planes.push(plane);
    this.sceneGroup.add(plane);
  }

  setPlaneTexture(texture: THREE.Texture) {
    for (let plane of this.planes) {
      plane.material.map = texture;
      plane.material.transparent = false;
      if (texture != null) {
        plane.material.map.anisotropy = 0;
        plane.material.map.magFilter = THREE.LinearFilter;
        plane.material.map.minFilter = THREE.LinearFilter;
        plane.material.needsUpdate = true;
      }
    }
  }

  setPlaneColor(color: any) {
    for (let plane of this.planes) {
      plane.material.color.setHex(color);
    }
  }

  setPlaneMaterialType(material: MATERIAL_TYPE) {
    for (let plane of this.planes) {
      plane.material = this.materialsMap.get(material);
    }
  }

  setPlaneMaterial(material: THREE.Material) {
    for (let plane of this.planes) {
      plane.material = material;
    }
  }

  addFeatures(
    features: any[],
    mapCenter,
    zoomFactor,
    layer,
    renderMode: RENDER_MODE,
    transform: any,
    centerZ: number,
    buildingsColor: number[],
    getGeometry: any,
    getCoordinates: any,
    getProperties: any
  ) {
    this.mapCenter = mapCenter;
    this.zoomFactor = zoomFactor;
    let material = new THREE.MeshStandardMaterial({
      color: 0xf1ecdb,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    var extrudeSettings = {
      steps: 2,
      depth: 1,
      bevelEnabled: false,
      bevelThickness: 1,
      bevelSize: 0,
      bevelOffset: 0,
      bevelSegments: 1,
    };
    if (!this.featuresGroup.has(layer)) {
      this.featuresGroup.set(layer, []);
    }
    // if (!this.featuresTexturedGroup.has(layer)) {
    //   this.featuresTexturedGroup.set(layer, new THREE.Group());
    //   this.scene.add(this.featuresTexturedGroup.get(layer));
    // }
    if (renderMode == RENDER_MODE.MERGED) {
      let geometries = [];
      for (let feature of features) {
        // if (
        //   feature.getProperties().hauteur != undefined &&
        //   feature.getProperties().hauteur > 0
        // ) {
        geometries.push(
          this.createGeometryForMergedMesh(
            feature,
            zoomFactor,
            extrudeSettings,
            transform
          )
        );
        // }
      }
      const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(
        geometries,
        false
      );
      const mesh = new THREE.Mesh(mergedGeometry, material);

      if (mesh != null) {
        this.featuresGroup.get(layer).push(mesh);
        this.sceneGroup.add(mesh);
      }
      this.featuresAllGroup.push(mesh);
      //mesh.scale.set(2, 2, 1);
    } else if (renderMode == RENDER_MODE.SINGLE) {
      for (let feature of features) {
        this.addFeature(
          feature,
          layer,
          transform,
          buildingsColor,
          getGeometry,
          getCoordinates,
          getProperties
        );
      }
    }
  }

  createGeometryForMergedMesh(
    feature: any,
    zoomFactor,
    extrudeSettings,
    transform
  ) {
    let coords = feature.getGeometry().getCoordinates()[0];
    let points = [];

    for (let coordinate of coords) {
      // let x = (coordinate[0] - mapCenter[0]) / zoomFactor;
      // let y = (coordinate[1] - mapCenter[1]) / zoomFactor;
      // points.push(new THREE.Vector2(x, y));
      let transformedCoords = transform(coordinate);
      points.push(
        new THREE.Vector2(transformedCoords[0], transformedCoords[1])
      );
    }
    let threeShape = new THREE.Shape(points);
    for (let j = 1; j < feature.getGeometry().getCoordinates().length; j++) {
      let holeCoords = [];
      for (let coordinate of feature.getGeometry().getCoordinates()[j]) {
        // let x = (coordinate[0] - mapCenter[0]) / zoomFactor;
        // let y = (coordinate[1] - mapCenter[1]) / zoomFactor;
        // holeCoords.push(new THREE.Vector2(x, y));
        let transformedCoords = transform(coordinate);
        holeCoords.push(
          new THREE.Vector2(transformedCoords[0], transformedCoords[1])
        );
      }
      let holeShape = new THREE.Shape(holeCoords);
      threeShape.holes.push(holeShape);
    }

    var shapegeometry = new THREE.ExtrudeBufferGeometry(threeShape, {
      ...extrudeSettings,
      depth:
        feature.getProperties().hauteur != undefined
          ? feature.getProperties().hauteur / zoomFactor
          : 0,
    });
    // shapegeometry.computeBoundingBox();
    // var center = new THREE.Vector3();
    // shapegeometry.boundingBox.getCenter(center);
    // shapegeometry.center();

    // shapegeometry.translate(0, 0, 0.5);
    // shapegeometry.verticesNeedUpdate = true;
    return shapegeometry;
  }

  addFeature(
    feature: any,
    layer,
    transform,
    buildingsColor: number[],
    getGeometry,
    getCoordinates,
    getProperties
  ) {
    let material = new THREE.MeshStandardMaterial({
      color: 0xf1ecdb,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    material.transparent = true;
    //material.wireframe = true;

    material.opacity = 1;

    var extrudeSettings = {
      steps: 2,
      depth: 1,
      bevelEnabled: false,
      bevelThickness: 1,
      bevelSize: 0,
      bevelOffset: 0,
      bevelSegments: 1,
    };
    // let coords = [];
    // if (feature.getGeometry != null) {
    //   coords = feature.getGeometry().getCoordinates()[0];
    // } else {
    //   coords = feature.geometry.coordinates[0];
    // }
    let coords = getCoordinates(getGeometry(feature))[0];

    if (Array.isArray(coords[0][0])) {
      coords = coords[0];
    }
    let points = [];

    for (let coordinate of coords) {
      let transformedCoords = transform(coordinate);
      points.push(
        new THREE.Vector2(transformedCoords[0], transformedCoords[1])
      );
    }
    let threeShape = new THREE.Shape(points);
    // let length = 0;
    // if (feature.getGeometry != null) {
    //   length = feature.getGeometry().getCoordinates().length;
    // } else {
    //   length = feature.geometry.coordinates.length;
    // }
    let length = getCoordinates(getGeometry(feature)).length;
    //console.log("length", getCoordinates(getGeometry(feature))[0].length);
    for (let j = 1; j < length; j++) {
      let holeCoords = [];
      let coords = getCoordinates(getGeometry(feature))[j];
      // if (feature.getGeometry != null) {
      //   coords = feature.getGeometry().getCoordinates()[j];
      // } else {
      //   coords = feature.geometry.coordinates[j];
      // }
      if (Array.isArray(coords[0][0])) {
        coords = coords[0];
      }
      for (let coordinate of coords) {
        let transformedCoords = transform(coordinate);
        holeCoords.push(
          new THREE.Vector2(transformedCoords[0], transformedCoords[1])
        );
      }
      let holeShape = new THREE.Shape(holeCoords);
      threeShape.holes.push(holeShape);
    }

    var shapegeometry = new THREE.ExtrudeBufferGeometry(
      threeShape,
      extrudeSettings
    );
    shapegeometry.computeBoundingBox();
    var center = new THREE.Vector3();
    shapegeometry.boundingBox.getCenter(center);
    shapegeometry.center();

    shapegeometry.translate(0, 0, 0.5);
    shapegeometry.verticesNeedUpdate = true;

    // var geo = new THREE.EdgesGeometry(shapegeometry); // or WireframeGeometry( geometry )
    // var mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 200 });
    // var wireframe = new THREE.LineSegments(geo, mat);
    //this.scene.add( wireframe );

    var mesh = new THREE.Mesh(shapegeometry, material);
    //mesh.add(wireframe);

    mesh.position.copy(center);

    mesh.scale.set(1, 1, getProperties(feature).hauteur);

    mesh.renderOrder = 2;
    mesh.userData["height"] = getProperties(feature).hauteur;
    if (buildingsColor != null && buildingsColor.length > 0) {
      mesh.userData["color"] =
        buildingsColor[Math.floor(Math.random() * buildingsColor.length)];
    }

    //this should be devided by scale
    mesh.position.setZ(0.1);

    this.featuresGroup.get(layer).push(mesh);
    this.featuresAllGroup.push(mesh);
    this.sceneGroup.add(mesh);

    // let cloned = mesh.clone();
    // cloned.renderOrder = 1;
    // cloned.scale.set(1, 1, feature.getProperties().hauteur * 1.5);
    // this.featuresTexturedAllGroup.push(cloned);
    // this.featuresTexturedGroup.get(layer).add(cloned);
  }

  createTextureFromCanvas(canvas: HTMLCanvasElement) {
    var texture = new THREE.CanvasTexture(canvas);
    //var texture = new THREE.Texture(canvas);
    texture.anisotropy = 0;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    //this is needed to the texture will be stored, because it is updated only when its used
    //this.setPlaneTexture(texture);
    return texture;
  }

  createMaterials() {
    let uniformsArray = [];
    let uniforms = {
      fromTexture: { type: "t", value: null },
      toTexture: { type: "t", value: null },
      t: { type: "f", value: 0 },
    };
    uniformsArray.push(uniforms);
    const mixMaterial = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: uniforms,
    });
    this.materialsMap.set(MATERIAL_TYPE.MIX_TWO_TEXTURES, mixMaterial);

    let uniformsMixColor = {
      tex: { type: "t", value: null },
      color: { value: null },
      t: { type: "f", value: 0 },
    };
    const mixColorMaterial = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: fragTextColor,
      uniforms: uniformsMixColor,
    });
    this.materialsMap.set(MATERIAL_TYPE.MIX_TEXTURE_COLOR, mixColorMaterial);
    this.materialsMap.set(
      MATERIAL_TYPE.TEXTURE,
      new THREE.MeshBasicMaterial({
        transparent: true,
      })
    );
    this.materialsMap.set(
      MATERIAL_TYPE.COLOR,
      new THREE.MeshStandardMaterial({
        color: 0xf1ecdb,
        flatShading: true,
        side: THREE.DoubleSide,
      })
    );
  }

  getIntersectionPoint(x, y) {
    this.rayCaster.setFromCamera(new THREE.Vector2(x, y), this.currentCamera);
    var intersects = this.rayCaster.intersectObjects(this.planes);
    if (intersects[0] != null) {
      return intersects[0].point;
    } else {
      return null;
    }
  }

  getIntersectionPointPlane(x, y, plane) {
    this.rayCaster.setFromCamera(new THREE.Vector2(x, y), this.currentCamera);
    let target = new THREE.Vector3();
    this.rayCaster.ray.intersectPlane(plane, target);
    return target;
  }

  getIntersectionPointPlaneCamera(x, y, plane, camera) {
    this.rayCaster.setFromCamera(new THREE.Vector2(x, y), camera);
    let target = new THREE.Vector3();
    this.rayCaster.ray.intersectPlane(plane, target);
    return target;
  }

  getIntersectionPointRaycaster(
    x,
    y,
    rayCaster: THREE.Raycaster,
    camera: THREE.Camera
  ) {
    rayCaster.setFromCamera(new THREE.Vector2(x, y), camera);
    var intersects = rayCaster.intersectObjects(this.planes);
    if (intersects[0] != null) {
      return intersects[0].point;
    } else {
      return null;
    }
  }

  getWorldCoords(coords) {
    let x = (coords[0] - this.mapCenter[0]) / this.zoomFactor;
    let y = (coords[1] - this.mapCenter[1]) / this.zoomFactor;
    return [x, y];
  }

  getRealCoords(coords) {
    let x = coords[0] * this.zoomFactor + this.mapCenter[0];
    let y = coords[1] * this.zoomFactor + this.mapCenter[1];
    return [x, y];
  }

  addCameraListener(listener) {
    this.cameraListeners.push(listener);
  }

  animate() {
    this.renderer.setAnimationLoop(this.render);
  }

  render() {
    for (let listener of this.cameraListeners) {
      listener(this.currentCamera, this.animationClock);
    }
    this.renderer.render(this.scene, this.currentCamera);
  }

  enableControls() {
    this.controls.enabled = true;
  }

  disableControls() {
    this.controls.enabled = false;
  }

  onWindowResize() {
    if (this.currentCamera == this.perspectiveCamera) {
      this.currentCamera.aspect = window.innerWidth / window.innerHeight;
      this.currentCamera.updateProjectionMatrix();

      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  resetCamera() {
    this.currentCamera.position.set(
      this.startCameraPosition.x,
      this.startCameraPosition.y,
      this.startCameraPosition.z
    );
    this.currentCamera.quaternion.copy(this.startCameraQuaternion);
  }
}
