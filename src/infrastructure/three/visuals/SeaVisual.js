import * as THREE from 'three';
import { Theme } from '../../config/ThemeConfig.js';

/**
 * Море. Одна большая плоскость с кастомным шейдером.
 * Волны — сумма синусоид по X/Z, пена на гребнях, блик от солнца.
 *
 * Не знает о домене — только о Theme. Заменяется целиком при желании.
 */
export class SeaVisual {
    constructor() {
        const s = Theme.sea;

        const geo = new THREE.PlaneGeometry(s.size, s.size, 96, 96);
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uColorDeep: { value: new THREE.Color(s.colorDeep) },
                uColorShallow: { value: new THREE.Color(s.colorShallow) },
                uColorFoam: { value: new THREE.Color(s.colorFoam) },
                uSunDir: {
                    value: new THREE.Vector3(
                        s.sunDirection.x, s.sunDirection.y, s.sunDirection.z,
                    ).normalize()
                },
                uWaveScale: { value: s.waveScale },
                uWaveSpeed: { value: s.waveSpeed },
                uWaveHeight: { value: s.waveHeight },
                uSpecularity: { value: s.specularity },
            },
            vertexShader: /* glsl */`
        uniform float uTime;
        uniform float uWaveScale;
        uniform float uWaveSpeed;
        uniform float uWaveHeight;

        varying vec3 vNormal;
        varying float vWave;

        void main() {
          vec3 pos = position;

          // Три волны с разными частотами
          float w1 = sin(pos.x * uWaveScale + uTime * uWaveSpeed * 1.0) * uWaveHeight;
          float w2 = sin(pos.y * uWaveScale * 1.7 + uTime * uWaveSpeed * 1.4) * uWaveHeight * 0.6;
          float w3 = sin((pos.x + pos.y) * uWaveScale * 0.8 + uTime * uWaveSpeed * 0.6) * uWaveHeight * 0.4;
          pos.z = w1 + w2 + w3;
          vWave = pos.z;

          // Нормаль (приближённо)
          float dx = cos(pos.x * uWaveScale + uTime * uWaveSpeed * 1.0) * uWaveHeight * uWaveScale
                   + cos((pos.x + pos.y) * uWaveScale * 0.8 + uTime * uWaveSpeed * 0.6) * uWaveHeight * 0.4 * uWaveScale * 0.8;
          float dy = cos(pos.y * uWaveScale * 1.7 + uTime * uWaveSpeed * 1.4) * uWaveHeight * 0.6 * uWaveScale * 1.7
                   + cos((pos.x + pos.y) * uWaveScale * 0.8 + uTime * uWaveSpeed * 0.6) * uWaveHeight * 0.4 * uWaveScale * 0.8;
          vNormal = normalize(vec3(-dx, -dy, 1.0));

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
            fragmentShader: /* glsl */`
        uniform vec3 uColorDeep;
        uniform vec3 uColorShallow;
        uniform vec3 uColorFoam;
        uniform vec3 uSunDir;
        uniform float uSpecularity;

        varying vec3 vNormal;
        varying float vWave;

        void main() {
          float h = clamp(vWave * 0.6 + 0.5, 0.0, 1.0);
          vec3 col = mix(uColorDeep, uColorShallow, h);

          // Блик солнца
          float spec = pow(max(dot(normalize(vNormal), uSunDir), 0.0), uSpecularity);
          col += vec3(1.0, 0.92, 0.72) * spec * 0.85;

          // Пена на гребнях
          float foam = smoothstep(0.55, 0.78, vWave);
          col = mix(col, uColorFoam, foam * 0.35);

          // Легкая виньетка
          gl_FragColor = vec4(col, 1.0);
        }
      `,
        });

        this.mesh = new THREE.Mesh(geo, this.material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = s.y;
        this.mesh.receiveShadow = false;
        this.mesh.renderOrder = -1;
    }

    update(time) {
        this.material.uniforms.uTime.value = time;
    }

    addTo(scene) { scene.add(this.mesh); return this; }
    removeFrom(scene) { scene.remove(this.mesh); }
}