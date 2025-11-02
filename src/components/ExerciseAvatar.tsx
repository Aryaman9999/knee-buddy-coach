import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Group, Quaternion, Euler, Vector3 } from "three";
import { SensorPacket } from "@/types/sensorData";
import { sensorDataMapper } from "@/utils/sensorDataMapper";
import AngleIndicator from "./AngleIndicator";

// All exercise data in one place - exported for use in ExercisePlayer
export const exerciseDefinitions: Record<string, {
  targetAngle: number;
  startingPose: 'standing' | 'sitting' | 'lying';
}> = {
  "1": { targetAngle: 90, startingPose: 'lying' },   // Heel Slides
  "2": { targetAngle: 30, startingPose: 'lying' },   // Quad Sets
  "3": { targetAngle: 45, startingPose: 'lying' },   // Straight Leg Raises
  "4": { targetAngle: 20, startingPose: 'lying' },   // Ankle Pumps
  "5": { targetAngle: 60, startingPose: 'sitting' }, // Short Arc Quads
  "6": { targetAngle: 90, startingPose: 'lying' },   // Hamstring Curls (Prone/Supine)
};

interface ExerciseAvatarProps {
  exerciseId: string;
  currentRep: number;
  isPaused: boolean;
  mode: 'demo' | 'live';
  sensorData?: SensorPacket | null;
  isSensorConnected: boolean;
  trackedLeg: "right" | "left" | "bilateral";
}

