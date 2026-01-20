/**
 * Vanilla JS LiquidEther
 * Exact conversion from the provided React source.
 */

class LiquidEther {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            mouseForce: options.mouseForce || 20,
            cursorSize: options.cursorSize || 100,
            isViscous: options.isViscous || false,
            viscous: options.viscous || 30,
            iterationsViscous: options.iterationsViscous || 32,
            iterationsPoisson: options.iterationsPoisson || 32,
            dt: options.dt || 0.014,
            BFECC: options.BFECC !== undefined ? options.BFECC : true,
            resolution: options.resolution || 0.5,
            isBounce: options.isBounce || false,
            colors: options.colors || ['#5227FF', '#FF9FFC', '#B19EEF'],
            autoDemo: options.autoDemo !== undefined ? options.autoDemo : true,
            autoSpeed: options.autoSpeed || 0.5,
            autoIntensity: options.autoIntensity || 2.2,
            takeoverDuration: options.takeoverDuration || 0.25,
            autoResumeDelay: options.autoResumeDelay || 1000,
            autoRampDuration: options.autoRampDuration || 0.6
        };

        this.isVisible = true;
        this.lastUserInteraction = performance.now();
        this.rafId = null;

        this.init();
    }

    init() {
        if (typeof THREE === 'undefined') {
            console.error('Three.js is required for LiquidEther');
            return;
        }

        // --- SHADERS ---
        const face_vert = `attribute vec3 position; uniform vec2 px; uniform vec2 boundarySpace; varying vec2 uv; precision highp float; void main(){ vec3 pos = position; vec2 scale = 1.0 - boundarySpace * 2.0; pos.xy = pos.xy * scale; uv = vec2(0.5)+(pos.xy)*0.5; gl_Position = vec4(pos, 1.0); }`;
        const line_vert = `attribute vec3 position; uniform vec2 px; precision highp float; varying vec2 uv; void main(){ vec3 pos = position; uv = 0.5 + pos.xy * 0.5; vec2 n = sign(pos.xy); pos.xy = abs(pos.xy) - px * 1.0; pos.xy *= n; gl_Position = vec4(pos, 1.0); }`;
        const mouse_vert = `precision highp float; attribute vec3 position; attribute vec2 uv; uniform vec2 center; uniform vec2 scale; uniform vec2 px; varying vec2 vUv; void main(){ vec2 pos = position.xy * scale * 2.0 * px + center; vUv = uv; gl_Position = vec4(pos, 0.0, 1.0); }`;
        const advection_frag = `precision highp float; uniform sampler2D velocity; uniform float dt; uniform bool isBFECC; uniform vec2 fboSize; uniform vec2 px; varying vec2 uv; void main(){ vec2 ratio = max(fboSize.x, fboSize.y) / fboSize; if(isBFECC == false){ vec2 vel = texture2D(velocity, uv).xy; vec2 uv2 = uv - vel * dt * ratio; vec2 newVel = texture2D(velocity, uv2).xy; gl_FragColor = vec4(newVel, 0.0, 0.0); } else { vec2 spot_new = uv; vec2 vel_old = texture2D(velocity, uv).xy; vec2 spot_old = spot_new - vel_old * dt * ratio; vec2 vel_new1 = texture2D(velocity, spot_old).xy; vec2 spot_new2 = spot_old + vel_new1 * dt * ratio; vec2 error = spot_new2 - spot_new; vec2 spot_new3 = spot_new - error / 2.0; vec2 vel_2 = texture2D(velocity, spot_new3).xy; vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio; vec2 newVel2 = texture2D(velocity, spot_old2).xy; gl_FragColor = vec4(newVel2, 0.0, 0.0); } }`;
        const color_frag = `precision highp float; uniform sampler2D velocity; uniform sampler2D palette; uniform vec4 bgColor; varying vec2 uv; void main(){ vec2 vel = texture2D(velocity, uv).xy; float lenv = clamp(length(vel), 0.0, 1.0); vec3 c = texture2D(palette, vec2(lenv, 0.5)).rgb; vec3 outRGB = mix(bgColor.rgb, c, lenv); float outA = mix(bgColor.a, 1.0, lenv); gl_FragColor = vec4(outRGB, outA); }`;
        const divergence_frag = `precision highp float; uniform sampler2D velocity; uniform float dt; uniform vec2 px; varying vec2 uv; void main(){ float x0 = texture2D(velocity, uv-vec2(px.x, 0.0)).x; float x1 = texture2D(velocity, uv+vec2(px.x, 0.0)).x; float y0 = texture2D(velocity, uv-vec2(0.0, px.y)).y; float y1 = texture2D(velocity, uv+vec2(0.0, px.y)).y; float divergence = (x1 - x0 + y1 - y0) / 2.0; gl_FragColor = vec4(divergence / dt); }`;
        const externalForce_frag = `precision highp float; uniform vec2 force; uniform vec2 center; uniform vec2 scale; uniform vec2 px; varying vec2 vUv; void main(){ vec2 circle = (vUv - 0.5) * 2.0; float d = 1.0 - min(length(circle), 1.0); d *= d; gl_FragColor = vec4(force * d, 0.0, 1.0); }`;
        const poisson_frag = `precision highp float; uniform sampler2D pressure; uniform sampler2D divergence; uniform vec2 px; varying vec2 uv; void main(){ float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r; float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r; float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r; float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r; float div = texture2D(divergence, uv).r; float newP = (p0 + p1 + p2 + p3) / 4.0 - div; gl_FragColor = vec4(newP); }`;
        const pressure_frag = `precision highp float; uniform sampler2D pressure; uniform sampler2D velocity; uniform vec2 px; uniform float dt; varying vec2 uv; void main(){ float step = 1.0; float p0 = texture2D(pressure, uv + vec2(px.x * step, 0.0)).r; float p1 = texture2D(pressure, uv - vec2(px.x * step, 0.0)).r; float p2 = texture2D(pressure, uv + vec2(0.0, px.y * step)).r; float p3 = texture2D(pressure, uv - vec2(0.0, px.y * step)).r; vec2 v = texture2D(velocity, uv).xy; vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5; v = v - gradP * dt; gl_FragColor = vec4(v, 0.0, 1.0); }`;
        const viscous_frag = `precision highp float; uniform sampler2D velocity; uniform sampler2D velocity_new; uniform float v; uniform vec2 px; uniform float dt; varying vec2 uv; void main(){ vec2 old = texture2D(velocity, uv).xy; vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0.0)).xy; vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0.0)).xy; vec2 new2 = texture2D(velocity_new, uv + vec2(0.0, px.y * 2.0)).xy; vec2 new3 = texture2D(velocity_new, uv - vec2(0.0, px.y * 2.0)).xy; vec2 newv = 4.0 * old + v * dt * (new0 + new1 + new2 + new3); newv /= 4.0 * (1.0 + v * dt); gl_FragColor = vec4(newv, 0.0, 0.0); }`;

        // --- PALETTE ---
        const makePaletteTexture = (stops) => {
            const arr = stops.length === 1 ? [stops[0], stops[0]] : stops;
            const w = arr.length;
            const data = new Uint8Array(w * 4);
            arr.forEach((hex, i) => {
                const c = new THREE.Color(hex);
                data[i * 4 + 0] = Math.round(c.r * 255);
                data[i * 4 + 1] = Math.round(c.g * 255);
                data[i * 4 + 2] = Math.round(c.b * 255);
                data[i * 4 + 3] = 255;
            });
            const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
            tex.needsUpdate = true;
            return tex;
        };
        const paletteTex = makePaletteTexture(this.options.colors);

        // --- COMMON CLASS ---
        class CommonClass {
            constructor() {
                this.width = 0; this.height = 0; this.clock = null; this.renderer = null; this.time = 0;
            }
            init(container) {
                this.container = container;
                const rect = container.getBoundingClientRect();
                this.width = rect.width; this.height = rect.height;
                this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
                this.renderer.setClearColor(0x000000, 0);
                this.renderer.setSize(this.width, this.height);
                this.renderer.domElement.style.position = 'absolute';
                this.renderer.domElement.style.top = '0';
                this.renderer.domElement.style.left = '0';
                this.renderer.domElement.style.pointerEvents = 'none';
                container.appendChild(this.renderer.domElement);
                this.clock = new THREE.Clock();
                this.clock.start();
            }
            resize() {
                const rect = this.container.getBoundingClientRect();
                this.width = rect.width; this.height = rect.height;
                this.renderer.setSize(this.width, this.height);
            }
            update() { this.delta = this.clock.getDelta(); this.time += this.delta; }
        }
        const Common = new CommonClass();
        Common.init(this.container);

        // --- MOUSE CLASS ---
        class MouseClass {
            constructor(parent) {
                this.parent = parent;
                this.coords = new THREE.Vector2(); this.coords_old = new THREE.Vector2(); this.diff = new THREE.Vector2();
                this.isAutoActive = false; this.hasUserControl = false;
                this.onInteract = null;
                this.init();
            }
            init() {
                const onMove = (e) => {
                    const rect = this.parent.container.getBoundingClientRect();
                    const cx = (e.clientX || (e.touches ? e.touches[0].clientX : 0));
                    const cy = (e.clientY || (e.touches ? e.touches[0].clientY : 0));
                    const nx = (cx - rect.left) / rect.width;
                    const ny = (cy - rect.top) / rect.height;

                    this.parent.lastUserInteraction = performance.now();
                    this.coords.set(nx * 2 - 1, -(ny * 2 - 1));
                    this.hasUserControl = true;
                    if (this.onInteract) this.onInteract();
                };
                this.parent.container.parentElement.addEventListener('mousemove', onMove);
                this.parent.container.parentElement.addEventListener('touchmove', onMove, { passive: true });
            }
            update() {
                this.diff.subVectors(this.coords, this.coords_old);
                this.coords_old.copy(this.coords);
                if (this.isAutoActive) this.diff.multiplyScalar(this.parent.options.autoIntensity);
            }
        }
        const Mouse = new MouseClass(this);

        // --- AUTO DRIVER ---
        class AutoDriver {
            constructor(mouse, parent) {
                this.mouse = mouse; this.parent = parent;
                this.current = new THREE.Vector2(); this.target = new THREE.Vector2();
                this.active = false; this.lastTime = performance.now();
            }
            update() {
                const now = performance.now();
                if (now - this.parent.lastUserInteraction < this.parent.options.autoResumeDelay) {
                    this.active = false; this.mouse.isAutoActive = false; return;
                }
                if (!this.active) { this.active = true; this.current.copy(this.mouse.coords); this.lastTime = now; }
                this.mouse.isAutoActive = true;
                const dt = (now - this.lastTime) / 1000; this.lastTime = now;
                if (this.current.distanceTo(this.target) < 0.1) this.target.set(Math.random() * 2 - 1, Math.random() * 2 - 1);
                this.current.lerp(this.target, this.parent.options.autoSpeed * dt);
                this.mouse.coords.copy(this.current);
            }
        }
        const driver = new AutoDriver(Mouse, this);

        // --- SIMULATION ---
        const fboW = Math.round(Common.width * this.options.resolution);
        const fboH = Math.round(Common.height * this.options.resolution);
        const type = /(iPad|iPhone|iPod)/i.test(navigator.userAgent) ? THREE.HalfFloatType : THREE.FloatType;
        const createFBO = () => new THREE.WebGLRenderTarget(fboW, fboH, { type, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });

        const fbos = { v0: createFBO(), v1: createFBO(), div: createFBO(), p0: createFBO(), p1: createFBO() };
        const cellScale = new THREE.Vector2(1 / fboW, 1 / fboH);

        const createPass = (vert, frag, uniforms, output) => {
            const scene = new THREE.Scene(); const camera = new THREE.Camera();
            const mat = new THREE.RawShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms });
            scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
            return { scene, camera, mat, output, update: (out) => { Common.renderer.setRenderTarget(out || output); Common.renderer.render(scene, camera); Common.renderer.setRenderTarget(null); } };
        };

        const advection = createPass(face_vert, advection_frag, { boundarySpace: { value: cellScale }, px: { value: cellScale }, fboSize: { value: new THREE.Vector2(fboW, fboH) }, velocity: { value: null }, dt: { value: this.options.dt }, isBFECC: { value: true } }, fbos.v1);
        const externalForce = createPass(mouse_vert, externalForce_frag, { px: { value: cellScale }, force: { value: new THREE.Vector2() }, center: { value: new THREE.Vector2() }, scale: { value: new THREE.Vector2(this.options.cursorSize, this.options.cursorSize) } }, fbos.v1);
        externalForce.mat.transparent = true; externalForce.mat.blending = THREE.AdditiveBlending;
        const divergence = createPass(face_vert, divergence_frag, { boundarySpace: { value: cellScale }, velocity: { value: null }, px: { value: cellScale }, dt: { value: this.options.dt } }, fbos.div);
        const poisson = createPass(face_vert, poisson_frag, { boundarySpace: { value: cellScale }, pressure: { value: null }, divergence: { value: fbos.div.texture }, px: { value: cellScale } }, fbos.p1);
        const pressure = createPass(face_vert, pressure_frag, { boundarySpace: { value: cellScale }, pressure: { value: null }, velocity: { value: null }, px: { value: cellScale }, dt: { value: this.options.dt } }, fbos.v0);
        const output = createPass(face_vert, color_frag, { velocity: { value: fbos.v0.texture }, palette: { value: paletteTex }, bgColor: { value: new THREE.Vector4(0, 0, 0, 0) } }, null);

        // --- LOOP ---
        const loop = () => {
            if (this.options.autoDemo) driver.update();
            Mouse.update(); Common.update();

            advection.mat.uniforms.velocity.value = fbos.v0.texture; advection.update();
            externalForce.mat.uniforms.force.value.set(Mouse.diff.x * this.options.mouseForce, Mouse.diff.y * this.options.mouseForce);
            externalForce.mat.uniforms.center.value.copy(Mouse.coords); externalForce.update();
            divergence.mat.uniforms.velocity.value = fbos.v1.texture; divergence.update();

            for (let i = 0; i < this.options.iterationsPoisson; i++) {
                const src = i % 2 === 0 ? fbos.p0.texture : fbos.p1.texture;
                const dst = i % 2 === 0 ? fbos.p1 : fbos.p0;
                poisson.mat.uniforms.pressure.value = src; poisson.update(dst);
            }
            pressure.mat.uniforms.velocity.value = fbos.v1.texture;
            pressure.mat.uniforms.pressure.value = fbos.p0.texture; pressure.update();
            output.update();

            this.rafId = requestAnimationFrame(loop);
        };
        loop();

        window.addEventListener('resize', () => { Common.resize(); });
    }
}
