import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import * as CANNON from 'cannon-es'


/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])

const collisionSound = new Audio('/sounds/hit.mp3')
const wowB = new Audio('/sounds/wow-b.mp3')
const wowC = new Audio('/sounds/wow-c.mp3')

function playCollisionSound(collision) {
    const sound = Math.random() > 0.5 ? wowB : wowC
    // resets playing sound
    const impactVelocity = collision.contact.getImpactVelocityAlongNormal()
    if (impactVelocity > 2.0) {
        sound.volume = (impactVelocity * 0.3) / impactVelocity
        sound.currentTime = 0
        sound.play()
    }
}

/**
 * Physics
 */

// World
const world = new CANNON.World()

// Much more performant over naive approach (default), however can lead to bugs
// if there is an obj moving too fast across the screen
world.broadphase = new CANNON.SAPBroadphase(world)
// Won't test on objects not moving
world.allowSleep = true

// -9.82 to mimick real qorld gravity
world.gravity.set(0, -9.82, 0)

// These material name are just references. They are not actual materials in cannon
// Materials to apply to objects in physics world
// Inherently have no physical props => must define with contact material
const concreteMaterial = new CANNON.Material('concrete')
const plasticMaterial = new CANNON.Material('plastic')

// Create relationship between two materials
const concretePlasticContactMaterial = new CANNON.ContactMaterial(
    concreteMaterial,
    plasticMaterial,
    {
        // default 0.3
        friction: 0.1,
        // higher, bouncier
        restitution: 0.7
    }
)

world.addContactMaterial(concretePlasticContactMaterial)

//ThreeJS box
const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
const boxMaterial = new THREE.MeshStandardMaterial(
    {
        metalness: 0.5,
        roughness: 0.2,
        envMap: environmentMapTexture
    }
)

//

function spawnBox(width, height, depth, position) {
    // Threejs sphere
    const mesh = new THREE.Mesh(
        boxGeometry, boxMaterial
    )
    mesh.scale.set(width, height, depth)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    // Physics world sphere

    const boxShape = new CANNON.Box(new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5))
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 3, 3),
        shape: boxShape,
        material: concreteMaterial
    })
    body.position.copy(position)
    body.addEventListener('collide', playCollisionSound)
    world.addBody(body)

    objectsToUpdate.push({
        mesh,
        body
    })
}

const objectsToUpdate = []

const sphereGeometry = new THREE.SphereGeometry(1, 32, 32)
const sphereMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5
})

function spawnSphere(radius, position) {
    // Threejs sphere
    const sphereMesh = new THREE.Mesh(
        sphereGeometry, sphereMaterial
    )
    sphereMesh.scale.set(radius, radius, radius)
    sphereMesh.castShadow = true
    sphereMesh.position.copy(position)
    scene.add(sphereMesh)

    // Physics world sphere

    const sphereShape = new CANNON.Sphere(radius)
    const sphereBody = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 3, 3),
        shape: sphereShape,
        material: plasticMaterial
    })
    sphereBody.position.copy(position)
    sphereBody.addEventListener('collide', playCollisionSound)
    world.addBody(sphereBody)

    objectsToUpdate.push({
        mesh: sphereMesh,
        body: sphereBody
    })
}
// // arg1 = force; arg2 = localpoint
// sphereBody.applyLocalForce(new CANNON.Vec3(150, 0, 0), new CANNON.Vec3(0, 0, 0))
// }
//
// // same radis as buffer geometry below
// const sphereShape = new CANNON.Sphere(0.5)
// const sphereBody = new CANNON.Body({
//     mass: 1,
//     position: new CANNON.Vec3(0, 3, 3),
//     shape: sphereShape,
//     material: plasticMaterial
// })
// // arg1 = force; arg2 = localpoint
// sphereBody.applyLocalForce(new CANNON.Vec3(150, 0, 0), new CANNON.Vec3(0, 0, 0))
//
// world.addBody(sphereBody)

/**
 * Floor
 */

const floorShape = new CANNON.Plane()
const floorBody = new CANNON.Body()
// 0 means it is static and will not move
floorBody.mass = 0
floorBody.addShape(floorShape)
floorBody.material = concreteMaterial
// This physics lib can only rotate through quaternion
floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI * - 0.5)

world.addBody(floorBody)


/**
 * Test sphere
 */
// const sphere = new THREE.Mesh(
//     new THREE.SphereGeometry(0.5, 32, 32),
//     new THREE.MeshStandardMaterial({
//         metalness: 0.3,
//         roughness: 0.4,
//         envMap: environmentMapTexture,
//         envMapIntensity: 0.5
//     })
// )
// sphere.castShadow = true
// sphere.position.y = 0.5
// scene.add(sphere)

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(- 3, 3, 3)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()
let oldElapsedTime = 0




/**
 * Debug
 */
const gui = new dat.GUI()
const debugObject = {}
function spawnRandomSphere() {
    spawnSphere(Math.random() * 0.5, {
        x: (Math.random() - 0.5) * 3,
        y: 3,
        z: (Math.random() - 0.5) * 3
    })
}

debugObject.spawnSphere = () => {
    spawnRandomSphere()
}
function spawnRandomBox() {
    spawnBox(
        Math.random(),
        Math.random(),
        Math.random(),
        {
            x: (Math.random() - 0.5) * 3,
            y: 3,
            z: (Math.random() - 0.5) * 3
        }
    )
}
debugObject.spawnBox = () => {
    spawnRandomBox()
}
function reset() {
    for (const object of objectsToUpdate) {
        // Remove body
        // object.body.removeEventListener('collide', playHitSound)
        world.removeBody(object.body)

        // Remove mesh
        scene.remove(object.mesh)
    }
}
debugObject.reset = () => {
    reset()

}
debugObject.resetAndSpawn = () => {
    if (objectsToUpdate.length === 0) {
        initialSpawn()
    } else {
        reset()
        initialSpawn()
    }
}
gui.add(debugObject, 'spawnSphere').name('Spawn Sphere')
gui.add(debugObject, 'spawnBox').name('Spawn Box')
gui.add(debugObject, 'reset').name('Reset')
gui.add(debugObject, 'resetAndSpawn').name('Reset and Spawn')

function initialSpawn() {
    const count = Math.floor(Math.random() * 30)
    console.log('the count: ', count)

    for (let i = 0; i <= count; i++) {
        const ran = Math.random() - 0.5
        console.log(ran)
        ran > 0 ? spawnRandomBox() : spawnRandomSphere()
    }
}

initialSpawn()

const tick = () => {
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    // Update physics world
    world.step(1 / 60, deltaTime, 3)

    // Get coordinates of sphereBody and apply to sphere in Threejs world

    for (const object of objectsToUpdate) {
        object.mesh.position.copy(object.body.position)
        object.mesh.quaternion.copy(object.body.quaternion)
    }

    // using applyForce, we can mimick applyLocalForce by passing sphereBody.position
    // as the second arg

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()