const ExerciseAvatar = ({ exerciseId, currentRep, isPaused, mode, sensorData, isSensorConnected, trackedLeg }: ExerciseAvatarProps) => {
  const groupRef = useRef<Group>(null);
  const rightUpperLegRef = useRef<Group>(null);
  const rightKneeRef = useRef<Group>(null);
  const leftUpperLegRef = useRef<Group>(null);
  const leftKneeRef = useRef<Group>(null);
  const angleIndicatorRef = useRef<Group>(null);
  const pelvisMeshRef = useRef<Mesh>(null);

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

      // 1. Apply Pelvis Orientation to the PELVIS MESH (respecting the group's starting pose)
      const pelvisQ = sensorDataMapper.toThreeQuaternion(processed.sensors.pelvis);
      if (pelvisMeshRef.current) {
        pelvisMeshRef.current.quaternion.copy(pelvisQ);
      }

      // 2. Apply RELATIVE Thigh Orientations (relative to pelvis)
      if (rightUpperLegRef.current) {
        const thighQ = sensorDataMapper.toThreeQuaternion(processed.sensors.right_thigh);
        const relativeThighQ = pelvisQ.clone().invert().multiply(thighQ);
        rightUpperLegRef.current.quaternion.copy(relativeThighQ);
      }
      if (leftUpperLegRef.current) {
        const thighQ = sensorDataMapper.toThreeQuaternion(processed.sensors.left_thigh);
        const relativeThighQ = pelvisQ.clone().invert().multiply(thighQ);
        leftUpperLegRef.current.quaternion.copy(relativeThighQ);
      }

      // 3. Apply RELATIVE Knee Orientations (relative to thigh)
      if (rightKneeRef.current) {
        const thighQ = sensorDataMapper.toThreeQuaternion(processed.sensors.right_thigh);
        const shinQ = sensorDataMapper.toThreeQuaternion(processed.sensors.right_shin);
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
      case "1": // Heel Slides (Lying)
        if (rightUpperLegRef.current && rightKneeRef.current) {
          const slide = (Math.sin(time) * 0.5 + 0.5) * (Math.PI / 2); // 0 to 90 deg
          // Flex hip
          rightUpperLegRef.current.quaternion.copy(createQuaternion(slide, 0, 0));
          // Flex knee
          rightKneeRef.current.quaternion.copy(createQuaternion(slide, 0, 0));
        }
        break;

      case "2": // Quad Sets (Lying)
        // This is an isometric exercise. No joint movement.
        // We will "pulse" the thigh material to show contraction.
        if (rightUpperLegRef.current) {
          const pulse = Math.abs(Math.sin(time)) * 0.5;
          const thighMesh = rightUpperLegRef.current.children[0] as Mesh;
          if (thighMesh && thighMesh.material) {
            (thighMesh.material as any).emissiveIntensity = pulse;
            (thighMesh.material as any).emissive.set("#ffd89b");
          }
        }
        break;

      case "3": // Straight Leg Raises (Lying)
        if (rightUpperLegRef.current && rightKneeRef.current) {
          const raise = (Math.sin(time) * 0.5 + 0.5) * (Math.PI / 4); // 0 to 45 deg
          // Raise straight leg from hip
          rightUpperLegRef.current.quaternion.copy(createQuaternion(-raise, 0, 0));
          // Keep knee straight
          rightKneeRef.current.quaternion.copy(createQuaternion(0, 0, 0));
        }
        break;

      case "4": // Ankle Pumps (Lying)
        // This animates the foot, not the knee.
        if (rightKneeRef.current) {
          const footMesh = rightKneeRef.current.getObjectByName("right_foot") as Mesh;
          if (footMesh) {
            const pump = Math.sin(time * 2) * 0.4; // Back and forth
            footMesh.quaternion.copy(createQuaternion(pump, 0, 0));
          }
        }
        break;

      case "5": // Short Arc Quads (Sitting)
        if (rightKneeRef.current) {
          // Start from 90deg bend (from hipRotation)
          // Animate from 90deg to ~60deg (a 30deg extension)
          const extension = (Math.sin(time) * 0.5 + 0.5) * (Math.PI / 6); // 0 to 30 deg
          // Apply negative rotation for extension
          rightKneeRef.current.quaternion.copy(createQuaternion(-extension, 0, 0));
        }
        break;

      case "6": // Hamstring Curls (Lying)
        if (rightKneeRef.current) {
          const curl = (Math.sin(time) * 0.5 + 0.5) * (Math.PI / 2); // 0 to 90 deg
          // Flex knee while lying
          rightKneeRef.current.quaternion.copy(createQuaternion(curl, 0, 0));
        }
        break;
    }

    // Update current knee angle for visualization
    // Use the tracked leg for demo angle as well
    const trackedKneeRef = trackedLeg === 'left' ? leftKneeRef : rightKneeRef;

    if (trackedKneeRef.current) {
      const angle = quaternionToAngle(trackedKneeRef.current.quaternion);
      setCurrentKneeAngle(angle);

      // Update indicator position to follow knee in demo mode
      const worldPos = new Vector3();
      trackedKneeRef.current.getWorldPosition(worldPos);
      setKneeWorldPosition(worldPos.clone().add(new Vector3(0.3, 0, 0.3)));
    }
  });

  const exerciseDef = exerciseDefinitions[exerciseId] || exerciseDefinitions["1"];
  const pose = exerciseDef.startingPose;

  let pelvisRotation: [number, number, number] = [0, 0, 0];
  let pelvisPosition: [number, number, number] = [0, 0, 0];
  let hipRotation: [number, number, number] = [0, 0, 0];
  let floorYPosition = -1.25;

  if (pose === 'lying') {
    // Lie flat on the "bed"
    pelvisRotation = [-Math.PI / 2, 0, 0]; // Rotate whole body 90deg
    pelvisPosition = [0, 0.2, 0]; // Position on top of the bed
    hipRotation = [0, 0, 0]; // Legs are straight
    floorYPosition = -0.1; // Move floor up to act as bed
  } else if (pose === 'sitting') {
    // Sit on the "stool"
    pelvisRotation = [0, 0, 0]; // Pelvis is upright
    pelvisPosition = [0, 0.6, 0.1]; // Position on top of the stool
    hipRotation = [-Math.PI / 2, 0, 0]; // Legs bent 90deg at hip
    floorYPosition = -0.5; // Floor is lower
  }
  // 'standing' pose uses the default [0,0,0] values

  const rightLegPosition: [number, number, number] = [0.15, -0.125, 0];
  const leftLegPosition: [number, number, number] = [-0.15, -0.125, 0];

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

      {/* Reference platform (bed) for lying exercises */}
      <mesh
        visible={pose === 'lying'}
        position={[0, 0, -0.5]}
      >
        <boxGeometry args={[1, 0.2, 2.5]} />
        <meshStandardMaterial
          color="#d0dde8"
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Reference platform (stool) for sitting exercises */}
      <mesh
        visible={pose === 'sitting'}
        position={[0, 0.2, 0.1]}
      >
        <boxGeometry args={[0.5, 0.4, 0.5]} />
        <meshStandardMaterial
          color="#a89277"
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      <group ref={groupRef} position={[0, 0, 0]} rotation={pelvisRotation}>
        {/* Lower Back / Pelvis - soft teal/blue */}
        <mesh ref={pelvisMeshRef} position={pelvisPosition}>
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
                <mesh name="right_foot" position={[0, -0.3, 0.05]}>
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
                <mesh name="left_foot" position={[0, -0.3, 0.05]}>
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
          targetAngle={exerciseDef.targetAngle}
          currentAngle={currentKneeAngle}
          position={new Vector3(0, 0, 0)}
          showArrows={true}
        />
      </group>
    </>
  );
};

export default ExerciseAvatar;
