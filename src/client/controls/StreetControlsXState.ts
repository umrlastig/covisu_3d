import * as THREE from "three";
import { Euler, Vector3 } from "three";
import { send, sendParent } from "xstate";

const _PI_2 = Math.PI / 2;

export const STATE = {
  NONE: -1,
  DRAG: 0,
};

const mouseButtons = {
  LEFTCLICK: THREE.MOUSE.LEFT,
  MIDDLECLICK: THREE.MOUSE.MIDDLE,
  RIGHTCLICK: THREE.MOUSE.RIGHT,
};

const MOVEMENTS = {
  ArrowUp: { method: "translateZ", sign: -1 }, // FORWARD: up key
  ArrowDown: { method: "translateZ", sign: 1 }, // BACKWARD: down key
  ArrowLeft: { method: "translateX", sign: -1 }, // STRAFE_LEFT: left key
  ArrowRight: { method: "translateX", sign: 1 }, // STRAFE_RIGHT: right key
};

export class StreetControls {
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  minPolarAngle: number;
  maxPolarAngle: number;
  moveSpeed: number;
  euler: THREE.Euler;
  eulerDown: THREE.Euler;
  enabled: boolean;
  handlerOnMouseMove: any;
  handlerOnMouseDown: any;
  handlerOnMouseUp: any;
  handlerOnMouseLeave: any;
  handlerOnMouseWheel: any;
  handleKeyDown: any;
  vector: THREE.Vector3;
  target: THREE.Vector3;
  state: any;
  updateState: any;
  onMouseDownX: number;
  onMouseDownY: number;
  stateOnMouseDown: any;
  axisY: THREE.Vector3;
  verticalFOV: number;

