var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
 
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
scene.fog = new THREE.Fog(0x1a1a1a, 120, 320);
 
var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
var sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(10, 20, 10);
scene.add(sun);
 
scene.add(new THREE.GridHelper(400, 400, 0x555555, 0x333333));
var floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  
);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = -0.02;
scene.add(floorMesh);
 
var red   = new THREE.MeshStandardMaterial({ color: 0xdd1111, roughness: 0.4, metalness: 0.1 });
var black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
 
function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}
function addTo(parent, mesh, x, y, z) {
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
 
var car = new THREE.Group();
car.position.y = 0.4;
scene.add(car);
 
(function buildBody() {
  var shape = new THREE.Shape();
  shape.moveTo(2.948, 0.00);
  shape.lineTo(2.948, 0.10);
  shape.lineTo(2.4, 0.18);
  shape.bezierCurveTo(1.2, 0.30, 0.2, 0.44, -0.2, 0.44);
  shape.bezierCurveTo(-0.4, 0.50, -1.5, 0.72, -2.1, 0.68);
  shape.lineTo(-2.1, 0.00);
  shape.lineTo(2.5, 0.00);
  var geo = new THREE.ExtrudeGeometry(shape, { depth: 1.0, bevelEnabled: false });
  geo.translate(0, 0, -0.5);
  car.add(new THREE.Mesh(geo, red));
})();
 
var cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), black);
cockpit.scale.set(1.05, 0.55, 0.88);
cockpit.position.set(0.12, 0.40, 0);
cockpit.rotation.z = 9.2;
car.add(cockpit);
 
addTo(car, box(0.9, 0.09, 2.1, red), 2.5, 0.04, 0);
addTo(car, box(0.12, 0.72, 0.42, red), -1.95, 0.62, 0);
addTo(car, box(0.55, 0.14, 1.52, red), -1.95, 1.04, 0);
addTo(car, box(0.55, 0.10, 1.52, red), -1.95, 1.20, 0);
addTo(car, box(0.55, 0.55, 0.09, red), -1.95, 0.975, 0.77);
addTo(car, box(0.55, 0.55, 0.09, red), -1.95, 0.975, -0.77);
 
function makeFrontWheel(x, z) {
  var pivot = new THREE.Group();
  pivot.position.set(x, 0, z);
  car.add(pivot);
  var tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.40, 32), black);
  tyre.rotation.x = Math.PI / 2;
  pivot.add(tyre);
  return { pivot: pivot, tyre: tyre };
}
function makeRearWheel(x, z) {
  var tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.52, 32), black);
  tyre.rotation.x = Math.PI / 2;
  tyre.position.set(x, 0, z);
  car.add(tyre);
  return tyre;
}
var frontWheels = [makeFrontWheel(1.30, 0.70), makeFrontWheel(1.30, -0.70)];
var rearWheels  = [makeRearWheel(-1.35, 0.76), makeRearWheel(-1.35, -0.76)];
 
var TRACK_RX = 170, TRACK_RZ = 155, TRACK_W = 28, WALL_H = 2.5, WALL_T = 0.8;
var OUTER_RX = TRACK_RX + TRACK_W / 2;
var OUTER_RZ = TRACK_RZ + TRACK_W / 2;
var INNER_RX = TRACK_RX - TRACK_W / 2;
var INNER_RZ = TRACK_RZ - TRACK_W / 2;
 
var trackMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.9 });
var wallMatO = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });
var wallMatI = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.5 });
 
var NSEG = 160;
 
