import * as STCUtils from "./STCUtils";
import * as d3 from "d3";
import * as d3hexbin from "d3-hexbin";
import proj4 from "proj4";
import { proj4326, proj3857 } from "./Constants";
import * as THREE from "three";
import helvetiker from "../../node_modules/three/examples/fonts/helvetiker_regular.typeface.json";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry";
import { HexagonGroup } from "./HexagonGroup";

export class SpatioTemporalCube {
  data: Map<number, Map<any, number>>;
  hexGroups: Map<number, HexagonGroup>;
  temporalScale: number;
  zoomLevel: number;
  controller: any;
  zoomValues: {
    radius: number;
    daysAggregation: number;
    startDistance: number;
    endDistance: number;
    index: number;
  }[];
  maxDate: number;
  infoPanel: HTMLElement;
  selected: THREE.Mesh;
  currentDates: { min: number; max: number };
  startDate: any;
  scaleGroup: THREE.Group;
  timeScale: any;
  datesMap: any;
  constructor(
    data,
    startDate,
    controller,
    zoomValues,
    infoPanel,
    temporalScale
  ) {
    this.temporalScale = temporalScale;
    let range = this.getDataRange(data);
    this.currentDates = { min: 0, max: range.days };
    this.timeScale = d3
      .scaleLinear()
      .domain([this.currentDates.min, this.currentDates.max])
      .range([0, this.temporalScale]);
    this.controller = controller;
    this.zoomValues = zoomValues;
    this.infoPanel = infoPanel;
    this.hexGroups = new Map();
    this.zoomLevel = 3;
    this.startDate = startDate;
    this.click = this.click.bind(this);
    //this.processData(data, startDate, zoomValues);
    this.processData(data, range.min, zoomValues);
  }

  getDataRange(data) {
    let minDate = null;
    let maxDate = null;
    for (let event of data) {
      let date = new Date(event.date);
      if (minDate == null) {
        minDate = date;
      }
      if (maxDate == null) {
        maxDate = date;
      } else {
        if (date < minDate) {
          minDate = date;
        }
        if (date > maxDate) {
          maxDate = date;
        }
      }
    }
    return {
      min: minDate,
      max: maxDate,
      days: STCUtils.getDiffDate(minDate, maxDate),
    };
  }

  processData(data, startDate, zoomValues) {
    //dates map will store for each date all cases that hapenned in that date
    let datesMap = new Map<number, any>();
    let startDateDate = new Date(startDate);
    for (let event of data) {
      let diffDays = STCUtils.getDiffDate(startDateDate, new Date(event.date));
      if (!datesMap.has(diffDays)) {
        datesMap.set(diffDays, []);
      }
      let coords = proj4(proj4326, proj3857, [event.lon, event.lat]);
      let worldCoords = this.controller.threeViewer.getWorldCoords(coords);
      let clonedEvent = {
        x: worldCoords[0],
        y: worldCoords[1],
        date: event.date,
      };
      datesMap.get(diffDays).push(clonedEvent);
    }

    let maxDate = -Number.MAX_VALUE;
    datesMap.forEach((event, date) => {
      if (date > maxDate) {
        maxDate = date;
      }
    });
    this.datesMap = datesMap;
    this.maxDate = maxDate;

    //let extent = this.getDataExtent(datesMap);

    for (let i = 0; i < zoomValues.length; i++) {
      let zoomValue = zoomValues[i];
      if (zoomValue.radius == 0) {
        let group = this.addCasesMeshes(datesMap);
        this.hexGroups.set(zoomValue.index, { group: group });
        this.controller.threeViewer.scene.add(group);
      } else {
        //hexMap will store for each date the hex points, that contains the x, and y of the hex and all the points contained in that bin
        let hexMap = new Map();
        // let pointGrid = this.getPointGrid(
        //   zoomValue.radius,
        //   Math.floor(extent.maxX - extent.minX) + 1000,
        //   Math.floor(extent.maxY - extent.minY) + 1000
        // );

        //for each date and radius values we calculate the hexmaps
        datesMap.forEach((values, date) => {
          // let mergedPoints = pointGrid.concat(values);
          let hexbin = d3hexbin
            .hexbin()
            .radius(zoomValue.radius)
            .x(function (d) {
              return d.x;
            })
            .y(function (d) {
              return d.y;
            });

          var hexPoints = hexbin(values);
          hexMap.set(date, hexPoints);
        });
        let positions = [];
        //positions map contains the hex x, hex y, date and number of items
        //Map<x,y,date,#events>
        //indexPositionsMap contains for each hex its index <index, {x,y}>
        let positionsMap = new Map();
        let positionsIndexMap = new Map();
        let indexPositionsMap = new Map();
        let currentIndex = 0;
        hexMap.forEach((values, date) => {
          for (let value of values) {
            if (value.length > 0) {
              if (!positionsMap.has(value.x)) {
                positionsMap.set(value.x, new Map());
              }
              if (!positionsIndexMap.has(value.x)) {
                positionsIndexMap.set(value.x, new Map());
              }
              if (!positionsMap.get(value.x).has(value.y)) {
                positionsMap.get(value.x).set(value.y, new Map());
              }
              if (!positionsIndexMap.get(value.x).has(value.y)) {
                positionsIndexMap.get(value.x).set(value.y, currentIndex);
                indexPositionsMap.set(currentIndex, { x: value.x, y: value.y });
                currentIndex++;
              }
              positionsMap.get(value.x).get(value.y).set(date, value.length);
            }
          }
        });
        let hexagonGroup = new HexagonGroup(
          zoomValue.radius,
          zoomValue.daysAggregation,
          positionsMap,
          this.temporalScale,
          positionsIndexMap,
          this.currentDates,
          indexPositionsMap
        );
        this.hexGroups.set(zoomValue.index, hexagonGroup);
        this.controller.threeViewer.scene.add(hexagonGroup.group);
        this.controller.threeViewer.scene.add(hexagonGroup.floorGroup);
      }
    }
    console.log("hexgroups", this.hexGroups);
    this.addAxis();
    if (this.hexGroups.get(this.zoomLevel).floorGroup != null) {
      this.hexGroups.get(this.zoomLevel).floorGroup.visible = true;
    }

    this.hexGroups.get(this.zoomLevel).group.visible = true;
  }