  scene: THREE.Scene;
  downQuaternion: THREE.Quaternion;
  startQuaternion: THREE.Quaternion;
  constructor(camera, renderer, scene) {
    this.camera = camera;
    this.renderer = renderer;
    this.scene = scene;
    this.minPolarAngle = 0;
    this.maxPolarAngle = 2 * Math.PI;
    this.moveSpeed = 1;
    // this.euler = new Euler(0, 0, 0, "YXZ");
    // this.eulerDown = new Euler(0, 0, 0, "YXZ");
    this.euler = new Euler(0, 0, 0);
    this.eulerDown = new Euler(0, 0, 0);
    this.vector = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.state = STATE.NONE;
    this.enabled = true;
    this.updateState = {
      rotateX: 0,
      rotateY: 0,
      snapshot() {
        return {
          rotateX: this.rotateX,
          rotateY: this.rotateY,
        };
      },
    };
    this.axisY = new THREE.Vector3(0, 1, 0);
    this.verticalFOV = 180;

    this.downQuaternion = new THREE.Quaternion();
    this.startQuaternion = new THREE.Quaternion();
    this.startQuaternion.copy(this.camera.quaternion);
    this.handlerOnMouseMove = this.onMouseMove.bind(this);
    this.handlerOnMouseDown = this.onMouseDown.bind(this);
    this.handlerOnMouseUp = this.onMouseUp.bind(this);
    this.handlerOnMouseLeave = this.onMouseLeave.bind(this);
    this.handlerOnMouseWheel = this.onMouseWheel.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);
    //this.addInputListeners();
  }

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

  onMouseDown(event: MouseEvent) {
    if (this.enabled) {
      // if (this.state != STATE.NONE) {
      //   return;
      // }
      // if (event.button == mouseButtons.LEFTCLICK) {
      //   this.state = STATE.DRAG;
      // }
      //const coords = this.getScreenCords(event);
      // this.onMouseDownX = coords.x;
      // this.onMouseDownY = coords.y;
      this.onMouseDownX = event.clientX;
      this.onMouseDownY = event.clientY;
      this.stateOnMouseDown = this.updateState.snapshot();
      this.eulerDown.setFromQuaternion(this.camera.quaternion);
    }
    this.downQuaternion.copy(this.camera.quaternion);
  }

  onMouseUp(event) {
    if (this.enabled) {
      event.preventDefault();
      if (this.state == STATE.DRAG) {
        this.state = STATE.NONE;
      }
    }
  }

  mouseMoveDrag2(event: MouseEvent) {
    const pxToAngleRatio =
      THREE.MathUtils.degToRad(this.camera.fov) /
      this.renderer.domElement.clientHeight;
    //const coords = this.getScreenCords(event);
    const coords = new THREE.Vector2(event.clientX, event.clientY);

    this.updateState.rotateY =
      (coords.x - this.onMouseDownX) * pxToAngleRatio +
      this.stateOnMouseDown.rotateY;
    this.updateState.rotateX = this.limitRotation(
      this.camera,
      (coords.y - this.onMouseDownY) * pxToAngleRatio +
        this.stateOnMouseDown.rotateX,
      this.verticalFOV
    );

    // this.updateState.rotateY = (coords.x - this.onMouseDownX) * pxToAngleRatio;
    // this.updateState.rotateX = this.limitRotation(
    //   this.camera,
    //   (coords.y - this.onMouseDownY) * pxToAngleRatio,
    //   this.verticalFOV
    // );

    this.applyRotation(this.camera, this.updateState);
    //console.log("camera quaternion", this.camera.quaternion);
  }

  onMouseMove(event: MouseEvent) {
    if (this.enabled) {
      if (this.state == STATE.DRAG) {
        this.mouseMoveDrag2(event);
      }
    }
  }

  limitRotation(camera3D, rot, verticalFOV) {
    // Limit vertical rotation (look up/down) to make sure the user cannot see
    // outside of the cone defined by verticalFOV
    const limit = THREE.MathUtils.degToRad(verticalFOV - camera3D.fov) * 0.5;
    return THREE.MathUtils.clamp(rot, -limit, limit);
  }

  applyRotation(camera3D: THREE.Camera, state) {
    let up = new THREE.Vector3();
    //up.copy(this.camera.up).applyQuaternion(this.camera.quaternion);

    //camera3D.quaternion.setFromUnitVectors(this.axisY, this.camera.up);
    camera3D.quaternion.copy(this.startQuaternion);
    //camera3D.quaternion.copy(this.downQuaternion);

    camera3D.rotateY(state.rotateY);
    camera3D.rotateX(state.rotateX);
    // let cameraEuler = new THREE.Euler(
    //   camera3D.rotation.x,
    //   camera3D.rotation.y,
    //   camera3D.rotation.z
    // );
    // console.log("rotation", camera3D.rotation);
    // camera3D.quaternion.setFromEuler(cameraEuler);
    //console.log("quaternion", camera3D.quaternion);

    //this gets the same result
    // camera3D.rotateOnAxis(new THREE.Vector3(0, 1, 0), state.rotateY);
    // camera3D.rotateOnAxis(new THREE.Vector3(1, 0, 0), state.rotateX);

    //console.log("camera up", camera3D.up);
    //console.log("state", this.updateState.rotateX, this.updateState.rotateY);
  }

  onMouseLeave(event) {
    //console.log("mouse leave!");
    if (this.enabled) {
      event.preventDefault();
      if (this.state == STATE.DRAG) {
        this.state = STATE.NONE;
      }
    }
  }

  onMouseWheel(event: WheelEvent) {
    if (this.enabled) {
      //console.log("mouse wheel street");
      let delta = 0;
      if (event.wheelDelta !== undefined) {
        delta = -event.wheelDelta;
        // Firefox
      } else if (event.detail !== undefined) {
        delta = event.detail;
      }

      this.camera.fov = THREE.MathUtils.clamp(
        this.camera.fov + Math.sign(delta),
        10,
        Math.min(100, this.verticalFOV)
      );

      this.camera.updateProjectionMatrix();
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key == "j") {
      this.startQuaternion.copy(this.camera.quaternion);
    }
    let move = MOVEMENTS[event.key];
    if (move != null) {
      this.camera[move.method](move.sign * this.moveSpeed);
    }
  }

  addInputListeners() {
    this.renderer.domElement.addEventListener(
      "mousemove",
      this.handlerOnMouseMove
    );
    this.renderer.domElement.addEventListener(
      "mousedown",
      this.handlerOnMouseDown
    );
    this.renderer.domElement.addEventListener("mouseup", this.handlerOnMouseUp);
    window.addEventListener("keydown", this.handleKeyDown);
    this.renderer.domElement.addEventListener(
      "mouseleave",
      this.handlerOnMouseLeave
    );
    this.renderer.domElement.addEventListener(
      "wheel",
      this.handlerOnMouseWheel
    );
  }

  removeInputListeners() {
    this.renderer.domElement.removeEventListener(
      "mousemove",
      this.handlerOnMouseMove
    );
    this.renderer.domElement.removeEventListener(
      "mousedown",
      this.handlerOnMouseDown
    );
    this.renderer.domElement.removeEventListener(
      "mouseup",
      this.handlerOnMouseUp
    );
    this.renderer.domElement.removeEventListener(
      "wheel",
      this.handlerOnMouseWheel
    );
    this.renderer.domElement.removeEventListener(
      "mouseleave",
      this.handlerOnMouseLeave
    );
    window.removeEventListener("keydown", this.handleKeyDown);
  }

  getDirection() {
    const direction = new Vector3(0, 0, -1);
    let self = this;
    return function (v) {
      return v.copy(direction).applyQuaternion(self.camera.quaternion);
    };
  }

  moveForward(distance) {
    this.vector.setFromMatrixColumn(this.camera.matrix, 0);
    this.vector.crossVectors(this.camera.up, this.vector);
    this.camera.position.addScaledVector(this.vector, distance);
  }

  moveRight(distance) {
    this.vector.setFromMatrixColumn(this.camera.matrix, 0);
    this.camera.position.addScaledVector(this.vector, distance);
  }

  update() {
    //this.applyRotation(this.camera, this.updateState);
  }

  start() {
    console.log("start street!");
    this.startQuaternion.copy(this.camera.quaternion);
  }
}

