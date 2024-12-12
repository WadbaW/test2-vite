import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from "gsap";

// Création d'une scène
const scene = new THREE.Scene();
// Création d'une caméra
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Création d'un renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Changement de la couleur de fond du canvas
scene.background = new THREE.Color(.01,.01,.01);

const infobox = document.getElementById('infobox');
const info = document.getElementById('info');

// LOADER
const loader = new GLTFLoader();

// Chargement du modèle Blender
loader.load('./data/plan_manu_v3.glb', (gltf) => {
    // Stockage du modèle dans une constante
    const model = gltf.scene;
    model.traverse((child) => {
        if (child.isMesh) {
            // Ajoutez des propriétés personnalisées si nécessaire
            child.userData.partName = child.name;
        }
    });
    // Ajout du modèle à la scène
    scene.add(model);
    scene.traverse((child) => {
        if (child.isMesh) {
            child.material.color.setHex(0x555555);
        }
    });
    },
    undefined, (error) => {
        console.error('Une erreur est survenue lors du chargement:', error);
});

const maxOrbitRadius = 5; // Rayon maximal de l'orbite
const minOrbitRadius = 2; // Rayon minimal de l'orbite

// Rendu de la scène
function animate() {
    // var elapsed = clock.elapsedTime;

    // // Calcul de la position en orbite avec limites
    // var orbitRadius = Math.min(Math.max(3 + Math.sin(elapsed/4),    minOrbitRadius), maxOrbitRadius);

    // sphere.position.x = Math.sin(elapsed/2) * orbitRadius;
    // sphere.position.z = Math.cos(elapsed/2) * orbitRadius;
    // // controls.update(); // Nécessaire si enableDamping ou autoRotate sont définis à true

    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

// Éclairage
const sunLight = new THREE.DirectionalLight(0xffffff, 1.5); // Augmentez l'intensité à 1.5 ou plus
sunLight.position.set(10, 20, 5);
sunLight.castShadow = true;
scene.add(sunLight);

const hemisphereLight = new THREE.HemisphereLight(0xddeeff, 0x202020, 0.5);
scene.add(hemisphereLight);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.addEventListener('mousedown', onMouseDown, false);

// Nouvelle instance OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);

function highlightObject(object) {
    // Réinitialisez la couleur de tous les objets
    scene.traverse((child) => {
        if (child.isMesh) {
            child.material.color.setHex(0x555555)
            child.material.emissive.setHex(0x000000)
        }
    });
    
    // Mettez en évidence l'objet sélectionné
    object.material.color.setHex(0xffffff);
    object.material.emissive.setHex(0x888888);
}

function zoomToObject(object) {
    // Créer une boîte englobante pour l'objet
    const box = new THREE.Box3().setFromObject(object);

    // Calculer le centre de la boîte
    const center = box.getCenter(new THREE.Vector3());

    // Calculer la taille de la boîte
    const size = box.getSize(new THREE.Vector3());

    // Calculer la distance de la caméra
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

    // Réduire le facteur de zoom (était 3, maintenant 1.5)
    cameraZ *= 1.5;

    // Calculer la nouvelle position de la caméra
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    const newPosition = center.clone().add(direction.multiplyScalar(cameraZ));

    // Interpoler entre la position actuelle et la nouvelle position
    // const currentPosition = camera.position.clone();
    const targetPosition = new THREE.Vector3().lerpVectors(last_camera_position, newPosition, 0.5);

    // Animer le déplacement de la caméra
    gsap.to(camera.position, {
        duration: .6,
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        ease: "power2.inOut",
        onUpdate: function() {
            camera.lookAt(center);
        }
    });

    // Mettre à jour les contrôles orbitaux
    if (controls) {
        gsap.to(controls.target, {
            duration: .6,
            x: center.x,
            y: center.y,
            z: center.z,
            ease: "power2.inOut",
            onUpdate: function() {
                controls.update();
            }
        });
    }
}

let is_focus = false;
let is_animated = false;

let last_camera_position = {'x':50,'y':50,'z':30};
function resetZoom(position = {'x':50,'y':50,'z':30}, mainObjectCenter = new THREE.Vector3(0, 0, 0)) {
    // Calculer la rotation initiale de la caméra
    const startRotation = new THREE.Euler().setFromQuaternion(camera.quaternion);

    // Calculer la rotation finale (regardant vers le centre de l'objet principal)
    const endRotation = new THREE.Euler();
    // const lookAtVector = new THREE.Vector3().subVectors(mainObjectCenter, position);
    const endQuaternion = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().lookAt(position, mainObjectCenter, camera.up)
    );
    endRotation.setFromQuaternion(endQuaternion);

    // Animer le déplacement et la rotation de la caméra
    gsap.to(camera.position, {
        duration: .6,
        x: position.x,
        y: position.y,
        z: position.z,
        ease: "power2.inOut",
        onUpdate: function() {
            // Interpoler la rotation
            const progress = this.progress();
            camera.quaternion.slerpQuaternions(
                new THREE.Quaternion().setFromEuler(startRotation),
                new THREE.Quaternion().setFromEuler(endRotation),
                progress
            );
        },
        onComplete: function() {
            camera.lookAt(mainObjectCenter);
        }
    });

    // Réinitialiser le centre de l'orbite
    if (controls) {
        gsap.to(controls.target, {
            duration: .6,
            x: mainObjectCenter.x,
            y: mainObjectCenter.y,
            z: mainObjectCenter.z,
            ease: "power2.inOut",
            onUpdate: function() {
                controls.update();
            }
        });
    }
}

