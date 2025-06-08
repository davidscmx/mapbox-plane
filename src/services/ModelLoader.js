import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * 3D Model Loader Service
 * Handles loading and caching of 3D aircraft models
 */
export class ModelLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.defaultModel = null;
    
    // Create a simple default airplane model
    this.createDefaultModel();
  }

  /**
   * Create a simple default airplane model using Three.js geometry
   */
  createDefaultModel() {
    const group = new THREE.Group();
    
    // Fuselage (main body)
    const fuselageGeometry = new THREE.CylinderGeometry(0.3, 0.1, 4, 8);
    const fuselageMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.z = Math.PI / 2; // Rotate to point forward
    group.add(fuselage);
    
    // Wings
    const wingGeometry = new THREE.BoxGeometry(6, 0.1, 1);
    const wingMaterial = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.z = -0.5;
    group.add(wings);
    
    // Tail
    const tailGeometry = new THREE.BoxGeometry(0.1, 2, 1.5);
    const tailMaterial = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.x = -1.8;
    tail.position.y = 0.5;
    group.add(tail);
    
    // Horizontal stabilizer
    const stabilizerGeometry = new THREE.BoxGeometry(2, 0.1, 0.5);
    const stabilizerMaterial = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const stabilizer = new THREE.Mesh(stabilizerGeometry, stabilizerMaterial);
    stabilizer.position.x = -1.8;
    stabilizer.position.y = 0.5;
    group.add(stabilizer);
    
    // Scale down the model
    group.scale.setScalar(0.1);
    
    this.defaultModel = group;
  }

  /**
   * Load a GLTF model from URL
   */
  async loadModel(url) {
    // Check cache first
    if (this.cache.has(url)) {
      return this.cache.get(url).clone();
    }
    
    // Check if already loading
    if (this.loadingPromises.has(url)) {
      const model = await this.loadingPromises.get(url);
      return model.clone();
    }
    
    // Start loading
    const loadingPromise = new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          
          // Optimize the model
          this.optimizeModel(model);
          
          // Cache the model
          this.cache.set(url, model);
          this.loadingPromises.delete(url);
          
          resolve(model);
        },
        (progress) => {
          // Loading progress
          console.log(`Loading model: ${(progress.loaded / progress.total * 100)}%`);
        },
        (error) => {
          console.error('Error loading model:', error);
          this.loadingPromises.delete(url);
          reject(error);
        }
      );
    });
    
    this.loadingPromises.set(url, loadingPromise);
    
    try {
      const model = await loadingPromise;
      return model.clone();
    } catch (error) {
      console.warn('Failed to load model, using default:', error);
      return this.getDefaultModel();
    }
  }

  /**
   * Get the default airplane model
   */
  getDefaultModel() {
    return this.defaultModel.clone();
  }

  /**
   * Create a simple airplane model with custom color
   */
  createSimpleAirplane(color = 0xffffff) {
    const group = new THREE.Group();
    
    // Fuselage
    const fuselageGeometry = new THREE.CylinderGeometry(0.15, 0.05, 2, 8);
    const fuselageMaterial = new THREE.MeshLambertMaterial({ color: color });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.z = Math.PI / 2;
    group.add(fuselage);
    
    // Wings
    const wingGeometry = new THREE.BoxGeometry(3, 0.05, 0.4);
    const wingMaterial = new THREE.MeshLambertMaterial({ color: color });
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.z = -0.2;
    group.add(wings);
    
    // Tail
    const tailGeometry = new THREE.BoxGeometry(0.05, 1, 0.6);
    const tailMaterial = new THREE.MeshLambertMaterial({ color: color });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.x = -0.9;
    tail.position.y = 0.3;
    group.add(tail);
    
    // Horizontal stabilizer
    const stabilizerGeometry = new THREE.BoxGeometry(1, 0.05, 0.2);
    const stabilizerMaterial = new THREE.MeshLambertMaterial({ color: color });
    const stabilizer = new THREE.Mesh(stabilizerGeometry, stabilizerMaterial);
    stabilizer.position.x = -0.9;
    stabilizer.position.y = 0.3;
    group.add(stabilizer);
    
    // Scale the model
    group.scale.setScalar(0.05);
    
    return group;
  }

  /**
   * Create a helicopter model
   */
  createHelicopter(color = 0x00ff00) {
    const group = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.SphereGeometry(0.3, 8, 6);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.scale.set(1.5, 0.8, 1);
    group.add(body);
    
    // Main rotor
    const rotorGeometry = new THREE.BoxGeometry(4, 0.02, 0.1);
    const rotorMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const rotor = new THREE.Mesh(rotorGeometry, rotorMaterial);
    rotor.position.y = 0.4;
    group.add(rotor);
    
    // Tail boom
    const tailGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 6);
    const tailMaterial = new THREE.MeshLambertMaterial({ color: color });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -1;
    group.add(tail);
    
    // Tail rotor
    const tailRotorGeometry = new THREE.BoxGeometry(0.02, 0.8, 0.05);
    const tailRotorMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const tailRotor = new THREE.Mesh(tailRotorGeometry, tailRotorMaterial);
    tailRotor.position.x = -2;
    group.add(tailRotor);
    
    group.scale.setScalar(0.05);
    return group;
  }

  /**
   * Get appropriate model for aircraft type
   */
  getModelForAircraft(aircraftType, category, color) {
    // For now, use simple models based on category
    switch (category) {
      case 'helicopter':
        return this.createHelicopter(color);
      case 'military':
        return this.createSimpleAirplane(0xff0000); // Red for military
      case 'light':
        return this.createSimpleAirplane(color || 0x4CAF50);
      case 'medium':
        return this.createSimpleAirplane(color || 0x2196F3);
      case 'heavy':
        return this.createSimpleAirplane(color || 0xFF9800);
      case 'super':
        const superModel = this.createSimpleAirplane(color || 0x9C27B0);
        superModel.scale.multiplyScalar(1.5); // Larger for super aircraft
        return superModel;
      default:
        return this.createSimpleAirplane(color || 0xcccccc);
    }
  }

  /**
   * Optimize a loaded model for performance
   */
  optimizeModel(model) {
    model.traverse((child) => {
      if (child.isMesh) {
        // Enable frustum culling
        child.frustumCulled = true;
        
        // Optimize materials
        if (child.material) {
          child.material.needsUpdate = false;
          
          // Disable unnecessary features for performance
          if (child.material.map) {
            child.material.map.generateMipmaps = false;
          }
        }
        
        // Optimize geometry
        if (child.geometry) {
          child.geometry.computeBoundingSphere();
          child.geometry.computeBoundingBox();
        }
      }
    });
    
    // Set appropriate scale
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    // Scale to reasonable size (about 0.1 units)
    if (maxDimension > 0) {
      const scale = 0.1 / maxDimension;
      model.scale.setScalar(scale);
    }
  }

  /**
   * Preload common aircraft models
   */
  async preloadModels() {
    const modelUrls = [
      // Add URLs to your GLTF models here
      // 'assets/models/boeing737.gltf',
      // 'assets/models/airbus320.gltf',
    ];
    
    const loadPromises = modelUrls.map(url => 
      this.loadModel(url).catch(error => {
        console.warn(`Failed to preload model ${url}:`, error);
        return null;
      })
    );
    
    await Promise.allSettled(loadPromises);
    console.log('Model preloading completed');
  }

  /**
   * Clear model cache
   */
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedModels: this.cache.size,
      loadingModels: this.loadingPromises.size
    };
  }
}

