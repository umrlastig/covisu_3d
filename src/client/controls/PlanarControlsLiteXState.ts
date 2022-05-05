import * as THREE from "three";
import { send } from "xstate";
export const STATE = {
  NONE: -1,
  DRAG: 0,
  PAN: 1,
  ROTATE: 2,
  TRAVEL: 3,
  ORTHO_ZOOM: 4
};

const mouseButtons = {
  LEFTCLICK: THREE.MOUSE.LEFT,
  MIDDLECLICK: THREE.MOUSE.MIDDLE,
  RIGHTCLICK: THREE.MOUSE.RIGHT
};

interface TravelParams {
  endPos: THREE.Vector3;
  startPos: THREE.Vector3;
  startRot: THREE.Quaternion;
  endRot: THREE.Quaternion;
  alpha: number;
  duration: number;
  useRotation: boolean;
  useSmooth: boolean;
}

export class PlanarControls {
  camera: any;
  renderer: THREE.WebGLRenderer;
  state: any;
  target: THREE.Vector3;
  currentPressedButton: any;
  deltaMousePosition: THREE.Vector2;
  lastMousePosition: THREE.Vector2;
  mousePosition: THREE.Vector2;
  //orbit pan properties
  panEnd: THREE.Vector2;
  panDelta: THREE.Vector2;
  panStart: THREE.Vector2;
  panSpeed: number;
  panOffset: THREE.Vector3;
  //drag properties
  dragStart: THREE.Vector3;
  dragEnd: THREE.Vector3;
  dragDelta: THREE.Vector3;
  pointUnderCursor: THREE.Vector3;
  //rotation properties
  centerPoint: THREE.Vector3;
  phi: number;
  rotationVect: THREE.Vector3;
  rotationQuat: THREE.Quaternion;
  vect2: THREE.Vector2;
  vectorZero: THREE.Vector3;
  //orbit rotation properties
  rotateStart: THREE.Vector2;
  rotateEnd: THREE.Vector2;
  rotateDelta: THREE.Vector2;
  spherical: THREE.Spherical;
  sphericalDelta: THREE.Spherical;
  minPolarAngle: number;
  maxPolarAngle: number;
  //travel properties
  zoomTravelTime: number;
  travelParams: TravelParams;
  _handlerOnKeyDown: any;
  _handlerOnMouseDown: any;
  _handlerOnMouseUp: any;
  _handlerOnMouseMove: any;
  _handlerOnMouseWheel: any;
  _handlerContextMenu: any;
  floorPlane: THREE.Plane;
  raycaster: THREE.Raycaster;
  objects: THREE.Object3D[];
  groundLevel: number;
  maxAltitude: number;
  zoomInFactor: number;
  zoomOutFactor: number;
  enableRotation: boolean;
  instantTravel: boolean;
  autoTravelTimeMin: number;
  autoTravelTimeMax: number;
  autoTravelTimeDist: number;
  rotateSpeed: number;
  minZenithAngle: number;
  maxZenithAngle: number;
  enabled: boolean;
  constructor(camera, renderer, objects) {
    this.camera = camera;
    this.renderer = renderer;
    this.objects = objects;
    this.state = STATE.NONE;
    this.floorPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1));
    this.target = new THREE.Vector3();
    this.groundLevel = 0;
    this.maxAltitude = 1000;
    this.zoomInFactor = 2;
    this.zoomOutFactor = 1 / 2;
    this.zoomTravelTime = 0.2;
    this.autoTravelTimeMax = 4;
    this.autoTravelTimeMin = 1.5;
    this.autoTravelTimeDist = 50000;
    //this.rotateSpeed = 2;
    // this.minZenithAngle = 0;
    // this.maxZenithAngle = 82.5;
    this.rotateSpeed = 1;
    this.minZenithAngle = -Infinity;
    this.maxZenithAngle = Infinity;
    this.minPolarAngle = 0;
    this.maxPolarAngle = Math.PI / 2;
    this.instantTravel = false;
    this.enableRotation = true;
    this.enabled = true;
    this.deltaMousePosition = new THREE.Vector2(0, 0);
    this.lastMousePosition = new THREE.Vector2();
    this.mousePosition = new THREE.Vector2();
    this.dragStart = new THREE.Vector3();
    this.dragEnd = new THREE.Vector3();
    this.dragDelta = new THREE.Vector3(0, 0, 0);
    this.pointUnderCursor = new THREE.Vector3();
    this.centerPoint = new THREE.Vector3();
    this.phi = 0;
    this.rotationVect = new THREE.Vector3();
    this.rotationQuat = new THREE.Quaternion();
    this.vectorZero = new THREE.Vector3();
    this.rotateStart = new THREE.Vector2();
    this.rotateEnd = new THREE.Vector2();
    this.rotateDelta = new THREE.Vector2();
    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();
    this.panStart = new THREE.Vector2();
    this.panDelta = new THREE.Vector2();
    this.panEnd = new THREE.Vector2();
    this.panSpeed = 1;
    this.panOffset = new THREE.Vector3();
    this.travelParams = {
      endPos: new THREE.Vector3(),
      startPos: new THREE.Vector3(),
      startRot: new THREE.Quaternion(),
      endRot: new THREE.Quaternion(),
      alpha: 0,
      duration: 0,
      useRotation: false,
      useSmooth: false
    };
    this.raycaster = new THREE.Raycaster();
    this._handlerOnMouseDown = this.onMouseDown.bind(this);
    this._handlerOnMouseUp = this.onMouseUp.bind(this);
    this._handlerOnMouseMove = this.onMouseMove.bind(this);
    this._handlerOnMouseWheel = this.onMouseWheel.bind(this);
    this._handlerContextMenu = this.onContextMenu.bind(this);
    this._handlerOnKeyDown = this.onKeyDown.bind(this);
    //this.addInputListeners();
  }

  updateMousePositionAndDelta(event: MouseEvent) {
    this.mousePosition = this.getScreenCords(event);
    this.deltaMousePosition
      .copy(this.mousePosition)
      .sub(this.lastMousePosition);
    this.lastMousePosition.copy(this.mousePosition);
  }

  initiateDrag(event: MouseEvent) {
    this.updateMousePositionAndDelta(event);
    this.state = STATE.DRAG;
    this.dragStart.copy(this.getWorldPointAtScreenXY(this.mousePosition));
    this.dragDelta.set(0, 0, 0);

    //orbit
    this.panStart.set(event.clientX, event.clientY);
  }

  initiateZoom(event) {
    let delta = 0;
    if (undefined !== event.wheelDelta) {
      delta = event.wheelDelta;
    } else if (undefined !== event.detail) {
      delta = -event.detail;
    }

    this.pointUnderCursor.copy(
      this.getWorldPointAtScreenXY(this.mousePosition)
    );
    let newPos = new THREE.Vector3();

    if (delta > 0 || (delta < 0 && this.maxAltitude > this.camera.position.z)) {
      const zoomFactor = delta > 0 ? this.zoomInFactor : this.zoomOutFactor;
      newPos.lerpVectors(
        this.camera.position,
        this.pointUnderCursor,
        1 - 1 / zoomFactor
      );
      //console.log("new pos plane controls", newPos);
      this.initiateTravel(newPos, this.zoomTravelTime, null, false);
    }
  }

  initiateTravel(targetPos, travelTime, targetOrientation, useSmooth) {
    this.state = STATE.TRAVEL;
    this.travelParams.alpha = 0;
    this.travelParams.useRotation =
      this.enableRotation &&
      targetOrientation &&
      (targetOrientation.isQuaternion || targetOrientation.isVector3);
    this.travelParams.useSmooth = useSmooth;
    this.travelParams.startPos.copy(this.camera.position);
    this.travelParams.startRot.copy(this.camera.quaternion);

    if (this.travelParams.useRotation) {
      if (targetOrientation.isQuaternion) {
        this.travelParams.endRot.copy(targetOrientation);
      } else if (targetOrientation.isQuaternion) {
        if (targetPos == targetOrientation) {
          this.camera.lookAt(targetOrientation);
          this.travelParams.endRot.copy(this.camera.quaternion);
          this.camera.quaternion.copy(this.travelParams.startRot);
        } else {
          this.camera.position.copy(targetPos);
          this.camera.lookAt(targetOrientation);
          this.travelParams.endRot.copy(this.camera.quaternion);
          this.camera.quaternion.copy(this.travelParams.startRot);
          this.camera.position.copy(this.travelParams.startPos);
        }
      }
    }

    this.travelParams.endPos.copy(targetPos);

    if (this.instantTravel) {
      this.travelParams.duration = 0;
    } else if (travelTime === "auto") {
      const normalizedDistance = Math.min(
        1,
        targetPos.distanceTo(this.camera.position) / this.autoTravelTimeDist
      );

      this.travelParams.duration = THREE.MathUtils.lerp(
        this.autoTravelTimeMin,
        this.autoTravelTimeMax,
        normalizedDistance
      );

      if (this.travelParams.useRotation) {
        // value is normalized between 0 and 1
        const angularDifference =
          0.5 -
          0.5 *
            this.travelParams.endRot
              .normalize()
              .dot(this.camera.quaternion.normalize());

        this.travelParams.duration *= 1 + 2 * angularDifference;
        this.travelParams.duration = Math.min(
          this.travelParams.duration,
          this.autoTravelTimeMax
        );
      }
    } else {
      this.travelParams.duration = travelTime;
    }
  }

  initiateRotation(event: MouseEvent) {
    this.state = STATE.ROTATE;
    this.centerPoint.copy(
      this.getWorldPointAtScreenXY(new THREE.Vector2(0, 0))
    );
    const radius = this.camera.position.distanceTo(this.centerPoint);
    this.phi = Math.acos(
      (this.camera.position.z - this.centerPoint.z) / radius
    );

    //orbit
    this.rotateStart.set(event.clientX, event.clientY);
  }

  handleTravel(dt) {
    this.travelParams.alpha = Math.min(
      this.travelParams.alpha + dt / 1000 / this.travelParams.duration,
      1
    );
    const alpha = this.travelParams.useSmooth
      ? this.smooth(this.travelParams.alpha)
      : this.travelParams.alpha;
    this.camera.position.lerpVectors(
      this.travelParams.startPos,
      this.travelParams.endPos,
      alpha
    );
    if (this.travelParams.useRotation === true) {
      this.camera.quaternion.slerpQuaternions(
        this.travelParams.startRot,
        this.travelParams.endRot,
        alpha
      );
    }
    this.testAnimationEnd();
  }

  testAnimationEnd() {
    if (this.travelParams.alpha === 1) {
      // Resume normal behaviour after animation is completed
      this.state = STATE.NONE;
    }
  }

  smooth(value) {
    // p between 1.0 and 1.5 (empirical)
    const p = 1.2;
    return (value ** 2 * (3 - 2 * value)) ** p;
  }

  onMouseDown(event: MouseEvent) {
    if (this.enabled) {
      console.log("mouse down");
      event.preventDefault();
      if (STATE.NONE != this.state) {
        return;
      }
      this.currentPressedButton = event.button;
      this.updateMousePositionAndDelta(event);
      if (mouseButtons.LEFTCLICK == event.button) {
        if (event.ctrlKey) {
          if (this.enableRotation) {
            this.initiateRotation(event);
          }
        } else {
          this.initiateDrag(event);
        }
      }
    } else {
      return;
    }
  }

  onMouseUp(event) {
    if (this.enabled) {
      event.preventDefault();
      if (STATE.TRAVEL !== this.state && STATE.ORTHO_ZOOM !== this.state) {
        this.state = STATE.NONE;
      }
    } else {
      return;
    }
  }

  onMouseMove(event) {
    if (this.enabled) {
      event.preventDefault();
      this.updateMousePositionAndDelta(event);
      if (this.state == STATE.ROTATE) {
        this.mouseMoveRotation(event);
      }
      if (this.state == STATE.DRAG) {
        this.mouseMovePan(event);
      }
    } else {
      return;
    }
  }

  onMouseWheel(event: MouseWheelEvent) {
    console.log("wheel planar!");
    if (this.enabled) {
      event.preventDefault();
      event.stopPropagation();
      if (STATE.NONE == this.state) {
        this.initiateZoom(event);
      }
    } else {
      return;
    }
  }

  onKeyDown(event: KeyboardEvent) {
    //console.log("keeeeeey "+event.key)
  }

  // addInputListeners() {
  //   window.addEventListener("keydown", this._handlerOnKeyDown, false);
  //   this.renderer.domElement.addEventListener(
  //     "mousedown",
  //     this._handlerOnMouseDown,
  //     false
  //   );
  //   this.renderer.domElement.addEventListener(
  //     "mouseup",
  //     this._handlerOnMouseUp,
  //     false
  //   );
  //   this.renderer.domElement.addEventListener(
  //     "mouseleave",
  //     this._handlerOnMouseUp,
  //     false
  //   );
  //   this.renderer.domElement.addEventListener(
  //     "mousemove",
  //     this._handlerOnMouseMove,
  //     false
  //   );
  //   this.renderer.domElement.addEventListener(
  //     "mousewheel",
  //     this._handlerOnMouseWheel,
  //     false
  //   );
  //   this.renderer.domElement.addEventListener(
  //     "contextmenu",
  //     this._handlerContextMenu,
  //     false
  //   );
  // }

  // addListenersService(service) {
  //   let sendService = event => {
  //     //console.log("event service", event)
  //     service.send(event);
  //   };
  //   window.addEventListener("keydown", sendService, false);
  //   this.renderer.domElement.addEventListener("mousedown", sendService, false);
  //   this.renderer.domElement.addEventListener("mouseup", sendService, false);
  //   this.renderer.domElement.addEventListener("mouseleave", sendService, false);
  //   this.renderer.domElement.addEventListener("mousemove", sendService, false);
  //   this.renderer.domElement.addEventListener(
  //     "wheel",
  //     event => {
  //       event.preventDefault();
  //       event.stopPropagation();
  //       //console.log("mouse wheel!");
  //       service.send(event);
  //     },
  //     false
  //   );
  //   this.renderer.domElement.addEventListener(
  //     "contextmenu",
  //     event => {
  //       //console.log("context menu!");
  //       service.send("contextmenu", { contextMenuEvent: event });
  //     },
  //     false
  //   );
  // }

  // removeInputListeners() {
  //   window.removeEventListener("keydown", this._handlerOnKeyDown, true);
  //   this.renderer.domElement.removeEventListener(
  //     "mousedown",
  //     this._handlerOnMouseDown,
  //     false
  //   );
  //   this.renderer.domElement.removeEventListener(
  //     "mouseup",
  //     this._handlerOnMouseUp,
  //     false
  //   );
  //   this.renderer.domElement.removeEventListener(
  //     "mouseleave",
  //     this._handlerOnMouseUp,
  //     false
  //   );
  //   this.renderer.domElement.removeEventListener(
  //     "mousemove",
  //     this._handlerOnMouseMove,
  //     false
  //   );
  //   this.renderer.domElement.removeEventListener(
  //     "mousewheel",
  //     this._handlerOnMouseWheel,
  //     false
  //   );
  //   this.renderer.domElement.removeEventListener(
  //     "contextmenu",
  //     this._handlerContextMenu,
  //     false
  //   );
  //   // for firefox
  //   this.renderer.domElement.removeEventListener(
  //     "MozMousePixelScroll",
  //     this._handlerOnMouseWheel,
  //     false
  //   );
  // }

  getScreenCords(event) {
    let x =
      ((event.clientX - this.renderer.domElement.offsetLeft) /
        this.renderer.domElement.clientWidth) *
        2 -
      1;
    let y =
      -(
        (event.clientY - this.renderer.domElement.offsetTop) /
        this.renderer.domElement.clientHeight
      ) *
        2 +
      1;
    return new THREE.Vector2(x, y);
  }

  getWorldPointAtScreenXY(posXY) {
    this.raycaster.setFromCamera(posXY, this.camera);
    let intersection = this.raycaster.intersectObjects(this.objects);
    if (intersection.length > 0) {
      return intersection[0].point;
    } else {
      return this.getWorldPointFromMathPlaneAtScreenXY(posXY, 0);
    }
  }

  getWorldPointFromMathPlaneAtScreenXY(posXY: THREE.Vector2, altitude) {
    this.raycaster.setFromCamera(posXY, this.camera);
    let target = new THREE.Vector3();
    this.floorPlane.constant = altitude;
    this.raycaster.ray.intersectPlane(this.floorPlane, target);
    return target;
  }

  handleDragMovement() {
    //console.log("handle drag movement!");
    this.dragEnd = this.getWorldPointFromMathPlaneAtScreenXY(
      this.mousePosition,
      this.dragStart.z
    );
    this.dragDelta.subVectors(this.dragStart, this.dragEnd);
    this.camera.position.add(this.dragDelta);
    this.dragDelta.set(0, 0, 0);
  }

  mouseMoveRotation(event: MouseEvent) {
    this.rotateEnd.set(event.clientX, event.clientY);
    this.rotateDelta
      .subVectors(this.rotateEnd, this.rotateStart)
      .multiplyScalar(this.rotateSpeed);
    this.sphericalDelta.theta -=
      (2 * Math.PI * this.rotateDelta.x) /
      this.renderer.domElement.clientHeight;
    this.sphericalDelta.phi -=
      (2 * Math.PI * this.rotateDelta.y) /
      this.renderer.domElement.clientHeight;
    this.rotateStart.copy(this.rotateEnd);
  }

  mouseMovePan(event: MouseEvent) {
    this.updateMousePositionAndDelta(event);
    this.panEnd.set(event.clientX, event.clientY);
    this.panDelta
      .subVectors(this.panEnd, this.panStart)
      .multiplyScalar(this.panSpeed);
    const offset = new THREE.Vector3();
    const position = this.camera.position;
    offset.copy(position).sub(this.target);
    let targetDistance = offset.length();
    targetDistance *= Math.tan(((this.camera.fov / 2) * Math.PI) / 180.0);

    //pan left
    const v = new THREE.Vector3();
    v.setFromMatrixColumn(this.camera.matrix, 0);
    v.multiplyScalar(
      (-2 * this.panDelta.x * targetDistance) /
        this.renderer.domElement.clientHeight
    );
    this.panOffset.add(v);

    //panUp
    v.setFromMatrixColumn(this.camera.matrix, 1);
    v.multiplyScalar(
      (2 * this.panDelta.y * targetDistance) /
        this.renderer.domElement.clientHeight
    );
    this.panOffset.add(v);

    this.panStart.copy(this.panEnd);
  }

  handleRotationOrbit() {
    const quat = new THREE.Quaternion().setFromUnitVectors(
      this.camera.up,
      new THREE.Vector3(0, 1, 0)
    );
    const quatInverse = quat.clone().invert();
    const lastQuaternion = new THREE.Quaternion();
    const twoPI = 2 * Math.PI;
    const offset = new THREE.Vector3();

    const position = this.camera.position;
    //offset.copy(position).sub(this.target);
    offset.copy(position).sub(this.centerPoint);

    // rotate offset to "y-axis-is-up" space
    offset.applyQuaternion(quat);
    // angle from z-axis around y-axis
    this.spherical.setFromVector3(offset);
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    let min = this.minZenithAngle;
    let max = this.maxZenithAngle;
    if (isFinite(min) && isFinite(max)) {
      if (min < -Math.PI) min += twoPI;
      else if (min > Math.PI) min -= twoPI;

      if (max < -Math.PI) max += twoPI;
      else if (max > Math.PI) max -= twoPI;

      if (min <= max) {
        this.spherical.theta = Math.max(
          min,
          Math.min(max, this.spherical.theta)
        );
      } else {
        this.spherical.theta =
          this.spherical.theta > (min + max) / 2
            ? Math.max(min, this.spherical.theta)
            : Math.min(max, this.spherical.theta);
      }
    }

    this.spherical.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, this.spherical.phi)
    );
    this.spherical.makeSafe();
    this.target.add(this.panOffset);
    offset.setFromSpherical(this.spherical);
    offset.applyQuaternion(quatInverse);
    //this.camera.position.copy(this.target).add(offset);
    this.camera.position.copy(offset);
    //console.log("camera position", this.camera.position);
    //console.log("target", this.target);

    //this.camera.lookAt(this.target);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));
    this.camera.position.add(this.centerPoint);
    this.camera.updateMatrixWorld();

    this.sphericalDelta.set(0, 0, 0);
    this.panOffset.set(0, 0, 0);
  }

  // update(dt) {
  //   switch (this.state) {
  //     case STATE.DRAG:
  //       this.handleDragMovement();
  //       //this.handleRotationOrbit();
  //       break;
  //     case STATE.TRAVEL:
  //       this.handleTravel(dt);
  //       break;
  //     case STATE.ROTATE:
  //       //this.handleRotation();
  //       this.handleRotationOrbit();
  //       break;
  //   }
  //   //console.log("target", this.target);
  // }

  onContextMenu(event) {
    event.preventDefault();
  }
}