resetZoom();


function onMouseDown(event) {
    //
    event.preventDefault();
    // if (event.button !== 0) return; // Ignorez les clics autres que le bouton gauche
    //
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects) {
        if (intersects.length > 0 && intersects[0].object.userData.name != "Couloir") {
            const selectedObject = intersects[0].object;
            is_animated = true;
            // console.log("Partie sélectionnée :", selectedObject.userData.partName);
            if (!is_focus) {
                last_camera_position = camera.position.clone();
            } else {
                infobox.classList.replace('focus', 'hidden');
            }
            highlightObject(selectedObject);
            zoomToObject(selectedObject);
            infobox.style.left = '50%';
            infobox.style.top = '50%';
            infobox.style.transform = 'translate(-50%, -50%)';
            
            info.textContent = selectedObject.userData.name;
            setTimeout(() => {     
                infobox.classList.replace('hidden', 'focus');
                is_animated = false;
                is_focus = true
            }, 500);
        }
        controls.enabled = false; // Désactivez temporairement OrbitControls
    }

    if (intersects.length == 0 && !is_animated) {
        scene.traverse((child) => {
            if (child.isMesh) {
                child.material.color.setHex(0x555555);
                child.material.emissive.setHex(0x000000);
            }
        });
        if (is_focus) {
            resetZoom(last_camera_position);
            infobox.classList.replace('focus', 'hidden');
            is_focus = false
        }
        // console.log(camera.position);
        controls.enabled = true; // Réactivez OrbitControls
    }
}

controls.enablePan = false;

function checkOrientation() {
    const isMobile = window.innerWidth <= 1200;
    console.log(isMobile);

    const isPortrait = window.innerHeight < window.innerWidth;
    console.log(isPortrait);
    
    if (isMobile && !isPortrait) {
        controls.enablePan = true;
        controls.maxDistance = 100;
    }
    // } else {
    //     controls.enablePan = false;
    // }
}

function onWindowResize() {    
    console.log('resize');
    camera.aspect = window.innerWidth/ window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
    checkOrientation();
}

window.addEventListener( 'load', onWindowResize, false );
window.addEventListener( 'resize', onWindowResize, false );

const reset_button = document.getElementById('reset-button');
reset_button.addEventListener('click', () => {
    reset_button.classList.remove('animate');
    resetZoom()
    void reset_button.offsetWidth; // Force reflow
    reset_button.classList.add('animate');
});

  // Vérifiez l'orientation au chargement et lors du redimensionnement
window.addEventListener('load', checkOrientation);
window.addEventListener('resize', checkOrientation);

// Configuration des contrôles
controls.enableDamping = true;
controls.dampingFactor = 0.3;
controls.screenSpacePanning = false;
controls.minDistance = 40;
controls.maxDistance = 80;
controls.minPolarAngle = Math.PI / 6;
controls.maxPolarAngle = Math.PI / 4;
controls.minAzimuthAngle = 0; // -90 degrés
controls.maxAzimuthAngle = Math.PI / 2;  // 90 degrés

