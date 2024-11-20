import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { gsap } from "gsap";

// Création d'une scène
const scene = new THREE.Scene();
// Création d'une caméra
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// Création d'un renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.background = new THREE.Color(.7,.7,.7);

// LOADER
const loader = new GLTFLoader();

// Chargement du modèle Blender
loader.load('./data/plan_manu(texture).glb', (gltf) => {
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
    }, 
    undefined, (error) => {
        console.error('Une erreur est survenue lors du chargement:', error);
});

// Rendu de la scène
function animate() {
    requestAnimationFrame(animate);
    // controls.update(); // Nécessaire si enableDamping ou autoRotate sont définis à true
    renderer.render(scene, camera);
}
animate();

// Éclairage
// Lumière ambiente
const hemispherelLight = new THREE.HemisphereLight(0xffffff, 0x080820, 1);
scene.add(hemispherelLight);

// Lumière directionnelle
const directionalLight = new THREE.RectAreaLight(0xffffff, 10, 50, 5);
directionalLight.position.set(20, 20, 10);
directionalLight.lookAt(0,0,0);
scene.add(directionalLight);

// Caméra
camera.position.set(20, 20, 70); // Ajustez ces valeurs selon votre scène
camera.lookAt(0, 0, 0);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

document.addEventListener('mousedown', onMouseDown, false);
// document.addEventListener('', onMouseUp, false);

// Nouvelle instance OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);

function highlightObject(object) {
    // Réinitialisez la couleur de tous les objets
    scene.traverse((child) => {
        if (child.isMesh) {
            child.material.color.setHex(0xffffff);
        }
    });
    
    // Mettez en évidence l'objet sélectionné
    object.material.color.setHex(0xff0000);
}

// function zoomToObject(object) {
//     // Créer une boîte englobante pour l'objet
//     const box = new THREE.Box3().setFromObject(object);

//     // Calculer le centre de la boîte
//     const center = box.getCenter(new THREE.Vector3());

//     // Calculer la taille de la boîte
//     const size = box.getSize(new THREE.Vector3());

//     // Calculer la distance de la caméra
//     const maxDim = Math.max(size.x, size.y, size.z);
//     const fov = camera.fov * (Math.PI / 180);
//     let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));

//     // Ajouter un peu de marge
//     cameraZ *= 3;

//     // Définir la nouvelle position de la caméra
//     const direction = new THREE.Vector3();
//     camera.getWorldDirection(direction);
//     const newPosition = center.add(direction.multiplyScalar(cameraZ));

//     // Animer le déplacement de la caméra
//     gsap.to(camera.position, {
//         duration: 1,
//         x: newPosition.x,
//         y: newPosition.y,
//         z: newPosition.z,
//         onUpdate: function() {
//             camera.lookAt(center);
//         }
//     });

//     // Mettre à jour les contrôles orbitaux
//     if (controls) {
//         gsap.to(controls.target, {
//             duration: 1,
//             x: center.x,
//             y: center.y,
//             z: center.z,
//             onUpdate: function() {
//                 controls.update();
//             }
//         });
//     }
// }

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
        console.log(intersects);
        if (intersects.length > 0) {
            const selectedObject = intersects[0].object;
            console.log("Partie sélectionnée :", selectedObject.userData.partName);
            highlightObject(selectedObject);
            // zoomToObject(selectedObject);
        }
        controls.enabled = false; // Désactivez temporairement OrbitControls
    } 
    
    if (intersects.length == 0) {
        scene.traverse((child) => {
            if (child.isMesh) {
                child.material.color.setHex(0xffffff);
            }
        });
        controls.enabled = true; // Réactivez OrbitControls
    }
}

// Configuration des contrôles 
controls.enableDamping = true; // Ajoute de l'inertie
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 1;
controls.maxDistance = 100;
controls.maxPolarAngle = Math.PI / 2;