function buildTrackSurface() {
  var verts = [], uvs = [], indices = [];
  for (var i = 0; i <= NSEG; i++) {
    var t = (i / NSEG) * Math.PI * 2;
    var cos = Math.cos(t), sin = Math.sin(t);
    verts.push(OUTER_RX * cos, 0, OUTER_RZ * sin);
    verts.push(INNER_RX * cos, 0, INNER_RZ * sin);
    uvs.push(i / NSEG, 0);
    uvs.push(i / NSEG, 1);
  }
  for (var i = 0; i < NSEG; i++) {
    var b = i * 2;
    indices.push(b, b+1, b+2, b+1, b+3, b+2);
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  var mesh = new THREE.Mesh(geo, trackMat);
  mesh.position.y = -0.005;
  scene.add(mesh);
}
buildTrackSurface();
 
function buildWallRing(rx, rz, label) {
  var mat = label === 'outer' ? wallMatO : wallMatI;
  var verts = [], uvs = [], indices = [];
  var ht2 = WALL_H / 2;
  for (var i = 0; i <= NSEG; i++) {
    var t = (i / NSEG) * Math.PI * 2;
    var cos = Math.cos(t), sin = Math.sin(t);
    var hw = WALL_T / 2;
    var sx = (label === 'outer') ? -hw : hw;
    for (var side = -1; side <= 1; side += 2) {
      var ex = cos * (rx + sx * side);
      var ez = sin * (rz + sx * side);
      verts.push(ex, -ht2, ez);
      verts.push(ex,  ht2, ez);
      uvs.push(i / NSEG, (side + 1) / 2);
      uvs.push(i / NSEG, (side + 1) / 2);
    }
  }
  for (var i = 0; i < NSEG; i++) {
    var b = i * 4;
    indices.push(b, b+4, b+1, b+1, b+4, b+5);
    indices.push(b+2, b+3, b+6, b+3, b+7, b+6);
    indices.push(b, b+1, b+2, b+1, b+3, b+2);
    indices.push(b+4, b+6, b+5, b+5, b+6, b+7);
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  var mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WALL_H / 2;
  scene.add(mesh);
}
buildWallRing(OUTER_RX, OUTER_RZ, 'outer');
buildWallRing(INNER_RX, INNER_RZ, 'inner');
 
var keys = {};
window.addEventListener('keydown', function(e) {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') e.preventDefault();
  if (e.key.toLowerCase() === 'r') resetCar();
});
window.addEventListener('keyup', function(e) { keys[e.key.toLowerCase()] = false; });
 
var carTurnSpeed = 0.03;
var carAngle = 0;
var velocity = 0;
var maxSpeedFwd = 200, maxSpeedBwd = 30;
var accelFwd  = maxSpeedFwd / 3.0, accelBwd = maxSpeedBwd / 3.0;
var brakeRate = 60, hardBrakeRate = 180, decelRate = 18;
var MAX_STEER = Math.PI / 10;
var steerAngle = 0, steerReturnSpeed = 4.0;
var lastTimestamp = null;
var carY = 0.4;
var CAR_FLOOR_OFFSET = 0.4;
 
function resetCar() {
  velocity = 0; carAngle = Math.PI / 2; steerAngle = 0;
  carY = CAR_FLOOR_OFFSET;
  car.position.set(TRACK_RX, carY, 0);
  car.quaternion.set(0, 0, 0, 1);
  car.rotation.y = carAngle;
}
resetCar();

var SKID_FADE = 30.0, MAX_SKID = 1200, skidSegs = [];
function addSkid(wx, wz, angle) {
  var geo  = new THREE.PlaneGeometry(0.28, 0.55);
  var mat  = new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.85, depthWrite: false });
  var mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = angle + Math.PI / 2;
  mesh.position.set(wx, 0.002, wz);
  scene.add(mesh);
  skidSegs.push({ mesh: mesh, mat: mat, born: performance.now() / 1000 });
  if (skidSegs.length > MAX_SKID) {
    var old = skidSegs.shift();
    scene.remove(old.mesh);
    old.mesh.geometry.dispose();
    old.mat.dispose();
  }
}

function updateSkidFade(now) {
  for (var i = skidSegs.length - 1; i >= 0; i--) {
    var s = skidSegs[i];
    var age = now - s.born;
    if (age >= SKID_FADE) {
      scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      s.mat.dispose();
      skidSegs.splice(i, 1);
    } else {
      s.mat.opacity = 0.85 * (1 - age / SKID_FADE);
    }
  }
}
 
function getRearWheelWorldPos(lx, lz) {
  var cos = Math.cos(carAngle), sin = Math.sin(carAngle);
  return { x: car.position.x + cos * lx + sin * lz,
           z: car.position.z - sin * lx + cos * lz };
}
function speedToUnits(kmh) { return (kmh / 3.6) * 0.04; }
 
function checkWallCollision() {
  var px = car.position.x, pz = car.position.z;
  var normX = px / OUTER_RX, normZ = pz / OUTER_RZ;
  var ellDist = normX * normX + normZ * normZ;
  var inormX = px / INNER_RX, inormZ = pz / INNER_RZ;
  var innerEllDist = inormX * inormX + inormZ * inormZ;
 
  if (ellDist >= 1.0) {
    var nx = normX / Math.sqrt(ellDist);
    var nz = normZ / Math.sqrt(ellDist);
    var newPx = OUTER_RX * nx - nx * (WALL_T + 1.5);
    var newPz = OUTER_RZ * nz - nz * (WALL_T + 1.5);
    var newNormX = newPx / OUTER_RX, newNormZ = newPz / OUTER_RZ;
    var newEll = newNormX * newNormX + newNormZ * newNormZ;
    while (newEll >= 0.98) {
      newPx -= nx * 0.1; newPz -= nz * 0.1;
      newNormX = newPx / OUTER_RX; newNormZ = newPz / OUTER_RZ;
      newEll = newNormX * newNormX + newNormZ * newNormZ;
    }
    car.position.x = newPx;
    car.position.z = newPz;
    velocity *= -0.3;
    if (Math.abs(velocity) < 5) velocity = 0;
    return true;
  }
 
  if (innerEllDist <= 1.0) {
    var nx2 = inormX / Math.sqrt(Math.max(innerEllDist, 0.0001));
    var nz2 = inormZ / Math.sqrt(Math.max(innerEllDist, 0.0001));
    car.position.x = INNER_RX * nx2 + nx2 * (WALL_T + 1.5);
    car.position.z = INNER_RZ * nz2 + nz2 * (WALL_T + 1.5);
    velocity *= -0.3;
    if (Math.abs(velocity) < 5) velocity = 0;
    return true;
  }
  return false;
}
 
