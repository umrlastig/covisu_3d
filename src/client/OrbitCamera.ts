import * as THREE from "three";
import { Spherical } from "three";

export class OrbitCamera {
  camera: THREE.Camera;
  target: THREE.Vector3;
  position: THREE.Vector3;
  sphericalDelta: THREE.Spherical;

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.sphericalDelta = new Spherical();
    this.position = new THREE.Vector3();
    this.target = new THREE.Vector3();
  }

  update() {
    var offset = new THREE.Vector3();
    let spherical = new THREE.Spherical();
    // so camera.up is the orbit axis
    var quat = new THREE.Quaternion().setFromUnitVectors(
      this.camera.up,
      new THREE.Vector3(0, 1, 0)
    );
    var quatInverse = quat.clone().invert();
    //var position = self.camera.position;
    var position = this.position;
    offset.copy(position).sub(this.target);

    // rotate offset to "y-axis-is-up" space
    offset.applyQuaternion(quat);

    // angle from z-axis around y-axis
    spherical.setFromVector3(offset);
    spherical.phi += this.sphericalDelta.phi;
    spherical.theta += this.sphericalDelta.theta;
    this.sphericalDelta = new THREE.Spherical();
    spherical.makeSafe();
    offset.setFromSpherical(spherical);

    // rotate offset back to "camera-up-vector-is-up" space
    offset.applyQuaternion(quatInverse);

    this.camera.position.copy(this.target).add(offset);

    this.camera.lookAt(this.target);
  }

  rotateUp(phi) {
    this.sphericalDelta.phi = phi;
  }
}