const DRAG_STATE = "state_drag";
const IDLE_STATE = "state_idle";
const OUT_STATE = "state_out";

export function createStates(controls: StreetControls) {
  const states = {
    initial: IDLE_STATE,
    states: {
      [OUT_STATE]: {
        on: {
          mouseenter: [
            {
              target: IDLE_STATE,
            },
          ],
        },
      },
      [IDLE_STATE]: {
        on: {
          mousedown: [
            {
              target: DRAG_STATE,
              cond: (context, event) => {
                return event.button == mouseButtons.LEFTCLICK;
              },
            },
          ],
          keydown: [
            {
              actions: ["moveKey"],
            },
          ],
          wheel: [
            {
              actions: ["mouseWheel"],
            },
          ],
          mouseleave: [
            {
              target: OUT_STATE,
            },
          ],
        },
      },
      [DRAG_STATE]: {
        entry: ["startMoveDrag"],
        on: {
          mouseup: {
            target: IDLE_STATE,
          },
          mousemove: {
            actions: ["moveDragStreet"],
          },
        },
      },
    },
  };

  const actions = {
    mouseWheel: (context, event) => {
      controls.onMouseWheel(event);
    },
    moveDragStreet: (context, event) => {
      controls.mouseMoveDrag2(event);
    },
    moveKey: (context, event) => {
      if (event.key == "f") {
        send({ type: "TEST" });
      }
      controls.onKeyDown(event);
    },
    startMoveDrag: (context, event) => {
      controls.onMouseDown(event);
    },
  };

  return { states: states, actions: actions };
}

export function createStates2(controls: StreetControls) {
  const states = {
    initial: IDLE_STATE,
    states: {
      [OUT_STATE]: {
        on: {
          mouseenter: [
            {
              target: IDLE_STATE,
            },
          ],
        },
      },
      [IDLE_STATE]: {
        on: {
          mousedown: [
            {
              target: DRAG_STATE,
              cond: (context, event) => {
                return event.button == mouseButtons.LEFTCLICK;
              },
            },
          ],
          keydown: [
            {
              actions: ["moveKey"],
            },
          ],
          wheel: [
            {
              actions: ["mouseWheel"],
            },
          ],
          mouseleave: [
            {
              target: OUT_STATE,
            },
          ],
        },
      },
      [DRAG_STATE]: {
        entry: ["startMoveDrag"],
        on: {
          mouseup: {
            target: IDLE_STATE,
          },
          mousemove: {
            actions: ["moveDragStreet"],
          },
        },
      },
    },
  };

  const actions = {
    mouseWheel: (context, event) => {
      controls.onMouseWheel(event);
    },
    moveDragStreet: (context, event) => {
      controls.mouseMoveDrag2(event);
    },
    moveKey: (context, event) => {
      controls.onKeyDown(event);
    },
    startMoveDrag: (context, event) => {
      controls.onMouseDown(event);
    },
  };

  return { states: states, actions: actions };
}
