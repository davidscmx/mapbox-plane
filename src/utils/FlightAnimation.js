import * as THREE from 'three';

/**
 * Flight Animation Utilities
 * Handles smooth interpolation and animation of aircraft movement
 */
export class FlightAnimation {
  constructor() {
    this.activeAnimations = new Map();
    this.clock = new THREE.Clock();
  }

  /**
   * Interpolate between two positions with smooth animation
   */
  interpolatePosition(from, to, progress) {
    return {
      longitude: this.lerp(from.longitude, to.longitude, progress),
      latitude: this.lerp(from.latitude, to.latitude, progress),
      altitude: this.lerp(from.altitude || 0, to.altitude || 0, progress)
    };
  }

  /**
   * Linear interpolation
   */
  lerp(start, end, progress) {
    return start + (end - start) * progress;
  }

  /**
   * Smooth step interpolation (ease in/out)
   */
  smoothStep(progress) {
    return progress * progress * (3 - 2 * progress);
  }

  /**
   * Calculate heading between two points
   */
  calculateHeading(from, to) {
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    const lat1 = from.latitude * Math.PI / 180;
    const lat2 = to.latitude * Math.PI / 180;
    
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    
    let heading = Math.atan2(y, x) * 180 / Math.PI;
    return (heading + 360) % 360;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(from, to) {
    const R = 6371; // Earth's radius in km
    const dLat = (to.latitude - from.latitude) * Math.PI / 180;
    const dLon = (to.longitude - from.longitude) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(from.latitude * Math.PI / 180) * Math.cos(to.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Create smooth flight path between multiple points
   */
  createFlightPath(points, segments = 50) {
    if (points.length < 2) return points;
    
    const path = [];
    
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      
      for (let j = 0; j < segments; j++) {
        const progress = j / segments;
        const smoothProgress = this.smoothStep(progress);
        
        const interpolated = this.interpolatePosition(from, to, smoothProgress);
        path.push(interpolated);
      }
    }
    
    // Add the final point
    path.push(points[points.length - 1]);
    
    return path;
  }

  /**
   * Animate aircraft model rotation based on movement
   */
  updateAircraftRotation(model, currentPos, previousPos, heading) {
    if (!model || !currentPos || !previousPos) return;
    
    // Calculate pitch based on altitude change
    const altitudeDiff = (currentPos.altitude || 0) - (previousPos.altitude || 0);
    const distance = this.calculateDistance(previousPos, currentPos);
    const pitch = distance > 0 ? Math.atan(altitudeDiff / (distance * 1000)) : 0;
    
    // Apply rotations
    model.rotation.y = (heading || 0) * Math.PI / 180; // Yaw (heading)
    model.rotation.x = pitch; // Pitch
    
    // Add slight banking for turns
    if (heading !== undefined && model.userData.previousHeading !== undefined) {
      const headingDiff = heading - model.userData.previousHeading;
      let normalizedDiff = headingDiff;
      
      // Handle 360-degree wrap-around
      if (normalizedDiff > 180) normalizedDiff -= 360;
      if (normalizedDiff < -180) normalizedDiff += 360;
      
      const bankAngle = Math.max(-30, Math.min(30, normalizedDiff * 2)) * Math.PI / 180;
      model.rotation.z = bankAngle;
    }
    
    model.userData.previousHeading = heading;
  }

  /**
   * Create animation for aircraft movement
   */
  createFlightAnimation(aircraftId, fromPos, toPos, duration = 5000) {
    const animation = {
      id: aircraftId,
      startTime: Date.now(),
      duration: duration,
      fromPos: { ...fromPos },
      toPos: { ...toPos },
      heading: this.calculateHeading(fromPos, toPos),
      distance: this.calculateDistance(fromPos, toPos),
      completed: false
    };
    
    this.activeAnimations.set(aircraftId, animation);
    return animation;
  }

  /**
   * Update animation and get current position
   */
  updateAnimation(aircraftId) {
    const animation = this.activeAnimations.get(aircraftId);
    if (!animation || animation.completed) return null;
    
    const elapsed = Date.now() - animation.startTime;
    const progress = Math.min(elapsed / animation.duration, 1);
    const smoothProgress = this.smoothStep(progress);
    
    const currentPos = this.interpolatePosition(
      animation.fromPos, 
      animation.toPos, 
      smoothProgress
    );
    
    if (progress >= 1) {
      animation.completed = true;
      this.activeAnimations.delete(aircraftId);
    }
    
    return {
      position: currentPos,
      heading: animation.heading,
      progress: progress,
      completed: animation.completed
    };
  }

  /**
   * Get all active animations
   */
  getActiveAnimations() {
    return Array.from(this.activeAnimations.values());
  }

  /**
   * Clear completed animations
   */
  clearCompletedAnimations() {
    for (const [id, animation] of this.activeAnimations.entries()) {
      if (animation.completed) {
        this.activeAnimations.delete(id);
      }
    }
  }

  /**
   * Stop animation for specific aircraft
   */
  stopAnimation(aircraftId) {
    this.activeAnimations.delete(aircraftId);
  }

  /**
   * Clear all animations
   */
  clearAllAnimations() {
    this.activeAnimations.clear();
  }

  /**
   * Create flight trail points
   */
  createFlightTrail(positions, maxPoints = 10) {
    if (!positions || positions.length === 0) return [];
    
    // Keep only the most recent positions
    const recentPositions = positions.slice(-maxPoints);
    
    // Create trail with fading opacity
    return recentPositions.map((pos, index) => ({
      ...pos,
      opacity: (index + 1) / recentPositions.length,
      age: recentPositions.length - index
    }));
  }

  /**
   * Calculate smooth camera follow position
   */
  calculateCameraFollow(targetPos, currentCameraPos, followDistance = 1000, height = 500) {
    if (!targetPos) return currentCameraPos;
    
    // Convert to world coordinates (simplified)
    const targetX = targetPos.longitude;
    const targetY = targetPos.latitude;
    const targetZ = (targetPos.altitude || 0) + height;
    
    // Smooth camera movement
    const lerpFactor = 0.05;
    
    return {
      x: this.lerp(currentCameraPos.x, targetX, lerpFactor),
      y: this.lerp(currentCameraPos.y, targetY, lerpFactor),
      z: this.lerp(currentCameraPos.z, targetZ, lerpFactor)
    };
  }

  /**
   * Performance optimization: cull animations outside view
   */
  cullAnimationsOutsideView(bounds) {
    for (const [id, animation] of this.activeAnimations.entries()) {
      const pos = animation.toPos;
      
      if (pos.longitude < bounds.west || pos.longitude > bounds.east ||
          pos.latitude < bounds.south || pos.latitude > bounds.north) {
        // Animation is outside view, mark for removal
        animation.culled = true;
      } else {
        animation.culled = false;
      }
    }
  }

  /**
   * Get animation statistics
   */
  getStats() {
    const animations = Array.from(this.activeAnimations.values());
    
    return {
      total: animations.length,
      active: animations.filter(a => !a.completed && !a.culled).length,
      completed: animations.filter(a => a.completed).length,
      culled: animations.filter(a => a.culled).length
    };
  }
}

