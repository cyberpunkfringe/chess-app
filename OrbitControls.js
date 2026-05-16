//------------------------------------------------------------
// Custom OrbitControls (FloatTunes)
//   - Left mouse: orbit
//   - Wheel: zoom
//   - No right mouse handling (free for MovementMod)
//   - Exposes: controls.target, controls.update()
// ------------------------------------------------------------
(function () {

  function OrbitControls(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // Public API
    this.target = new THREE.Vector3(0, 0, 0);
    this.enableDamping = false;
    this.dampingFactor = 0.1;
    this.rotateSpeed = 0.8;
    this.zoomSpeed = 1.0;
    this.minDistance = 50;
    this.maxDistance = 4000;

    // Internal state
    this._spherical = new THREE.Spherical();
    this._sphericalDelta = new THREE.Spherical(0, 0, 0);
    this._state = null; // 'rotate' | null
    this._lastX = 0;
    this._lastY = 0;

    // Init spherical from current camera position
    const offset = new THREE.Vector3().copy(this.camera.position).sub(this.target);
    this._spherical.setFromVector3(offset);

    // ⭐ PUBLIC MOBILE ROTATION API
    this.rotateLeft = (angle) => {
      this._sphericalDelta.theta -= angle;
    };

    this.rotateUp = (angle) => {
      this._sphericalDelta.phi -= angle;
    };

    // Bind handlers
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp   = this._onMouseUp.bind(this);
    this._onWheel     = this._onWheel.bind(this);

    domElement.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("mousemove", this._onMouseMove);
    domElement.addEventListener("wheel", this._onWheel, { passive: false });
  }

  OrbitControls.prototype.dispose = function () {
    this.domElement.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("mouseup", this._onMouseUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    this.domElement.removeEventListener("wheel", this._onWheel);
  };

  OrbitControls.prototype._onMouseDown = function (e) {
    if (e.button === 0) {
      this._state = "rotate";
      this._lastX = e.clientX;
      this._lastY = e.clientY;
    }
  };

  OrbitControls.prototype._onMouseMove = function (e) {
    if (this._state !== "rotate") return;

    const dx = e.clientX - this._lastX;
    const dy = e.clientY - this._lastY;
    this._lastX = e.clientX;
    this._lastY = e.clientY;

    const rotSpeed = this.rotateSpeed * 0.005;

    this._sphericalDelta.theta -= dx * rotSpeed;
    this._sphericalDelta.phi   -= dy * rotSpeed;
  };

  OrbitControls.prototype._onMouseUp = function () {
    this._state = null;
  };

  OrbitControls.prototype._onWheel = function (e) {
    e.preventDefault();
    const delta = (e.deltaY > 0 ? 1 : -1) * this.zoomSpeed * 20;
    this._spherical.radius += delta;
    this._spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this._spherical.radius));
  };

  OrbitControls.prototype.update = function () {
    // Apply rotation deltas
    this._spherical.theta += this._sphericalDelta.theta;
    this._spherical.phi   += this._sphericalDelta.phi;

    // Clamp polar angle
    const EPS = 0.000001;
    this._spherical.phi = Math.max(EPS, Math.min(Math.PI - EPS, this._spherical.phi));

    // Reset delta
    this._sphericalDelta.set(0, 0, 0);

    // Convert back to cartesian
    const offset = new THREE.Vector3().setFromSpherical(this._spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  };

  THREE.OrbitControls = OrbitControls;

})();
