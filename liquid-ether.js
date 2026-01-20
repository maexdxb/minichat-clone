/**
 * Vanilla JS LiquidEther
 * Premium Version: localized interaction, black background, and sharp glow.
 */

class LiquidEther {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            mouseForce: options.mouseForce || 80,
            cursorSize: options.cursorSize || 100,
            iterationsPoisson: options.iterationsPoisson || 24,
            dt: options.dt || 0.014,
            resolution: options.resolution || 0.4,
            colors: options.colors || ['#c39da8', '#e694b9', '#91738d'],
            autoDemo: options.autoDemo !== undefined ? options.autoDemo : true,
            autoSpeed: options.autoSpeed || 1.0,
            autoIntensity: options.autoIntensity || 1.5,
            autoResumeDelay: options.autoResumeDelay || 1000,
            dissipation: 0.96 // CRITICAL: Makes the colors disappear faster
        };

        this.lastUserInteraction = performance.now();
        this.rafId = null;
        this.init();
    }

    init() {
        if (typeof THREE === 'undefined') return;

        // --- SHADERS ---
        const face_vert = `attribute vec3 position; uniform vec2 px; varying vec2 uv; precision highp float; void main(){ uv = position.xy * 0.5 + 0.5; gl_Position = vec4(position, 1.0); }`;
        const mouse_vert = `precision highp float; attribute vec3 position; attribute vec2 uv; uniform vec2 center; uniform vec2 scale; uniform vec2 px; varying vec2 vUv; void main(){ vec2 pos = position.xy * scale * 2.0 * px + center; vUv = uv; gl_Position = vec4(pos, 0.0, 1.0); }`;

        // Advection with Dissipation
        const advection_frag = `precision highp float; uniform sampler2D velocity; uniform float dt; uniform float dissipation; uniform vec2 fboSize; varying vec2 uv; void main(){ vec2 ratio = max(fboSize.x, fboSize.y) / fboSize; vec2 vel = texture2D(velocity, uv).xy; vec2 uv2 = uv - vel * dt * ratio; vec2 newVel = texture2D(velocity, uv2).xy; gl_FragColor = vec4(newVel * dissipation, 0.0, 1.0); }`;

        // Output Shader: Black background + localize glow
        const color_frag = `precision highp float; uniform sampler2D velocity; uniform sampler2D palette; varying vec2 uv; void main(){ vec2 vel = texture2D(velocity, uv).xy; float lenv = length(vel); float glow = smoothstep(0.001, 0.6, lenv); // Sharper falloff glow = pow(glow, 1.2); vec3 c = texture2D(palette, vec2(glow, 0.5)).rgb; gl_FragColor = vec4(c * glow, 1.0); // Solid black background where glow is 0 }`;

        const divergence_frag = `precision highp float; uniform sampler2D velocity; uniform float dt; uniform vec2 px; varying vec2 uv; void main(){ float x0 = texture2D(velocity, uv-vec2(px.x, 0.0)).x; float x1 = texture2D(velocity, uv+vec2(px.x, 0.0)).x; float y0 = texture2D(velocity, uv-vec2(0.0, px.y)).y; float y1 = texture2D(velocity, uv+vec2(0.0, px.y)).y; float divergence = (x1 - x0 + y1 - y0) / 2.0; gl_FragColor = vec4(divergence / dt, 0.0, 0.0, 1.0); }`;
        const externalForce_frag = `precision highp float; uniform vec2 force; uniform vec2 center; uniform vec2 scale; uniform vec2 px; varying vec2 vUv; void main(){ vec2 circle = (vUv - 0.5) * 2.0; float d = 1.0 - min(length(circle), 1.0); d = pow(d, 2.0); gl_FragColor = vec4(force * d, 0.0, 0.0, 1.0); }`;
        const poisson_frag = `precision highp float; uniform sampler2D pressure; uniform sampler2D divergence; uniform vec2 px; varying vec2 uv; void main(){ float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r; float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r; float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r; float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r; float div = texture2D(divergence, uv).r; float newP = (p0 + p1 + p2 + p3) / 4.0 - div; gl_FragColor = vec4(newP, 0.0, 0.0, 1.0); }`;
        const pressure_frag = `precision highp float; uniform sampler2D pressure; uniform sampler2D velocity; uniform vec2 px; uniform float dt; varying vec2 uv; void main(){ float p0 = texture2D(pressure, uv + vec2(px.x, 0.0)).r; float p1 = texture2D(pressure, uv - vec2(px.x, 0.0)).r; float p2 = texture2D(pressure, uv + vec2(0.0, px.y)).r; float p3 = texture2D(pressure, uv - vec2(0.0, px.y)).r; vec2 v = texture2D(velocity, uv).xy; vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5; gl_FragColor = vec4(v - gradP * dt, 0.0, 1.0); }`;

        // --- TOOLS ---
        const makePaletteTexture = (stops) => {
            const arr = stops.length === 1 ? [stops[0], stops[0]] : stops;
            const data = new Uint8Array(arr.length * 4);
            arr.forEach((hex, i) => {
                const c = new THREE.Color(hex);
                data[i * 4 + 0] = Math.round(c.r * 255); data[i * 4 + 1] = Math.round(c.g * 255); data[i * 4 + 2] = Math.round(c.b * 255); data[i * 4 + 3] = 255;
            });
            const tex = new THREE.DataTexture(data, arr.length, 1, THREE.RGBAFormat);
            tex.needsUpdate = true; return tex;
        };
        const paletteTex = makePaletteTexture(this.options.colors);

        // --- RENDERER ---
        const rect = this.container.getBoundingClientRect();
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setClearColor(0x000000, 1.0);
        renderer.setSize(rect.width, rect.height);
        renderer.autoClear = false;
        this.container.appendChild(renderer.domElement);

        // --- FBO ---
        const fboW = Math.round(rect.width * this.options.resolution);
        const fboH = Math.round(rect.height * this.options.resolution);
        const type = /(iPad|iPhone|iPod)/i.test(navigator.userAgent) ? THREE.HalfFloatType : THREE.FloatType;
        const createFBO = () => new THREE.WebGLRenderTarget(fboW, fboH, { type, depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
        const fbos = { v0: createFBO(), v1: createFBO(), div: createFBO(), p0: createFBO(), p1: createFBO() };
        const cellScale = new THREE.Vector2(1 / fboW, 1 / fboH);

        const createPass = (vert, frag, uniforms) => {
            const scene = new THREE.Scene(); const camera = new THREE.Camera();
            const mat = new THREE.RawShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms });
            scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
            return { scene, camera, mat };
        };

        const advection = createPass(face_vert, advection_frag, { velocity: { value: null }, dt: { value: this.options.dt }, dissipation: { value: this.options.dissipation }, fboSize: { value: new THREE.Vector2(fboW, fboH) } });
        const externalForce = createPass(mouse_vert, externalForce_frag, { px: { value: cellScale }, force: { value: new THREE.Vector2() }, center: { value: new THREE.Vector2() }, scale: { value: new THREE.Vector2(this.options.cursorSize, this.options.cursorSize) } });
        externalForce.mat.transparent = true; externalForce.mat.blending = THREE.AdditiveBlending;
        const divergence = createPass(face_vert, divergence_frag, { velocity: { value: null }, dt: { value: this.options.dt }, px: { value: cellScale } });
        const poisson = createPass(face_vert, poisson_frag, { pressure: { value: null }, divergence: { value: fbos.div.texture }, px: { value: cellScale } });
        const pressure = createPass(face_vert, pressure_frag, { pressure: { value: null }, velocity: { value: null }, px: { value: cellScale }, dt: { value: this.options.dt } });
        const output = createPass(face_vert, color_frag, { velocity: { value: fbos.v0.texture }, palette: { value: paletteTex } });

        // --- INTERACTION: Only listen to the container itself ---
        const mouse = { coords: new THREE.Vector2(), old: new THREE.Vector2(), diff: new THREE.Vector2(), isOver: false };
        const onMove = (e) => {
            const r = this.container.getBoundingClientRect();
            const cx = e.clientX || (e.touches ? e.touches[0].clientX : 0);
            const cy = e.clientY || (e.touches ? e.touches[0].clientY : 0);
            mouse.coords.set(((cx - r.left) / r.width) * 2 - 1, -(((cy - r.top) / r.height) * 2 - 1));
            this.lastUserInteraction = performance.now();
        };
        const onEnter = () => { mouse.isOver = true; };
        const onLeave = () => { mouse.isOver = false; };

        this.container.addEventListener('mousemove', onMove);
        this.container.addEventListener('mouseenter', onEnter);
        this.container.addEventListener('mouseleave', onLeave);
        this.container.addEventListener('touchmove', onMove, { passive: true });

        const driver = { current: new THREE.Vector2(), target: new THREE.Vector2() };

        const render = () => {
            const now = performance.now();
            let isAuto = false;
            if (this.options.autoDemo && now - this.lastUserInteraction > this.options.autoResumeDelay && !mouse.isOver) {
                isAuto = true;
                if (driver.current.distanceTo(driver.target) < 0.1) driver.target.set(Math.random() * 2 - 1, Math.random() * 2 - 1);
                driver.current.lerp(driver.target, 0.05 * this.options.autoSpeed);
                mouse.coords.copy(driver.current);
            }

            mouse.diff.subVectors(mouse.coords, mouse.old).multiplyScalar(0.5);
            if (isAuto) mouse.diff.multiplyScalar(this.options.autoIntensity);
            mouse.old.copy(mouse.coords);

            // Simulation
            renderer.setRenderTarget(fbos.v1);
            advection.mat.uniforms.velocity.value = fbos.v0.texture;
            renderer.render(advection.scene, advection.camera);

            if (mouse.isOver || isAuto) {
                externalForce.mat.uniforms.force.value.set(mouse.diff.x * this.options.mouseForce, mouse.diff.y * this.options.mouseForce);
                externalForce.mat.uniforms.center.value.copy(mouse.coords);
                renderer.render(externalForce.scene, externalForce.camera);
            }

            renderer.setRenderTarget(fbos.div);
            divergence.mat.uniforms.velocity.value = fbos.v1.texture;
            renderer.render(divergence.scene, divergence.camera);

            for (let i = 0; i < this.options.iterationsPoisson; i++) {
                const src = i % 2 === 0 ? fbos.p0 : fbos.p1;
                const dst = i % 2 === 0 ? fbos.p1 : fbos.p0;
                poisson.mat.uniforms.pressure.value = src.texture;
                renderer.setRenderTarget(dst); renderer.render(poisson.scene, poisson.camera);
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
