import * as STCUtils from "./STCUtils";
import * as d3 from "d3";
import * as THREE from "three";

export class HexagonGroup {
  radius: number;
  daysAggregation: number;
  group: THREE.Group;
  floorGroup: THREE.Group;
  positionsMap: any;
  positionsIndexMap: Map<number, Map<number, number>>;
  indexPositionsMap: Map<number, { x: number; y: number }>;
  meshMap: Map<number, Map<number, THREE.Mesh[]>>;
  floorMeshMap: Map<number, Map<number, THREE.Mesh>>;
  currentDates: { min: number; max: number };
  maxDate: number;
  maxValue: any;
  constructor(
    radius,
    daysAggregation,
    positionsMap,
    temporalScale,
    positionsIndexMap,
    currentDates,
    indexPositionsMap
  ) {
    this.radius = radius;
    this.daysAggregation = daysAggregation;
    this.group = new THREE.Group();
    this.floorGroup = new THREE.Group();
    this.positionsIndexMap = positionsIndexMap;
    this.indexPositionsMap = indexPositionsMap;
    this.positionsMap = positionsMap;
    this.currentDates = currentDates;
    this.maxDate = 100;

    this.createMeshes(temporalScale);
  }

  temporalAggregation(dates, positionsMap) {
    //Return the number of case on a same location during some days
    let aggregatedMap = new Map();
    for (let date of dates) {
      aggregatedMap.set(date, new Map());
      let positions = [];
      for (let i = 0; i < this.daysAggregation; i++) {
        positionsMap.forEach((YposMap, xPosvalue) => {
          if (aggregatedMap.get(date).get(xPosvalue) == null) {
            aggregatedMap.get(date).set(xPosvalue, new Map());
          }
          YposMap.forEach((datesMap, yposvalue) => {
            if (datesMap.get(date + i) != null) {
              if (
                aggregatedMap.get(date).get(xPosvalue).get(yposvalue) == null
              ) {
                aggregatedMap.get(date).get(xPosvalue).set(yposvalue, 0);
              }
              aggregatedMap
                .get(date)
                .get(xPosvalue)
                .set(
                  yposvalue,
                  aggregatedMap.get(date).get(xPosvalue).get(yposvalue) +
                    datesMap.get(date + i)
                );
            }
          });
        });
      }
    }
    return aggregatedMap;
  }

  getMaxValue(datesMap) {
    let maxValue = -Number.MAX_VALUE;
    let maxDate = null;
    let maxX = null;
    let maxY = null;
    datesMap.forEach((xPosMap, date) => {
      xPosMap.forEach((yPosMap, xPosValue) => {
        yPosMap.forEach((value, yPosvalue) => {
          if (value >= maxValue) {
            maxValue = value;
            maxDate = date;
            maxX = xPosValue;
            maxY = yPosvalue;
          }
        });
      });
    });
    return { value: maxValue, date: maxDate, x: maxX, y: maxY };
  }

  select(hexIndex) {
    if (hexIndex != -1) {
      let position = this.indexPositionsMap.get(hexIndex);

      this.meshMap.forEach((yMap, xPos) => {
        yMap.forEach((meshes, yPos) => {
          for (let mesh of meshes) {
            if (!(xPos == position.x && yPos == position.y)) {
              mesh.material.opacity = 0.1;
            } else {
              console.log(mesh.userData.type);
              mesh.material.opacity = 1.0;
            }
          }
        });
      });
      this.floorMeshMap.forEach((yMap, xPos) => {
        yMap.forEach((mesh, yPos) => {
          if (!(xPos == position.x && yPos == position.y)) {
            mesh.material.opacity = 0.1;
          } else {
            console.log(mesh.userData.type);
            mesh.material.opacity = 0.5;
          }
        });
      });
    } else {
      this.meshMap.forEach((yMap, xPos) => {
        yMap.forEach((meshes, yPos) => {
          for (let mesh of meshes) {
            mesh.material.opacity = 1.0;
          }
        });
      });
      this.floorMeshMap.forEach((yMap, xPos) => {
        yMap.forEach((mesh, yPos) => {
          mesh.material.opacity = 0.1;
        });
      });
    }
  }

