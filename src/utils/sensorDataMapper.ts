import { Quaternion as ThreeQuaternion, Euler } from 'three';
import { Quaternion, SensorPacket } from '@/types/sensorData';

export class SensorDataMapper {
  private calibrationOffsets: Map<string, Quaternion> = new Map();
  private smoothingBuffer: Map<string, Quaternion[]> = new Map();
  private readonly bufferSize = 5; // Moving average window

  // Convert our Quaternion to Three.js Quaternion
  toThreeQuaternion(q: Quaternion): ThreeQuaternion {
    return new ThreeQuaternion(q.qx, q.qy, q.qz, q.qw);
  }

  // Apply calibration offset to quaternion
  applyCalibration(q: Quaternion, sensorId: string): Quaternion {
    const offset = this.calibrationOffsets.get(sensorId);
    if (!offset) return q;

    const qThree = this.toThreeQuaternion(q);
    const offsetThree = this.toThreeQuaternion(offset);
    
    // Apply inverse of calibration offset
    offsetThree.invert();
    qThree.multiply(offsetThree);

    return {
      qw: qThree.w,
      qx: qThree.x,
      qy: qThree.y,
      qz: qThree.z
    };
  }

  // Smooth quaternion using moving average
  smoothQuaternion(q: Quaternion, sensorId: string): Quaternion {
    let buffer = this.smoothingBuffer.get(sensorId);
    if (!buffer) {
      buffer = [];
      this.smoothingBuffer.set(sensorId, buffer);
    }

    buffer.push(q);
    if (buffer.length > this.bufferSize) {
      buffer.shift();
    }

    // Average quaternions (simplified - should use slerp for accuracy)
    const avg = {
      qw: buffer.reduce((sum, q) => sum + q.qw, 0) / buffer.length,
      qx: buffer.reduce((sum, q) => sum + q.qx, 0) / buffer.length,
      qy: buffer.reduce((sum, q) => sum + q.qy, 0) / buffer.length,
      qz: buffer.reduce((sum, q) => sum + q.qz, 0) / buffer.length
    };

    // Normalize
    const mag = Math.sqrt(avg.qw * avg.qw + avg.qx * avg.qx + avg.qy * avg.qy + avg.qz * avg.qz);
    return {
      qw: avg.qw / mag,
      qx: avg.qx / mag,
      qy: avg.qy / mag,
      qz: avg.qz / mag
    };
  }

  // Calculate angle between two quaternions (for joint angles)
  calculateJointAngle(q1: Quaternion, q2: Quaternion): number {
    const thigh = this.toThreeQuaternion(q1);
    const shin = this.toThreeQuaternion(q2);
    
    // Calculate relative rotation
    const relative = thigh.clone().invert().multiply(shin);
    
    // Convert to Euler and extract X rotation (knee flexion/extension)
    const euler = new Euler().setFromQuaternion(relative);
    const angleInDegrees = Math.abs((euler.x * 180) / Math.PI);
    
    return angleInDegrees;
  }

  // Process sensor packet with calibration and smoothing
  processSensorPacket(packet: SensorPacket, enableSmoothing: boolean = true): SensorPacket {
    const processed = { ...packet };

    // Process each sensor
    for (const [key, quaternion] of Object.entries(packet.sensors)) {
      let q = quaternion;
      
      // Apply calibration
      q = this.applyCalibration(q, key);
      
      // Apply smoothing
      if (enableSmoothing) {
        q = this.smoothQuaternion(q, key);
      }
      
      processed.sensors[key as keyof typeof processed.sensors] = q;
    }

    return processed;
  }

  // Capture current pose as calibration
  calibrate(packet: SensorPacket): void {
    for (const [key, quaternion] of Object.entries(packet.sensors)) {
      this.calibrationOffsets.set(key, quaternion);
    }
    console.log('Calibration captured', this.calibrationOffsets);
  }

  // Clear calibration
  clearCalibration(): void {
    this.calibrationOffsets.clear();
    this.smoothingBuffer.clear();
  }

  // Validate packet data
  isValidPacket(packet: SensorPacket): boolean {
    // Check if all quaternions are valid
    for (const q of Object.values(packet.sensors)) {
      const mag = Math.sqrt(q.qw * q.qw + q.qx * q.qx + q.qy * q.qy + q.qz * q.qz);
      if (Math.abs(mag - 1.0) > 0.1) {
        console.warn('Invalid quaternion magnitude:', mag);
        return false;
      }
    }
    return true;
  }
}

export const sensorDataMapper = new SensorDataMapper();