function updateCarMovement(dt) {
  carY = CAR_FLOOR_OFFSET;
  car.position.y = carY;
  car.rotation.y = carAngle;
 
  var braking = keys[' '];
  var wantDir = (keys['w'] || keys['arrowup']) ? 1 : ((keys['s'] || keys['arrowdown']) ? -1 : 0);
  if (braking) {
    if (velocity > 0) velocity = Math.max(0, velocity - hardBrakeRate * dt);
    else if (velocity < 0) velocity = Math.min(0, velocity + hardBrakeRate * dt);
  } else if (wantDir === 1) {
    velocity = velocity < 0 ? Math.min(0, velocity + brakeRate * dt) : Math.min(maxSpeedFwd, velocity + accelFwd * dt);
  } else if (wantDir === -1) {
    velocity = velocity > 0 ? Math.max(0, velocity - brakeRate * dt) : Math.max(-maxSpeedBwd, velocity - accelBwd * dt);
  } else {
    if (velocity > 0) velocity = Math.max(0, velocity - decelRate * dt);
    else if (velocity < 0) velocity = Math.min(0, velocity + decelRate * dt);
  }
 
  var turning = false;
  if (velocity !== 0) {
    var units = speedToUnits(Math.abs(velocity));
    var dir   = velocity > 0 ? 1 : -1;
    if (keys['a'] || keys['arrowleft']) {
      carAngle += carTurnSpeed * dir;
      steerAngle = Math.min(MAX_STEER, steerAngle + MAX_STEER * dt * 3);
      turning = true;
    }
    if (keys['d'] || keys['arrowright']) {
      carAngle -= carTurnSpeed * dir;
      steerAngle = Math.max(-MAX_STEER, steerAngle - MAX_STEER * dt * 3);
      turning = true;
    }
    car.position.x += Math.cos(carAngle) * units * dir;
    car.position.z -= Math.sin(carAngle) * units * dir;
 
    var wheelSpin = (units * dir) / 0.38;
    frontWheels.forEach(function(w) { w.tyre.rotation.y += wheelSpin; });
    rearWheels.forEach(function(w) { w.rotation.y += wheelSpin; });
  }
 
  if (!turning) {
    if (steerAngle > 0) steerAngle = Math.max(0, steerAngle - steerReturnSpeed * dt);
    else if (steerAngle < 0) steerAngle = Math.min(0, steerAngle + steerReturnSpeed * dt);
  }
  frontWheels.forEach(function(w) { w.pivot.rotation.y = steerAngle; });
 
  if (braking && Math.abs(velocity) > 4) {
    var rw1 = getRearWheelWorldPos(-1.35, 0.76);
    var rw2 = getRearWheelWorldPos(-1.35, -0.76);
    addSkid(rw1.x, rw1.z, carAngle);
    addSkid(rw2.x, rw2.z, carAngle);
  }
 
  checkWallCollision();
  updateSpeedometer(Math.abs(velocity));
}
 
var sph = { th: 0.7, ph: 0.9, r: 14 };
 
function updateCam() {
  sph.ph = Math.max(0.1, Math.min(1.4, sph.ph));
  sph.r  = Math.max(4, Math.min(80, sph.r));
  camera.position.set(
    car.position.x + sph.r * Math.sin(sph.ph) * Math.sin(sph.th),
    car.position.y + sph.r * Math.cos(sph.ph),
    car.position.z + sph.r * Math.sin(sph.ph) * Math.cos(sph.th)
  );
  camera.lookAt(car.position.x, car.position.y + 0.5, car.position.z);
}
 
var dragging = false, px = 0, py = 0;
renderer.domElement.addEventListener('mousedown', function(e) { dragging = true; px = e.clientX; py = e.clientY; });
window.addEventListener('mouseup', function() { dragging = false; });
window.addEventListener('mousemove', function(e) {
  if (!dragging) return;
  sph.th -= (e.clientX - px) * 0.007;
  sph.ph -= (e.clientY - py) * 0.007;
  px = e.clientX; py = e.clientY;
  updateCam();
});
renderer.domElement.addEventListener('wheel', function(e) { sph.r += e.deltaY * 0.02; updateCam(); }, { passive: true });
 
var spdDiv = document.getElementById('speedometer');
function updateSpeedometer(speed) {
  spdDiv.textContent = (isNaN(speed) ? 0 : Math.round(speed)) + ' km/h';
}
 
function animate(timestamp) {
  requestAnimationFrame(animate);
  var dt = 0;
  if (lastTimestamp !== null) {
    dt = (timestamp - lastTimestamp) / 1000;
    if (dt > 0.1) dt = 0.1;
  }
  lastTimestamp = timestamp;
  updateCarMovement(dt);
  updateSkidFade(performance.now() / 1000);
  updateCam();
  renderer.render(scene, camera);
}
animate();
 
window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});