  addCasesMeshes(datesMap: Map<number, any>) {
    let baseGroup = new THREE.Group();
    let material = new THREE.MeshStandardMaterial({ color: "#C6F499" });
    let geometries = [];
    datesMap.forEach((events, date) => {
      for (let event of events) {
        var geometry = new THREE.BoxBufferGeometry(0.5, 0.5, 0.5);
        let z = this.timeScale(date);
        geometry.translate(event.x, event.y, z);
        geometries.push(geometry);
      }
    });
    const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(
      geometries,
      false
    );
    const mesh = new THREE.Mesh(mergedGeometry, material);
    baseGroup.add(mesh);
    baseGroup.visible = false;
    return baseGroup;
  }

  click(event) {
    let x = (event.clientX / window.innerWidth) * 2 - 1;
    let y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.controller.threeViewer.rayCaster.setFromCamera(
      new THREE.Vector2(x, y),
      this.controller.threeViewer.currentCamera
    );
    var intersects = this.controller.threeViewer.rayCaster.intersectObjects(
      this.hexGroups.get(this.zoomLevel).group.children
    );
    if (intersects.length > 0) {
      this.select(intersects[0].object, event);
    } else {
      this.select(null, event);
    }
  }

  select(hex: THREE.Mesh, event) {
    if (hex != null) {
      if (this.selected != null && this.selected != hex) {
        this.selected.material.emissive.setHex(this.selected.userData.color);
      }
      if (hex.userData.type == "hex") {
        hex.material.emissive.setHex(0xff0000);
        //Display informations about the object
        this.infoPanel.innerHTML =
          "Date : " + STCUtils.addDaysToDate(this.startDate, hex.userData.date);
        if (this.hexGroups.get(this.zoomLevel).daysAggregation > 1) {
          this.infoPanel.innerHTML =
            "Date : " +
            STCUtils.addDaysToDate(this.startDate, hex.userData.date) +
            "-" +
            STCUtils.addDaysToDate(
              this.startDate,
              hex.userData.date +
                this.hexGroups.get(this.zoomLevel).daysAggregation
            );
        }
        // if (hex.userData.endDate != undefined) {
        //   this.infoPanel.innerHTML =
        //     "Date : " + hex["name"] + "-" + hex.userData.endDate;
        // }
        this.infoPanel.style.left = event.clientX + 20 + "px";
        this.infoPanel.style.top = event.clientY - 5 + "px";
        this.infoPanel.style.visibility = "visible";
        this.hexGroups.get(this.zoomLevel).select(hex.userData.hexid);
        this.selected = hex;
      }
    } else {
      if (this.selected != null) {
        this.selected.material.emissive.setHex(this.selected.userData.color);
        this.infoPanel.style.visibility = "hidden";
        this.selected = null;
        this.hexGroups.get(this.zoomLevel).select(-1);
      }
    }
  }

