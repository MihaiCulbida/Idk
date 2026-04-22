var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a2a);

var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
var sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(10, 20, 10);
scene.add(sun);
scene.add(new THREE.GridHelper(200, 200, 0xaaaaaa, 0xcccccc));
var floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 })
);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = -0.01;
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

function getGroundHeightAt(wx, wz) {
  return 0;
}

var keys = {};
window.addEventListener('keydown', function(e) {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ') e.preventDefault();
});
window.addEventListener('keyup', function(e) { keys[e.key.toLowerCase()] = false; });

var carTurnSpeed = 0.03;
var carAngle = 0;
var velocity = 0;
var maxSpeedFwd = 120, maxSpeedBwd = 30;
var accelFwd  = maxSpeedFwd / 3.0, accelBwd = maxSpeedBwd / 3.0;
var brakeRate = 60, hardBrakeRate = 180, decelRate = 18;
var MAX_STEER = Math.PI / 10;
var steerAngle = 0, steerReturnSpeed = 4.0;
var lastTimestamp = null;

var carY = 0.4;
var velY = 0;
var onGround = true;
var falling  = false;
var GRAVITY = 12;
var CAR_FLOOR_OFFSET = 0.4;
var EDGE = 99;

function resetCar() {
  falling = false; onGround = true;
  velY = 0; velocity = 0; carAngle = 0; steerAngle = 0;
  carY = CAR_FLOOR_OFFSET;
  car.position.set(0, carY, 0);
  car.quaternion.set(0, 0, 0, 1);
}

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

function updateCarMovement(dt) {
  if (falling) {
    velY -= GRAVITY * dt;
    carY += velY * dt;
    car.position.y = carY;
    if (carY < -30) resetCar();
    updateSpeedometer(0);
    return;
  }

  var groundY = getGroundHeightAt(car.position.x, car.position.z) + CAR_FLOOR_OFFSET;

  if (!onGround) {
    velY -= GRAVITY * dt;
    carY += velY * dt;
    if (carY <= groundY) {
      carY = groundY;
      velY = 0;
      onGround = true;
    }
  } else {
    carY = groundY;
    velY = 0;
  }
  car.position.y = carY;

  var sd = 0.5;
  var yF = getGroundHeightAt(car.position.x + Math.cos(carAngle) * sd, car.position.z - Math.sin(carAngle) * sd);
  var yB = getGroundHeightAt(car.position.x - Math.cos(carAngle) * sd, car.position.z + Math.sin(carAngle) * sd);
  var yR = getGroundHeightAt(car.position.x + Math.sin(carAngle) * sd, car.position.z + Math.cos(carAngle) * sd);
  var yL = getGroundHeightAt(car.position.x - Math.sin(carAngle) * sd, car.position.z - Math.cos(carAngle) * sd);

  var pitch = Math.atan2(yF - yB, sd * 2);
  var roll  = Math.atan2(yR - yL, sd * 2);

  var qYaw   = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), carAngle);
  var qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pitch);
  var qRoll  = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll);

  var targetQ = new THREE.Quaternion();
  targetQ.multiplyQuaternions(qYaw, qPitch);
  targetQ.multiplyQuaternions(targetQ, qRoll);

  car.quaternion.slerp(targetQ, 0.2);

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
  if (velocity !== 0 && onGround) {
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

    var newGround = getGroundHeightAt(car.position.x, car.position.z) + CAR_FLOOR_OFFSET;
    if (newGround < carY - 0.05) { onGround = false; }

    var wheelSpin = (units * dir) / 0.38;
    frontWheels.forEach(function(w) { w.tyre.rotation.y += wheelSpin; });
    rearWheels.forEach(function(w) { w.rotation.y += wheelSpin; });
  }

  if (!turning) {
    if (steerAngle > 0) steerAngle = Math.max(0, steerAngle - steerReturnSpeed * dt);
    else if (steerAngle < 0) steerAngle = Math.min(0, steerAngle + steerReturnSpeed * dt);
  }
  frontWheels.forEach(function(w) { w.pivot.rotation.y = steerAngle; });

  if (braking && Math.abs(velocity) > 4 && onGround) {
    var rw1 = getRearWheelWorldPos(-1.35, 0.76);
    var rw2 = getRearWheelWorldPos(-1.35, -0.76);
    addSkid(rw1.x, rw1.z, carAngle);
    addSkid(rw2.x, rw2.z, carAngle);
  }

  if (Math.abs(car.position.x) > EDGE || Math.abs(car.position.z) > EDGE) {
    falling = true; onGround = false; velY = 0;
  }

  updateSpeedometer(Math.abs(velocity));
}

var sph = { th: 0.7, ph: 0.9, r: 10 };

function updateCam() {
  sph.ph = Math.max(0.1, Math.min(1.4, sph.ph));
  sph.r  = Math.max(3, Math.min(30, sph.r));
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
renderer.domElement.addEventListener('touchstart', function(e) {
  if (e.target.classList.contains('dpad-btn')) return;
  dragging = true; px = e.touches[0].clientX; py = e.touches[0].clientY;
}, { passive: true });
renderer.domElement.addEventListener('touchend', function() { dragging = false; }, { passive: true });
renderer.domElement.addEventListener('touchmove', function(e) {
  if (e.target.classList.contains('dpad-btn')) return;
  if (!dragging) return;
  sph.th -= (e.touches[0].clientX - px) * 0.007;
  sph.ph -= (e.touches[0].clientY - py) * 0.007;
  px = e.touches[0].clientX; py = e.touches[0].clientY;
  updateCam();
}, { passive: false });
updateCam();

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