  createMeshes(temporalScale) {
    let dates = [];
    for (
      let i = this.currentDates.min;
      i < this.currentDates.max;
      i += this.daysAggregation
    ) {
      dates.push(i);
    }

    let aggregatedMap = this.temporalAggregation(dates, this.positionsMap);
    let maxValue = this.getMaxValue(aggregatedMap);
    // var hexData = hexDatabyDate(databyDate, pointGrid);
    // let max = setBoudaries(hexData, dates);
    let maxArea = STCUtils.hexagonArea(this.radius);
    let areaScale = d3
      .scaleLinear()
      .domain([0, maxValue.value])
      .range([0, maxArea]);

    let timeScale = d3
      .scaleLinear()
      .domain([this.currentDates.min, this.currentDates.max])
      .range([0, temporalScale]);
    let colorScale = d3.scaleQuantize(
      [0, maxValue.value],
      ["#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#005a32"]
      //["#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#005a32"]
      // ['#fdd0a2','#fdae6b','#fd8d3c','#f16913','#d94801','#8c2d04']
      //['#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#0c2c84']
      // ['#fed976','#feb24c','#fd8d3c','#fc4e2a','#e31a1c','#b10026'],
    );

    let meshMap = new Map();
    this.floorMeshMap = new Map();
    aggregatedMap.forEach((xMap, date) => {
      let z = timeScale(date);
      xMap.forEach((yMap, xPos) => {
        yMap.forEach((value, yPos) => {
          if (value != 0) {
            let radius = STCUtils.rforHexagonArea(areaScale(value));
            var geometry = new THREE.CylinderBufferGeometry(
              radius,
              radius,
              //(temporalScale / this.maxDate) * this.daysAggregation,
              1,
              6
            ); // Area proportional to the number of covid entries, arbitrary height
            var colorMesh = colorScale(value);
            var material = new THREE.MeshStandardMaterial({ color: colorMesh });
            material.transparent = true;
            var cylinder = new THREE.Mesh(geometry, material); //a three js mesh needs a geometry and a material
            cylinder.position.x = xPos;
            cylinder.position.y = yPos;
            cylinder.position.z = z;
            cylinder.rotation.x = Math.PI / 2;
            cylinder.scale.setY(
              (temporalScale /
                (this.currentDates.max - this.currentDates.min)) *
                this.daysAggregation
            );
            //dateToAlti(hexDataDate) + (3 * nbrDaysAgregation) / 2;
            // cylinder.name = hexDataDate;
            cylinder.userData.hexid = this.positionsIndexMap
              .get(xPos)
              .get(yPos);
            cylinder.userData.type = "hex";
            cylinder.userData.color = colorMesh;
            cylinder.userData.date = date;
            if (this.daysAggregation > 1) {
              // cylinder.userData.endDate = Utils.addDaysToDate(
              //   hexDataDate,
              //   nbrDaysAgregation
              // );
            }
            if (meshMap.get(xPos) == null) {
              meshMap.set(xPos, new Map());
            }
            if (meshMap.get(xPos).get(yPos) == null) {
              meshMap.get(xPos).set(yPos, []);
            }

            meshMap.get(xPos).get(yPos).push(cylinder);
            this.group.add(cylinder);
          }
        });
      });
    });
    this.meshMap = meshMap;
    let hex = [];
    for (let i = 1; i <= 6; i++) {
      hex.push([
        this.radius * Math.sin(Math.PI / 6 + i * ((2 * Math.PI) / 6)),
        this.radius * Math.cos(Math.PI / 6 + i * ((2 * Math.PI) / 6)),
      ]);
    }

    let shape = new THREE.Shape();
    shape.moveTo(hex[5][0], hex[5][1]);
    for (let i = 0; i < hex.length; i++) {
      shape.lineTo(hex[i][0], hex[i][1]);
    }
    const shape3d = new THREE.ExtrudeGeometry(shape, {
      depth: 0,
      bevelEnabled: false,
    });
    const points = shape.getPoints();
    const geometryPoints = new THREE.BufferGeometry().setFromPoints(points);

    this.positionsIndexMap.forEach((yMap, xPos) => {
      yMap.forEach((index, yPos) => {
        var materialGrid = new THREE.MeshStandardMaterial({ color: "green" });
        materialGrid.transparent = true;
        materialGrid.opacity = 0.2;
        const mesh = new THREE.Mesh(shape3d, materialGrid);
        mesh.position.x = xPos;
        mesh.position.y = yPos;
        mesh.position.z = 0.1;
        mesh.rotation.z = Math.PI / 2;
        mesh.renderOrder = 1;
        mesh.userData.floorId = index;
        mesh.userData.type = "floor";
        this.floorGroup.add(mesh);
        if (this.floorMeshMap.get(xPos) == null) {
          this.floorMeshMap.set(xPos, new Map());
        }
        this.floorMeshMap.get(xPos).set(yPos, mesh);
        // if (this.meshMap.has(xPos) && this.meshMap.get(xPos).has(yPos)) {
        //   this.meshMap
        //     .get(xPos)
        //     .get(yPos)
        //     .push(mesh);
        // }

        let line = new THREE.Line(
          geometryPoints,
          new THREE.LineBasicMaterial({ color: "black", linewidth: 4 })
        );
        line.rotation.z = Math.PI / 2;
        line.position.x = xPos;
        line.position.y = yPos;
        line.position.z = 0.1;
        line.renderOrder = 2;
        line.userData.type = "floor";
        this.floorGroup.add(line);
        // this.meshMap
        //   .get(xPos)
        //   .get(yPos)
        //   .push(line);
      });
    });
    this.group.visible = false;
    this.floorGroup.visible = false;
  }