  setCurrentDates(currentDates: { min: number; max: number }) {
    this.timeScale = d3
      .scaleLinear()
      .domain([0, this.temporalScale])
      .range([this.currentDates.min, this.currentDates.max]);
    this.currentDates = currentDates;
    // this.controller.threeViewer.scene.remove(
    //   this.hexGroups.get(this.zoomLevel).group
    // );
    this.hexGroups.forEach((hexGroup) => {
      this.controller.threeViewer.scene.remove(hexGroup.group);
    });
    // for (let children of this.hexGroups.get(this.zoomLevel).group.children) {
    //   this.controller.threeViewer.scene.remove(children);

    //   this.hexGroups.get(this.zoomLevel).group.remove(children);
    // }
    this.hexGroups.forEach((hexGroup, zoomLevel) => {
      if (hexGroup.updateMeshes != null) {
        hexGroup.updateMeshes(this.temporalScale, this.currentDates);
        this.controller.threeViewer.scene.add(hexGroup.group);
      } else {
        let group = this.addCasesMeshes(this.datesMap);
        this.hexGroups.set(zoomLevel, { group: group });
        this.controller.threeViewer.scene.add(group);
        if (this.zoomLevel == zoomLevel) {
          group.visible = true;
        }
      }
    });
    this.hexGroups.get(this.zoomLevel).group.visible = true;
    this.addAxis();
  }

  addAxis() {
    const loader = new FontLoader();
    var font = loader.parse(helvetiker);
    if (this.scaleGroup != null) {
      this.controller.threeViewer.scene.remove(this.scaleGroup);
    }
    this.scaleGroup = new THREE.Group();
    let timeScale = d3
      .scaleLinear()
      .domain([0, this.temporalScale])
      .range([this.currentDates.min, this.currentDates.max]);

    var nbrLegends = 6; // Nbr of texts forming the temporal legend
    for (let i = 0; i <= nbrLegends; i++) {
      let date = timeScale((i * this.temporalScale) / nbrLegends);
      let dateString = STCUtils.addDaysToDate(this.startDate, date);
      const axegeometry = new TextGeometry(dateString + "__", {
        font: font,
        size: 16,
        height: 5,
        curveSegments: 50,
        bevelEnabled: false,
        bevelThickness: 5,
        bevelSize: 1,
        bevelOffset: 0,
        bevelSegments: 5,
      });

      var axematerial = new THREE.MeshStandardMaterial({ color: 0x000000 });
      var axe = new THREE.Mesh(axegeometry, axematerial); //a three js mesh needs a geometry and a material
      axe.position.x = -100;
      axe.position.y = -10;
      axe.position.z = (i * this.temporalScale) / nbrLegends + 3;
      this.scaleGroup.add(axe); //all objects have to be added to the threejs scene
    }
    this.controller.threeViewer.scene.add(this.scaleGroup); //the group is added to the scene
  }

  setTemporalScale(temporalScale) {
    this.temporalScale = temporalScale;
    this.hexGroups.forEach((hexGroup, zoomLevel) => {
      if (hexGroup.updateTemporalScale != null) {
        hexGroup.updateTemporalScale(temporalScale);
      } else {
        this.controller.threeViewer.scene.remove(hexGroup.group);
        let group = this.addCasesMeshes(this.datesMap);
        this.hexGroups.set(zoomLevel, { group: group });
        this.controller.threeViewer.scene.add(group);
        if (this.zoomLevel == zoomLevel) {
          group.visible = true;
        }
      }
    });
    this.addAxis();
  }

  render(cameraDistance) {
    for (let zoomValue of this.zoomValues) {
      if (
        cameraDistance < zoomValue.endDistance &&
        cameraDistance >= zoomValue.startDistance
      ) {
        if (this.zoomLevel != zoomValue.index) {
          this.zoomLevel = zoomValue.index;
          this.hexGroups.forEach((hexGroup, index) => {
            if (index == this.zoomLevel) {
              hexGroup.group.visible = true;
              if (hexGroup.floorGroup != null) {
                hexGroup.floorGroup.visible = true;
              }
            } else {
              hexGroup.group.visible = false;
              if (hexGroup.floorGroup != null) {
                hexGroup.floorGroup.visible = false;
              }
            }
          });
        }
      }
    }
    // this.scaleGroup.quaternion.copy(
    //   this.controller.threeViewer.currentCamera.quaternion
    // );
    for (let element of this.scaleGroup.children) {
      element.quaternion.copy(
        this.controller.threeViewer.currentCamera.quaternion
      );
    }
  }
}
