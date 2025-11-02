import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Group, Quaternion, Euler, Vector3 } from "three";
import { SensorPacket } from "@/types/sensorData";
import { sensorDataMapper } from "@/utils/sensorDataMapper";
import AngleIndicator from "./AngleIndicator";

interface ExerciseAvatarProps {
  exerciseId: string;
  currentRep: number;
  isPaused: boolean;
  mode: 'demo' | 'live';
  sensorData?: SensorPacket | null;
  isSensorConnected: boolean;
  trackedLeg: "right" | "left" | "bilateral";
}

// Target angles for each exercise (in degrees)
const exerciseTargetAngles: Record<string, number> = {
  "1": 90,  // Heel Slides
  "2": 30,  // Quad Sets
  "3": 45,  // Straight Leg Raises
  "4": 20,  // Ankle Pumps
  "5": 60,  // Short Arc Quads (Seated)
  "6": 90,  // Hamstring Curls (Seated)
};

// Exercise poses configuration
const exercisePoses: Record<string, "lying" | "sitting"> = {
  "1": "lying",   // Heel Slides
  "2": "lying",   // Quad Sets
  "3": "lying",   // Straight Leg Raises
  "4": "lying",   // Ankle Pumps
  "5": "sitting", // Short Arc Quads
  "6": "lying",   // Hamstring Curls (Prone)
};

