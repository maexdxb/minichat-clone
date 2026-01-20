/**
 * Vanilla JS LiquidEther
 * Final "Soft Glow" Version matching the React Bits screenshot.
 */

class LiquidEther {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            mouseForce: options.mouseForce || 80,
            cursorSize: options.cursorSize || 100,
            isViscous: options.isViscous || false,
            viscous: options.viscous || 30,
            iterationsViscous: options.iterationsViscous || 24,
            iterationsPoisson: options.iterationsPoisson || 24,
            dt: options.dt || 0.014,
            BFECC: options.BFECC !== undefined ? options.BFECC : true,
            resolution: options.resolution || 0.4,
            isBounce: options.isBounce || false,
            colors: options.colors || ['#c39da8', '#e694b9', '#91738d'],
            autoDemo: options.autoDemo !== undefined ? options.autoDemo : true,
            autoSpeed: options.autoSpeed || 1.0,
            autoIntensity: options.autoIntensity || 2.5,
            takeoverDuration: options.takeoverDuration || 0.25,
            autoResumeDelay: options.autoResumeDelay || 800,
            autoRampDuration: options.autoRampDuration || 0.6
        };

        this.lastUserInteraction = performance.now();
        this.rafId = null;
        this.init();
    }

    init() {
        if (typeof THREE === 'undefined') return;

        // --- SHADERS ---
        const face_vert = `attribute vec3 position; uniform vec2 px; uniform vec2 boundarySpace; varying vec2 uv; precision highp float; void main(){ vec3 pos = position; vec2 scale = 1.0 - boundarySpace * 2.0; pos.xy = pos.xy * scale; uv = vec2(0.5)+(pos.xy)*0.5; gl_Position = vec4(pos, 1.0); }`;
        const mouse_vert = `precision highp float; attribute vec3 position; attribute vec2 uv; uniform vec2 center; uniform vec2 scale; uniform vec2 px; varying vec2 vUv; void main(){ vec2 pos = position.xy * scale * 2.0 * px + center; vUv = uv; gl_Position = vec4(pos, 0.0, 1.0); }`;
        const advection_frag = `precision highp float; uniform sampler2D velocity; uniform float dt; uniform bool isBFECC; uniform vec2 fboSize; uniform vec2 px; varying vec2 uv; void main(){ vec2 ratio = max(fboSize.x, fboSize.y) / fboSize; if(isBFECC == false){ vec2 vel = texture2D(velocity, uv).xy; vec2 uv2 = uv - vel * dt * ratio; vec2 newVel = texture2D(velocity, uv2).xy; gl_FragColor = vec4(newVel, 0.0, 0.0); } else { vec2 spot_new = uv; vec2 vel_old = texture2D(velocity, uv).xy; vec2 spot_old = spot_new - vel_old * dt * ratio; vec2 vel_new1 = texture2D(velocity, spot_old).xy; vec2 spot_new2 = spot_old + vel_new1 * dt * ratio; vec2 error = spot_new2 - spot_new; vec2 spot_new3 = spot_new - error / 2.0; vec2 vel_2 = texture2D(velocity, spot_new3).xy; vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio; vec2 newVel2 = texture2D(velocity, spot_old2).xy; gl_FragColor = vec4(newVel2, 0.0, 0.0); } }`;

        // OPTIMIZED FOR SOFT GLOWING LOOK
        const color_frag = `precision highp float; uniform sampler2D velocity; uniform sampler2D palette; uniform vec4 bgColor; varying vec2 uv; void main(){ vec2 vel = texture2D(velocity, uv).xy; float lenv = length(vel); float glow = clamp(lenv * 2.0, 0.0, 1.0); glow = pow(glow, 0.8); vec3 c = texture2D(palette, vec2(glow, 0.5)).rgb; gl_FragColor = vec4(c, glow * 0.9); }`;

        const divergence_frag = `precision highp float; uniform sampler2D velocity; uniform float dt; uniform vec2 px; varying vec2 uv; void main(){ float x0 = texture2D(velocity, uv-vec2(px.x, 0.0)).x; float x1 = texture2D(velocity, uv+vec2(px.x, 0.0)).x; float y0 = texture2D(velocity, uv-vec2(0.0, px.y)).y; float y1 = texture2D(velocity, uv+vec2(0.0, px.y)).y; float divergence = (x1 - x0 + y1 - y0) / 2.0; gl_FragColor = vec4(divergence / dt); }`;
        const externalForce_frag = `precision highp float; uniform vec2 force; uniform vec2 center; uniform vec2 scale; uniform vec2 px; varying vec2 vUv; void main(){ vec2 circle = (vUv - 0.5) * 2.0; float d = 1.0 - min(length(circle), 1.0); d = pow(d, 2.0); gl_FragColor = vec4(force * d, 0.0, 1.0); }`;
        const poisson_frag = `precision highp float; uniform sampler2D pressure; uniform sampler2D divergence; uniform vec2 px; varying vec2 uv; void main(){ float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r; float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r; float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r; float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r; float div = texture2D(divergence, uv).r; float newP = (p0 + p1 + p2 + p3) / 4.0 - div; gl_FragColor = vec4(newP); }`;
        const pressure_frag = `precision highp float; uniform sampler2D pressure; uniform sampler2D velocity; uniform vec2 px; uniform float dt; varying vec2 uv; void main(){ float step = 1.0; float p0 = texture2D(pressure, uv + vec2(px.x * step, 0.0)).r; float p1 = texture2D(pressure, uv - vec2(px.x * step, 0.0)).r; float p2 = texture2D(pressure, uv + vec2(0.0, px.y * step)).r; float p3 = texture2D(pressure, uv - vec2(0.0, px.y * step)).r; vec2 v = texture2D(velocity, uv).xy; vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5; v = v - gradP * dt; gl_FragColor = vec4(v, 0.0, 1.0); }`;

        // --- TOOLS ---
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

        // --- RENDERER SETUP ---
        const rect = this.container.getBoundingClientRect();
        const width = rect.width, height = rect.height;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(width, height);
        renderer.autoClear = false;
        this.container.appendChild(renderer.domElement);

        // --- FBO SETUP ---
        const fboW = Math.round(width * this.options.resolution);
        const fboH = Math.round(height * this.options.resolution);
        const type = /(iPad|iPhone|iPod)/i.test(navigator.userAgent) ? THREE.HalfFloatType : THREE.FloatType;
        const createFBO = () => new THREE.WebGLRenderTarget(fboW, fboH, { type, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
        const fbos = { v0: createFBO(), v1: createFBO(), div: createFBO(), p0: createFBO(), p1: createFBO() };
        const cellScale = new THREE.Vector2(1 / fboW, 1 / fboH);

        const createPass = (vert, frag, uniforms) => {
            const scene = new THREE.Scene(); const camera = new THREE.Camera();
            const mat = new THREE.RawShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms });
            scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
            return { scene, camera, mat };
        };

        const advection = createPass(face_vert, advection_frag, { boundarySpace: { value: cellScale }, px: { value: cellScale }, fboSize: { value: new THREE.Vector2(fboW, fboH) }, velocity: { value: null }, dt: { value: this.options.dt }, isBFECC: { value: true } });
        const externalForce = createPass(mouse_vert, externalForce_frag, { px: { value: cellScale }, force: { value: new THREE.Vector2() }, center: { value: new THREE.Vector2() }, scale: { value: new THREE.Vector2(this.options.cursorSize, this.options.cursorSize) } });
        externalForce.mat.transparent = true; externalForce.mat.blending = THREE.AdditiveBlending;
        const divergence = createPass(face_vert, divergence_frag, { boundarySpace: { value: cellScale }, velocity: { value: null }, px: { value: cellScale }, dt: { value: this.options.dt } });
        const poisson = createPass(face_vert, poisson_frag, { boundarySpace: { value: cellScale }, pressure: { value: null }, divergence: { value: fbos.div.texture }, px: { value: cellScale } });
        const pressure = createPass(face_vert, pressure_frag, { boundarySpace: { value: cellScale }, pressure: { value: null }, velocity: { value: null }, px: { value: cellScale }, dt: { value: this.options.dt } });
        const output = createPass(face_vert, color_frag, { velocity: { value: fbos.v0.texture }, palette: { value: paletteTex }, bgColor: { value: new THREE.Vector4(0, 0, 0, 0) } });

        // --- INTERACTION ---
        const mouse = { coords: new THREE.Vector2(), old: new THREE.Vector2(), diff: new THREE.Vector2(), isAuto: false };
        const onMove = (e) => {
            const r = this.container.getBoundingClientRect();
            const cx = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            const cy = e.clientY || (e.touches ? e.touches[0].clientY : 0);
            mouse.coords.set(((cx - r.left) / r.width) * 2 - 1, -(((cy - r.top) / r.height) * 2 - 1));
            this.lastUserInteraction = performance.now();
            mouse.isAuto = false;
        };
        this.container.parentElement.addEventListener('mousemove', onMove);
        this.container.parentElement.addEventListener('touchmove', onMove, { passive: true });

        const driver = { current: new THREE.Vector2(), target: new THREE.Vector2() };

        // --- LOOP ---
        const render = () => {
            const now = performance.now();
            if (this.options.autoDemo && now - this.lastUserInteraction > this.options.autoResumeDelay) {
                mouse.isAuto = true;
                if (driver.current.distanceTo(driver.target) < 0.1) driver.target.set(Math.random() * 2 - 1, Math.random() * 2 - 1);
                driver.current.lerp(driver.target, 0.05 * this.options.autoSpeed);
                mouse.coords.copy(driver.current);
            }
            mouse.diff.subVectors(mouse.coords, mouse.old).multiplyScalar(0.5); // Smoothed
            if (mouse.isAuto) mouse.diff.multiplyScalar(this.options.autoIntensity);
            mouse.old.copy(mouse.coords);

            // Passes
            renderer.setRenderTarget(fbos.v1);
            advection.mat.uniforms.velocity.value = fbos.v0.texture;
            renderer.render(advection.scene, advection.camera);

            externalForce.mat.uniforms.force.value.set(mouse.diff.x * this.options.mouseForce, mouse.diff.y * this.options.mouseForce);
            externalForce.mat.uniforms.center.value.copy(mouse.coords);
            renderer.render(externalForce.scene, externalForce.camera);

            renderer.setRenderTarget(fbos.div);
            divergence.mat.uniforms.velocity.value = fbos.v1.texture;
            renderer.render(divergence.scene, divergence.camera);

            for (let i = 0; i < this.options.iterationsPoisson; i++) {
                const src = i % 2 === 0 ? fbos.p0 : fbos.p1;
                const dst = i % 2 === 0 ? fbos.p1 : fbos.p0;
                poisson.mat.uniforms.pressure.value = src.texture;
                renderer.setRenderTarget(dst);
                renderer.render(poisson.scene, poisson.camera);
            }

            renderer.setRenderTarget(fbos.v0);
            pressure.mat.uniforms.velocity.value = fbos.v1.texture;
            pressure.mat.uniforms.pressure.value = fbos.p0.texture;
            renderer.render(pressure.scene, pressure.camera);

            renderer.setRenderTarget(null);
            renderer.clear();
            renderer.render(output.scene, output.camera);

            this.rafId = requestAnimationFrame(render);
        };
        render();
    }
}
