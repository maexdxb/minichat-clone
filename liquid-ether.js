/**
 * Vanilla JS LiquidEther
 * Extreme Fidelity Version: Ultra-Fine Trails and High-Viscosity Flux.
 */

class LiquidEther {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            mouseForce: options.mouseForce !== undefined ? options.mouseForce : 350,
            cursorSize: options.cursorSize !== undefined ? options.cursorSize : 1.5,
            isViscous: options.isViscous !== undefined ? options.isViscous : true,
            viscous: options.viscous !== undefined ? options.viscous : 80,
            iterationsViscous: options.iterationsViscous || 64,
            iterationsPoisson: options.iterationsPoisson || 32,
            dt: 0.014,
            resolution: options.resolution || 2.0,
            colors: options.colors || ['#33001a', '#b3003b', '#ff0066', '#ff00cc'],
            autoDemo: options.autoDemo !== undefined ? options.autoDemo : true,
            autoSpeed: options.autoSpeed || 0.4,
            autoIntensity: options.autoIntensity || 2.2,
            autoResumeDelay: options.autoResumeDelay || 3000,
            dissipation: options.dissipation || 0.85 // Rapid dissipation to prevent clumping
        };

        this.lastUserInteraction = performance.now();
        this.init();
    }

    init() {
        if (typeof THREE === 'undefined') return;

        // --- SHADERS ---
        const base_vert = `
            precision highp float;
            attribute vec3 position;
            attribute vec2 uv;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }`;

        const mouse_vert = `
            precision highp float;
            attribute vec3 position;
            attribute vec2 uv;
            uniform vec2 center;
            uniform vec2 scale;
            uniform vec2 px;
            varying vec2 vUv;
            void main() {
                vUv = uv;
                vec2 pos = position.xy * scale * 2.0 * px + center;
                gl_Position = vec4(pos, 0.0, 1.0);
            }`;

        const advection_frag = `
            precision highp float;
            uniform sampler2D velocity;
            uniform float dt;
            uniform float dissipation;
            uniform vec2 fboSize;
            varying vec2 vUv;
            void main() {
                vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
                vec2 vel = texture2D(velocity, vUv).xy;
                vec2 uv2 = vUv - vel * dt * ratio;
                vec2 newVel = texture2D(velocity, uv2).xy;
                gl_FragColor = vec4(newVel * dissipation, 0.0, 1.0);
            }`;

        const viscous_frag = `
            precision highp float;
            uniform sampler2D velocity;
            uniform sampler2D velocity_new;
            uniform float v;
            uniform vec2 px;
            uniform float dt;
            varying vec2 vUv;
            void main() {
                vec2 old = texture2D(velocity, vUv).xy;
                vec2 n0 = texture2D(velocity_new, vUv + vec2(px.x, 0.0)).xy;
                vec2 n1 = texture2D(velocity_new, vUv - vec2(px.x, 0.0)).xy;
                vec2 n2 = texture2D(velocity_new, vUv + vec2(0.0, px.y)).xy;
                vec2 n3 = texture2D(velocity_new, vUv - vec2(0.0, px.y)).xy;
                vec2 res = (old + v * dt * (n0 + n1 + n2 + n3)) / (1.0 + 4.0 * v * dt);
                gl_FragColor = vec4(res, 0.0, 1.0);
            }`;

        const divergence_frag = `
            precision highp float;
            uniform sampler2D velocity;
            uniform float dt;
            uniform vec2 px;
            varying vec2 vUv;
            void main() {
                float x0 = texture2D(velocity, vUv - vec2(px.x, 0.0)).x;
                float x1 = texture2D(velocity, vUv + vec2(px.x, 0.0)).x;
                float y0 = texture2D(velocity, vUv - vec2(0.0, px.y)).y;
                float y1 = texture2D(velocity, vUv + vec2(0.0, px.y)).y;
                gl_FragColor = vec4((x1 - x0 + y1 - y0) * 0.5 / dt, 0.0, 0.0, 1.0);
            }`;

        const poisson_frag = `
            precision highp float;
            uniform sampler2D pressure;
            uniform sampler2D divergence;
            uniform vec2 px;
            varying vec2 vUv;
            void main() {
                float p0 = texture2D(pressure, vUv + vec2(px.x, 0.0)).r;
                float p1 = texture2D(pressure, vUv - vec2(px.x, 0.0)).r;
                float p2 = texture2D(pressure, vUv + vec2(0.0, px.y)).r;
                float p3 = texture2D(pressure, vUv - vec2(0.0, px.y)).r;
                float div = texture2D(divergence, vUv).r;
                gl_FragColor = vec4((p0 + p1 + p2 + p3 - div) * 0.25, 0.0, 0.0, 1.0);
            }`;

        const pressure_frag = `
            precision highp float;
            uniform sampler2D pressure;
            uniform sampler2D velocity;
            uniform vec2 px;
            uniform float dt;
            varying vec2 vUv;
            void main() {
                float p0 = texture2D(pressure, vUv + vec2(px.x, 0.0)).r;
                float p1 = texture2D(pressure, vUv - vec2(px.x, 0.0)).r;
                float p2 = texture2D(pressure, vUv + vec2(0.0, px.y)).r;
                float p3 = texture2D(pressure, vUv - vec2(0.0, px.y)).r;
                vec2 v = texture2D(velocity, vUv).xy;
                gl_FragColor = vec4(v - vec2(p0 - p1, p2 - p3) * 0.5 / dt, 0.0, 1.0);
            }`;

        const externalForce_frag = `
            precision highp float;
            uniform vec2 force;
            varying vec2 vUv;
            void main() {
                vec2 circle = (vUv - 0.5) * 2.0;
                float d = 1.0 - min(length(circle), 1.0);
                d = pow(d, 3.0); // Sharper falloff
                gl_FragColor = vec4(force * d, 0.0, 1.0);
            }`;

        const color_frag = `
            precision highp float;
            uniform sampler2D velocity;
            uniform sampler2D palette;
            varying vec2 vUv;
            void main() {
                float lenv = length(texture2D(velocity, vUv).xy);
                float glow = smoothstep(0.0, 0.6, lenv);
                glow = pow(glow, 1.2); 
                vec3 c = texture2D(palette, vec2(glow, 0.5)).rgb;
                gl_FragColor = vec4(c * glow, 1.0);
            }`;

        const makePaletteTexture = (stops) => {
            const data = new Uint8Array(stops.length * 4);
            stops.forEach((hex, i) => {
                const c = new THREE.Color(hex);
                data[i * 4 + 0] = Math.round(c.r * 255); data[i * 4 + 1] = Math.round(c.g * 255); data[i * 4 + 2] = Math.round(c.b * 255); data[i * 4 + 3] = 255;
            });
            const tex = new THREE.DataTexture(data, stops.length, 1, THREE.RGBAFormat);
            tex.needsUpdate = true; return tex;
        };
        const paletteTex = makePaletteTexture(this.options.colors);

        const rect = this.container.getBoundingClientRect();
        const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
        renderer.setClearColor(0x000000, 1.0);
        renderer.setSize(rect.width, rect.height);
        this.container.appendChild(renderer.domElement);

        const fboW = Math.round(rect.width * this.options.resolution);
        const fboH = Math.round(rect.height * this.options.resolution);
        const type = THREE.FloatType;
        const createFBO = () => new THREE.WebGLRenderTarget(fboW, fboH, { type, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
        const fbos = { v0: createFBO(), v1: createFBO(), vV0: createFBO(), vV1: createFBO(), div: createFBO(), p0: createFBO(), p1: createFBO() };
        const cellScale = new THREE.Vector2(1 / fboW, 1 / fboH);

        const createPass = (vert, frag, uniforms) => {
            const scene = new THREE.Scene(); const camera = new THREE.Camera();
            const mat = new THREE.RawShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms });
            scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
            return { scene, camera, mat };
        };

        const advection = createPass(base_vert, advection_frag, { velocity: { value: null }, dt: { value: this.options.dt }, dissipation: { value: this.options.dissipation }, fboSize: { value: new THREE.Vector2(fboW, fboH) } });
        const viscous = createPass(base_vert, viscous_frag, { velocity: { value: null }, velocity_new: { value: null }, v: { value: this.options.viscous }, px: { value: cellScale }, dt: { value: this.options.dt } });
        const externalForce = createPass(mouse_vert, externalForce_frag, { px: { value: cellScale }, force: { value: new THREE.Vector2() }, center: { value: new THREE.Vector2() }, scale: { value: new THREE.Vector2(this.options.cursorSize, this.options.cursorSize) } });
        externalForce.mat.transparent = true; externalForce.mat.blending = THREE.AdditiveBlending;
        const divergence = createPass(base_vert, divergence_frag, { velocity: { value: null }, dt: { value: this.options.dt }, px: { value: cellScale } });
        const poisson = createPass(base_vert, poisson_frag, { pressure: { value: null }, divergence: { value: fbos.div.texture }, px: { value: cellScale } });
        const pressure = createPass(base_vert, pressure_frag, { pressure: { value: null }, velocity: { value: null }, px: { value: cellScale }, dt: { value: this.options.dt } });
        const output = createPass(base_vert, color_frag, { velocity: { value: fbos.v0.texture }, palette: { value: paletteTex } });

        const mouse = { coords: new THREE.Vector2(), old: new THREE.Vector2(), diff: new THREE.Vector2(), isOver: false };
        const parent = this.container.parentElement;

        const handleMove = (x, y) => {
            const r = parent.getBoundingClientRect();
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
                mouse.isOver = true;
                mouse.coords.set(((x - r.left) / r.width) * 2 - 1, -(((y - r.top) / r.height) * 2 - 1));
            } else {
                mouse.isOver = false;
            }
            this.lastUserInteraction = performance.now();
        };

        window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
        window.addEventListener('touchmove', (e) => handleMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

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

            mouse.diff.subVectors(mouse.coords, mouse.old);
            mouse.old.copy(mouse.coords);

            // 1. Advect
            renderer.setRenderTarget(fbos.v1);
            advection.mat.uniforms.velocity.value = fbos.v0.texture;
            renderer.render(advection.scene, advection.camera);

            // 2. Force
            if (mouse.isOver || isAuto) {
                externalForce.mat.uniforms.force.value.set(mouse.diff.x * this.options.mouseForce, mouse.diff.y * this.options.mouseForce);
                externalForce.mat.uniforms.center.value.copy(mouse.coords);
                renderer.render(externalForce.scene, externalForce.camera);
            }

            // 3. Viscous
            let vRes = fbos.v1;
            if (this.options.isViscous) {
                for (let i = 0; i < this.options.iterationsViscous; i++) {
                    let vSrc = i === 0 ? fbos.v1.texture : (i % 2 === 0 ? fbos.vV1.texture : fbos.vV0.texture);
                    let vDst = i % 2 === 0 ? fbos.vV0 : fbos.vV1;
                    viscous.mat.uniforms.velocity.value = fbos.v1.texture;
                    viscous.mat.uniforms.velocity_new.value = vSrc;
                    renderer.setRenderTarget(vDst); renderer.render(viscous.scene, viscous.camera);
                    vRes = vDst;
                }
            }

            // 4. Divergence
            renderer.setRenderTarget(fbos.div);
            divergence.mat.uniforms.velocity.value = vRes.texture;
            renderer.render(divergence.scene, divergence.camera);

            // 5. Poisson
            for (let i = 0; i < this.options.iterationsPoisson; i++) {
                const src = i % 2 === 0 ? fbos.p0.texture : fbos.p1.texture;
                const dst = i % 2 === 0 ? fbos.p1 : fbos.p0;
                poisson.mat.uniforms.pressure.value = src;
                renderer.setRenderTarget(dst); renderer.render(poisson.scene, poisson.camera);
            }

            // 6. Project
            renderer.setRenderTarget(fbos.v0);
            pressure.mat.uniforms.velocity.value = vRes.texture;
            pressure.mat.uniforms.pressure.value = fbos.p0.texture;
            renderer.render(pressure.scene, pressure.camera);

            // 7. Output
            renderer.setRenderTarget(null);
            renderer.render(output.scene, output.camera);
            requestAnimationFrame(render);
        };
        render();
    }
}