const ExerciseAvatar = ({ exerciseId, currentRep, isPaused, mode, sensorData, isSensorConnected, trackedLeg }: ExerciseAvatarProps) => {
  const groupRef = useRef<Group>(null);
  const rightUpperLegRef = useRef<Group>(null);
  const rightKneeRef = useRef<Group>(null);
  const leftUpperLegRef = useRef<Group>(null);
  const leftKneeRef = useRef<Group>(null);
  const angleIndicatorRef = useRef<Group>(null);

  const [currentKneeAngle, setCurrentKneeAngle] = useState(0);
  const [kneeWorldPosition, setKneeWorldPosition] = useState(new Vector3(0.3, 0, 0.3));

  const animationSpeed = 2;

  // Helper to convert quaternion to angle in degrees
  // Handles multiple axes to avoid sensor mounting orientation issues
  const quaternionToAngle = (quaternion: Quaternion): number => {
    const euler = new Euler().setFromQuaternion(quaternion);
    const xAngle = Math.abs((euler.x * 180) / Math.PI);
    const yAngle = Math.abs((euler.y * 180) / Math.PI);
    const zAngle = Math.abs((euler.z * 180) / Math.PI);
    
    // Return the largest angle (primary flexion axis)
    return Math.max(xAngle, yAngle, zAngle);
  };

  useFrame((state) => {
    if (!groupRef.current || isPaused) return;

    // Live mode: Apply sensor data to joints ONLY if connected
    if (mode === 'live' && sensorData && isSensorConnected) {
      if (!sensorDataMapper.isValidPacket(sensorData)) {
        console.warn('Invalid sensor packet received');
        return;
      }

      const processed = sensorDataMapper.processSensorPacket(sensorData, true);

      // 1. Apply Pelvis (Base) Orientation to entire body
      const pelvisQ = sensorDataMapper.toThreeQuaternion(processed.sensors.pelvis);
      groupRef.current.quaternion.copy(pelvisQ);

      // 2. Apply RELATIVE Thigh Orientations (relative to pelvis)
      // This fixes the "double rotation" kinematic flaw
      if (rightUpperLegRef.current) {
        const thighQ = sensorDataMapper.toThreeQuaternion(processed.sensors.right_thigh);
        // Calculate thigh rotation relative to pelvis
        const relativeThighQ = pelvisQ.clone().invert().multiply(thighQ);
        rightUpperLegRef.current.quaternion.copy(relativeThighQ);
      }
      if (leftUpperLegRef.current) {
        const thighQ = sensorDataMapper.toThreeQuaternion(processed.sensors.left_thigh);
        const relativeThighQ = pelvisQ.clone().invert().multiply(thighQ);
        leftUpperLegRef.current.quaternion.copy(relativeThighQ);
      }

      // 3. Apply RELATIVE Knee Orientations (relative to thigh)
      // Calculate shin rotation relative to thigh to avoid broken leg joints
      if (rightKneeRef.current) {
        const thighQ = sensorDataMapper.toThreeQuaternion(processed.sensors.right_thigh);
        const shinQ = sensorDataMapper.toThreeQuaternion(processed.sensors.right_shin);
        
        // Calculate relative rotation: shin relative to thigh
        // relative = thigh_inverse * shin
        const relativeShinQ = thighQ.clone().invert().multiply(shinQ);
        rightKneeRef.current.quaternion.copy(relativeShinQ);
      }

      if (leftKneeRef.current) {
        const thighQ = sensorDataMapper.toThreeQuaternion(processed.sensors.left_thigh);
        const shinQ = sensorDataMapper.toThreeQuaternion(processed.sensors.left_shin);
        const relativeShinQ = thighQ.clone().invert().multiply(shinQ);
        leftKneeRef.current.quaternion.copy(relativeShinQ);
      }

      // 4. Calculate Angle for Indicator based on tracked leg
      const usesLeftLeg = trackedLeg === "left";
      const thighSensor = usesLeftLeg ? processed.sensors.left_thigh : processed.sensors.right_thigh;
      const shinSensor = usesLeftLeg ? processed.sensors.left_shin : processed.sensors.right_shin;
      const trackedKneeRef = usesLeftLeg ? leftKneeRef : rightKneeRef;
      
      const kneeAngle = sensorDataMapper.calculateJointAngle(thighSensor, shinSensor);
      setCurrentKneeAngle(kneeAngle);
      
      // 5. Update indicator world position to track knee
      if (trackedKneeRef.current) {
        const worldPos = new Vector3();
        trackedKneeRef.current.getWorldPosition(worldPos);
        setKneeWorldPosition(worldPos.clone().add(new Vector3(0.3, 0, 0.3)));
      }
      
      return;
    }

    // In live mode without sensor connection, don't move at all
    if (mode === 'live' && !isSensorConnected) {
      return; // Stay still
    }

    // Demo mode: Use animated demo with slower speed for better learning
    const animationSpeed = mode === 'demo' ? 0.5 : 1.0;
    const time = state.clock.getElapsedTime() * animationSpeed;

    // Helper to create quaternion from euler angles
    const createQuaternion = (x: number, y: number, z: number) => {
      const euler = new Euler(x, y, z);
      return new Quaternion().setFromEuler(euler);
    };

    // Animation based on exercise type using quaternions
    switch (exerciseId) {
      case "1": // Heel Slides
        if (rightUpperLegRef.current && rightKneeRef.current) {
          const slide = Math.sin(time) * 0.5;
          rightUpperLegRef.current.quaternion.copy(createQuaternion(slide, 0, 0));
          rightKneeRef.current.quaternion.copy(createQuaternion(Math.abs(slide) * 0.8, 0, 0));
        }
        break;

      case "2": // Quad Sets - Isometric (no movement, pulsing visual)
        // No joint rotation - static pose
        if (rightUpperLegRef.current && leftUpperLegRef.current) {
          rightUpperLegRef.current.quaternion.copy(createQuaternion(0, 0, 0));
          leftUpperLegRef.current.quaternion.copy(createQuaternion(0, 0, 0));
        }
        // Note: Pulsing effect should be added via material emissive animation
        break;

      case "3": // Straight Leg Raises
        if (rightUpperLegRef.current && rightKneeRef.current) {
          const raise = Math.sin(time) * 0.5 + 0.5;
          rightUpperLegRef.current.quaternion.copy(createQuaternion(-raise * 0.8, 0, 0));
          rightKneeRef.current.quaternion.copy(createQuaternion(0, 0, 0));
        }
        break;

      case "4": // Ankle Pumps - feet move, not knees
        // Feet should pump up and down (dorsiflexion/plantarflexion)
        // Since we don't have separate foot refs, we'll keep legs still
        if (rightUpperLegRef.current && leftUpperLegRef.current) {
          rightUpperLegRef.current.quaternion.copy(createQuaternion(0, 0, 0));
          leftUpperLegRef.current.quaternion.copy(createQuaternion(0, 0, 0));
        }
        // Note: Proper implementation would rotate foot meshes on X-axis
        break;

      case "5": // Short Arc Quads (Seated - extending from 90°)
        if (rightUpperLegRef.current && rightKneeRef.current) {
          const extension = Math.sin(time) * 0.6; // Extension from seated position
          rightUpperLegRef.current.quaternion.copy(createQuaternion(0, 0, 0)); // Thigh stays horizontal
          rightKneeRef.current.quaternion.copy(createQuaternion(-Math.abs(extension), 0, 0)); // Negative for extension
        }
        break;

      case "6": // Hamstring Curls (Prone/Lying - knee flexion)
        if (rightUpperLegRef.current && rightKneeRef.current) {
          const curl = Math.sin(time) * 0.9; // Curl motion
          rightUpperLegRef.current.quaternion.copy(createQuaternion(0, 0, 0)); // Thigh stays on ground
          rightKneeRef.current.quaternion.copy(createQuaternion(Math.abs(curl), 0, 0)); // Knee flexes upward
        }
        break;
    }

    // Update current knee angle for visualization
    if (rightKneeRef.current) {
      const angle = quaternionToAngle(rightKneeRef.current.quaternion);
      setCurrentKneeAngle(angle);
      
      // Update indicator position to follow knee in demo mode
      const worldPos = new Vector3();
      rightKneeRef.current.getWorldPosition(worldPos);
      setKneeWorldPosition(worldPos.clone().add(new Vector3(0.3, 0, 0.3)));
    }
  });

  const pose = exercisePoses[exerciseId] || "lying";
  const isSitting = pose === "sitting";

  // Position adjustments based on pose
  const pelvisRotation: [number, number, number] = isSitting ? [0, 0, 0] : [0, 0, 0];
  const pelvisPosition: [number, number, number] = isSitting ? [0, 0.5, 0] : [0, 0, 0];
  const rightLegPosition: [number, number, number] = isSitting ? [0.15, 0.375, 0.1] : [0.15, -0.125, 0];
  const leftLegPosition: [number, number, number] = isSitting ? [-0.15, 0.375, 0.1] : [-0.15, -0.125, 0];
  const hipRotation: [number, number, number] = isSitting ? [-Math.PI / 2, 0, 0] : [0, 0, 0];
  const floorYPosition = isSitting ? -0.8 : -1.25;

  return (
    <>
      {/* Soft ambient lighting for calm atmosphere */}
      <ambientLight intensity={0.6} color="#f0f4f8" />
      
      {/* Key light - soft white from top-right */}
      <directionalLight 
        position={[3, 5, 4]} 
        intensity={0.8} 
        color="#ffffff"
      />
      
      {/* Fill light - gentle blue from left */}
      <directionalLight 
        position={[-3, 3, 2]} 
        intensity={0.4} 
        color="#a8d5f2"
      />
      
      {/* Rim light - subtle highlight */}
      <pointLight 
        position={[0, 2, -3]} 
        intensity={0.3} 
        color="#e8f5e9"
      />

      <group ref={groupRef} position={[0, 0, 0]}>
        {/* Lower Back / Pelvis - soft teal/blue */}
        <mesh position={pelvisPosition} rotation={pelvisRotation}>
          <boxGeometry args={[0.4, 0.25, 0.2]} />
          <meshStandardMaterial 
            color="#7eb3d4" 
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>

        {/* Right Leg */}
        <group position={rightLegPosition}>
          {/* Hip Joint - rotation point for upper leg */}
          <group ref={rightUpperLegRef} rotation={hipRotation}>
            {/* Upper Leg (Thigh) - warm beige */}
            <mesh position={[0, -0.25, 0]}>
              <cylinderGeometry args={[0.08, 0.07, 0.5, 32]} />
              <meshStandardMaterial 
                color="#c4a788" 
                roughness={0.5}
                metalness={0.05}
              />
            </mesh>
            
            {/* Knee Joint - highlighted with glow */}
            <group ref={rightKneeRef} position={[0, -0.5, 0]}>
              {/* Main knee sphere */}
              <mesh>
                <sphereGeometry args={[0.11, 32, 32]} />
                <meshStandardMaterial 
                  color="#a89277" 
                  roughness={0.3}
                  metalness={0.1}
                  emissive="#ffd89b"
                  emissiveIntensity={0.15}
                />
              </mesh>
              
              {/* Glow ring around knee */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.13, 0.015, 16, 32]} />
                <meshBasicMaterial 
                  color="#ffd89b" 
                  transparent 
                  opacity={0.4}
                />
              </mesh>
              
              {/* Lower Leg (Shin) - warm beige */}
              <group position={[0, -0.25, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.07, 0.06, 0.5, 32]} />
                  <meshStandardMaterial 
                    color="#c4a788" 
                    roughness={0.5}
                    metalness={0.05}
                  />
                </mesh>
                
                {/* Foot indicator */}
                <mesh position={[0, -0.3, 0.05]}>
                  <boxGeometry args={[0.08, 0.04, 0.12]} />
                  <meshStandardMaterial 
                    color="#b39677" 
                    roughness={0.6}
                  />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* Left Leg */}
        <group position={leftLegPosition}>
          {/* Hip Joint - rotation point for upper leg */}
          <group ref={leftUpperLegRef} rotation={hipRotation}>
            {/* Upper Leg (Thigh) */}
            <mesh position={[0, -0.25, 0]}>
              <cylinderGeometry args={[0.08, 0.07, 0.5, 32]} />
              <meshStandardMaterial 
                color="#c4a788" 
                roughness={0.5}
                metalness={0.05}
              />
            </mesh>
            
            {/* Knee Joint */}
            <group ref={leftKneeRef} position={[0, -0.5, 0]}>
              <mesh>
                <sphereGeometry args={[0.11, 32, 32]} />
                <meshStandardMaterial 
                  color="#a89277" 
                  roughness={0.3}
                  metalness={0.1}
                />
              </mesh>
              
              {/* Lower Leg (Shin) */}
              <group position={[0, -0.25, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.07, 0.06, 0.5, 32]} />
                  <meshStandardMaterial 
                    color="#c4a788" 
                    roughness={0.5}
                    metalness={0.05}
                  />
                </mesh>
                
                {/* Foot indicator */}
                <mesh position={[0, -0.3, 0.05]}>
                  <boxGeometry args={[0.08, 0.04, 0.12]} />
                  <meshStandardMaterial 
                    color="#b39677" 
                    roughness={0.6}
                  />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* Enhanced floor with gradient effect */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, floorYPosition, 0]}
        >
          <circleGeometry args={[2.5, 64]} />
          <meshStandardMaterial 
            color="#e8eff5" 
            roughness={0.9}
            metalness={0.05}
            opacity={0.95} 
            transparent 
          />
        </mesh>
        
        {/* Subtle grid pattern on floor */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, floorYPosition + 0.001, 0]}
        >
          <circleGeometry args={[2.5, 64]} />
          <meshBasicMaterial 
            color="#d0dde8" 
            wireframe 
            opacity={0.15} 
            transparent 
          />
        </mesh>

      </group>
      
      {/* Angle Indicator - in world space, tracks knee position */}
      <group ref={angleIndicatorRef} position={kneeWorldPosition}>
        <AngleIndicator
          targetAngle={exerciseTargetAngles[exerciseId] || 90}
          currentAngle={currentKneeAngle}
          position={new Vector3(0, 0, 0)}
          showArrows={true}
        />
      </group>
    </>
  );
};

export default ExerciseAvatar;
