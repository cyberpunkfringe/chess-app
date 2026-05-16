let hemiLight, dirLight;

function createLighting(scene) {
  // Hemisphere light — ambient sky/ground tone
  hemiLight = new THREE.HemisphereLight(0xffffff, 0x222222, 0.6);
  scene.add(hemiLight);

  // Directional light — main sunlight with shadows
  dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(200, 400, 200);
  dirLight.castShadow = true;

  // Shadow map configuration
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;

  // Shadow camera bounds (controls shadow area)
  const s = 300;
  dirLight.shadow.camera.left = -s;
  dirLight.shadow.camera.right = s;
  dirLight.shadow.camera.top = s;
  dirLight.shadow.camera.bottom = -s;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 1000;

  // Softer shadow edges
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene.add(dirLight);
}

function updateHemiSky(color) {
  hemiLight.color.set(color);
}

function updateHemiGround(color) {
  hemiLight.groundColor.set(color);
}

function updateHemiIntensity(v) {
  hemiLight.intensity = v;
}

function updateDirColor(color) {
  dirLight.color.set(color);
}

function updateDirIntensity(v) {
  dirLight.intensity = v;
}