const DRAG_STATE = "state_drag";
const TRAVEL_STATE = "state_travel";
const ROTATE_STATE = "state_rotate";
const IDLE_STATE = "state_idle";

const ROTATE_EVENT = "rotate_event";
const DRAG_EVENT = "drag_event";
export function createStates(controls: PlanarControls) {
  const states = {
    initial: IDLE_STATE,
    // context: {
    //   controls: controls
    // },
    states: {
      [IDLE_STATE]: {
        on: {
          contextmenu: [
            {
              actions: ["preventDefault"]
            }
          ],
          mousedown: [
            {
              target: ROTATE_STATE,
              cond: (context, event) => {
                return mouseButtons.LEFTCLICK == event.button && event.ctrlKey;
              }
              //actions: ["preventDefault"]
            },
            {
              target: DRAG_STATE,
              cond: (context, event) => {
                return mouseButtons.LEFTCLICK == event.button;
              }
            }
          ],
          wheel: [{ target: TRAVEL_STATE }]
        }
      },
      [DRAG_STATE]: {
        entry: [
          (context, event) => {
            console.log("drag!");
          },
          "initiateDrag"
        ],
        on: {
          mouseup: {
            target: IDLE_STATE
          },
          mousemove: {
            actions: ["moveDrag"]
          },
          update: {
            actions: ["updateDrag"]
          }
        }
      },
      [TRAVEL_STATE]: {
        entry: ["initiateZoom"],
        on: {
          update: {
            target: IDLE_STATE,
            actions: ["updateTravel"]
          }
        }
      },
      [ROTATE_STATE]: {
        entry: [
          (context, event) => {
            console.log("rotate!");
          },
          "initiateRotate"
        ],
        on: {
          mouseup: {
            target: IDLE_STATE
          },
          contextmenu: [
            {
              actions: ["preventDefault"]
            }
          ],
          mousemove: {
            actions: ["moveRotate"]
          },
          update: {
            actions: ["updateRotate"]
          }
        }
      }
    }
  };
  const actions = {
    initiateDrag: (context, event) => {
      controls.initiateDrag(event);
    },
    moveDrag: (context, event) => {
      controls.mouseMovePan(event);
    },
    updateDrag: (context, event) => {
      controls.handleDragMovement();
    },
    initiateRotate: (context, event) => {
      controls.initiateRotation(event);
    },
    moveRotate: (context, event) => {
      controls.mouseMoveRotation(event);
    },
    updateRotate: (context, event) => {
      controls.handleRotationOrbit();
    },
    initiateZoom: (context, event) => {
      controls.initiateZoom(event);
    },
    preventDefault: (context, event) => {
      //console.log("prevent default!");
      event.contextMenuEvent.preventDefault();
    },
    updateTravel: (context, event) => {
      controls.handleTravel(event.t);
    }
  };
  return { states: states, actions: actions };
}