  updateMeshes(temporalScale, currentDates) {
    // for (let children of this.group.children) {
    //   this.group.remove(children);
    // }
    this.group = new THREE.Group();
    this.currentDates = currentDates;
    let dates = [];
    for (
      let i = this.currentDates.min;
      i < this.currentDates.max;
      i += this.daysAggregation
    ) {
      dates.push(i);
    }

    let aggregatedMap = this.temporalAggregation(dates, this.positionsMap);
    this.maxValue = this.getMaxValue(aggregatedMap);
    let maxArea = Utils.hexagonArea(this.radius);
    let areaScale = d3
      .scaleLinear()
      .domain([0, this.maxValue.value])
      .range([0, maxArea]);

    let timeScale = d3
      .scaleLinear()
      .domain([this.currentDates.min, this.currentDates.max])
      .range([0, temporalScale]);
    let colorScale = d3.scaleQuantize(
      [0, this.maxValue.value],
      d3.schemeGreens[9]
    );

    let meshMap = new Map();
    aggregatedMap.forEach((xMap, date) => {
      let z = timeScale(date);
      xMap.forEach((yMap, xPos) => {
        yMap.forEach((value, yPos) => {
          if (value != 0) {
            let radius = Utils.rforHexagonArea(areaScale(value));
            var geometry = new THREE.CylinderBufferGeometry(
              radius,
              radius,
              //(temporalScale / this.maxDate) * this.daysAggregation,
              1,
              6
            ); // Area proportional to the number of covid entries, arbitrary height
            var colorMesh = colorScale(value);
            var material = new THREE.MeshStandardMaterial({ color: colorMesh });
            material.transparent = true;
            var cylinder = new THREE.Mesh(geometry, material); //a three js mesh needs a geometry and a material
            cylinder.position.x = xPos;
            cylinder.position.y = yPos;
            cylinder.position.z = z;
            cylinder.rotation.x = Math.PI / 2;
            cylinder.scale.setY(
              (temporalScale /
                (this.currentDates.max - this.currentDates.min)) *
                this.daysAggregation
            );
            //dateToAlti(hexDataDate) + (3 * nbrDaysAgregation) / 2;
            // cylinder.name = hexDataDate;
            cylinder.userData.hexid = this.positionsIndexMap
              .get(xPos)
              .get(yPos);
            cylinder.userData.type = "hex";
            cylinder.userData.color = colorMesh;
            cylinder.userData.date = date;
            if (this.daysAggregation > 1) {
              // cylinder.userData.endDate = Utils.addDaysToDate(
              //   hexDataDate,
              //   nbrDaysAgregation
              // );
            }
            if (meshMap.get(xPos) == null) {
              meshMap.set(xPos, new Map());
            }
            if (meshMap.get(xPos).get(yPos) == null) {
              meshMap.get(xPos).set(yPos, []);
            }

            meshMap.get(xPos).get(yPos).push(cylinder);
            this.group.add(cylinder);
          }
        });
      });
    });
    this.group.visible = false;
    this.meshMap = meshMap;
  }

  updateTemporalScale(temporalScale) {
    let timeScale = d3
      .scaleLinear()
      .domain([this.currentDates.min, this.currentDates.max])
      .range([0, temporalScale]);
    this.meshMap.forEach((yMap, xPos) => {
      yMap.forEach((meshes, ypos) => {
        for (let mesh of meshes) {
          let z = timeScale(mesh.userData.date);
          mesh.position.z = z;
          mesh.scale.setY(
            (temporalScale / (this.currentDates.max - this.currentDates.min)) *
              this.daysAggregation
          );
        }
      });
    });
  }
}
