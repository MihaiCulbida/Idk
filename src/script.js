var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);
var scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a2a);

var camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
var sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(10, 20, 10);
sun.castShadow = true;
scene.add(sun);
var gridHelper = new THREE.GridHelper(40, 40, 0xaaaaaa, 0xcccccc);
scene.add(gridHelper);
var floorMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.9 })
);
floorMesh.rotation.x = -Math.PI / 2;
floorMesh.position.y = -0.01;
floorMesh.receiveShadow = true;
scene.add(floorMesh);
var red   = new THREE.MeshStandardMaterial({ color: 0xdd1111, roughness: 0.4, metalness: 0.1 });
var black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
var dark  = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });

function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}
function addTo(parent, mesh, x, y, z) {
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

var car = new THREE.Group();
car.position.y = 0.4;
scene.add(car);

(function buildBody() {
  var shape = new THREE.Shape();

  shape.moveTo(2.94,  0.00);
  shape.lineTo(2.94,  0.10);
  shape.lineTo(2.4,   0.18);

  shape.bezierCurveTo(
    1.2, 0.30,
    0.2, 0.44,
   -0.2, 0.44
  );

  shape.bezierCurveTo(
   -0.4, 0.50,
   -1.5, 0.72,
   -2.1, 0.68
  );

  shape.lineTo(-2.1, 0.00);
  shape.lineTo(2.5, 0.00);

  var geo = new THREE.ExtrudeGeometry(shape, { depth: 1.0, bevelEnabled: false });
  geo.translate(0, 0, -0.5);
  var mesh = new THREE.Mesh(geo, red);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  car.add(mesh);
})();

var cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), black);
cockpit.scale.set(1.05, 0.55, 0.88);
cockpit.position.set(0.12, 0.38, 0);
cockpit.castShadow = true;
car.add(cockpit);

addTo(car, box(0.9, 0.09, 2.1, red), 2.5, 0.04, 0);

addTo(car, box(0.12, 0.72, 0.42, red), -1.95, 0.62, 0);
addTo(car, box(0.55, 0.14, 1.52, red), -1.95, 1.04, 0);
addTo(car, box(0.55, 0.10, 1.52, red), -1.95, 1.20, 0);
addTo(car, box(0.55, 0.80, 0.09, red), -1.95, 0.85,  0.77);
addTo(car, box(0.55, 0.80, 0.09, red), -1.95, 0.85, -0.77);

function makeWheel(x, z, isFront) {
  var r  = isFront ? 0.38 : 0.44;
  var tw = isFront ? 0.40 : 0.52;
  var tyre = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, tw, 32),
    black
  );
  tyre.rotation.x = Math.PI / 2;
  tyre.position.set(x, 0, z);
  tyre.castShadow = true;
  car.add(tyre);
}

makeWheel( 1.30,  0.84, true);
makeWheel( 1.30, -0.84, true);
makeWheel(-1.35,  0.90, false);
makeWheel(-1.35, -0.90, false);

var sph = { th: 0.7, ph: 0.9, r: 10 };

function updateCam() {
  sph.ph = Math.max(0.1, Math.min(1.4, sph.ph));
  sph.r  = Math.max(3, Math.min(30, sph.r));
  camera.position.set(
    sph.r * Math.sin(sph.ph) * Math.sin(sph.th),
    sph.r * Math.cos(sph.ph),
    sph.r * Math.sin(sph.ph) * Math.cos(sph.th)
  );
  camera.lookAt(0, 0.5, 0);
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
renderer.domElement.addEventListener('wheel', function(e) {
  sph.r += e.deltaY * 0.02;
  updateCam();
}, { passive: true });

renderer.domElement.addEventListener('touchstart', function(e) {
  dragging = true; px = e.touches[0].clientX; py = e.touches[0].clientY;
}, { passive: true });
renderer.domElement.addEventListener('touchend', function() { dragging = false; }, { passive: true });
renderer.domElement.addEventListener('touchmove', function(e) {
  if (!dragging) return;
  sph.th -= (e.touches[0].clientX - px) * 0.007;
  sph.ph -= (e.touches[0].clientY - py) * 0.007;
  px = e.touches[0].clientX; py = e.touches[0].clientY;
  updateCam();
}, { passive: false });

updateCam();

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', function() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});