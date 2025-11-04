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
  "1": { targetAngle: 90, startingPose: 'lying' },     // Heel Slides - lying with knee bend
  "2": { targetAngle: 30, startingPose: 'lying' },     // Quad Sets - lying, isometric
  "3": { targetAngle: 45, startingPose: 'lying' },     // Straight Leg Raises - lying, lift straight leg
  "4": { targetAngle: 20, startingPose: 'lying' },     // Ankle Pumps - lying, flex/point foot
  "5": { targetAngle: 60, startingPose: 'lying' },     // Short Arc Quads - lying with support under knee
  "6": { targetAngle: 90, startingPose: 'standing' },  // Hamstring Curls - standing, bend knee back
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

    case "5": // Short Arc Quads (Lying with support under knee)
      if (rightKneeRef.current && rightUpperLegRef.current) {
        // Thigh stays on support (slight hip flexion)
        rightUpperLegRef.current.quaternion.copy(createQuaternion(0.3, 0, 0));
        // Extend lower leg from bent to straight (lifting heel off floor)
        const extension = (Math.sin(time) * 0.5 + 0.5) * (Math.PI / 3); // 0 to 60 deg
        rightKneeRef.current.quaternion.copy(createQuaternion(-extension, 0, 0));
      }
      break;

    case "6": // Hamstring Curls (Standing)
      if (rightKneeRef.current && rightUpperLegRef.current) {
        // Keep thigh vertical (no hip movement)
        rightUpperLegRef.current.quaternion.copy(createQuaternion(0, 0, 0));
        // Curl lower leg backward (bring heel toward buttocks)
        const curl = (Math.sin(time) * 0.5 + 0.5) * (Math.PI / 2); // 0 to 90 deg
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
  let bedPosition: [number, number, number] = [0, -0.1, 0];

  if (pose === 'lying') {
    // Lie flat on the "bed"
    pelvisRotation = [-Math.PI / 2, 0, 0]; // Rotate whole body 90deg forward
    pelvisPosition = [0, 0.1, 0]; // Position on bed
    hipRotation = [0, 0, 0]; // Legs straight relative to pelvis
    bedPosition = [0, -0.1, 0]; // Bed directly below
    floorYPosition = -0.3; // Raise floor to act as bed surface
  } else if (pose === 'sitting') {
    // Sit on the chair - pelvis on seat, legs hanging down
    pelvisRotation = [0, 0, 0]; // Pelvis upright
    pelvisPosition = [0, 0.65, 0]; // Sit on chair seat (raised higher)
    hipRotation = [Math.PI / 2, 0, 0]; // Legs bent 90deg down
    floorYPosition = -1.25; // Normal floor for feet to rest
  } else if (pose === 'standing') {
    // Stand upright on the floor
    pelvisRotation = [0, 0, 0]; // Pelvis upright
    pelvisPosition = [0, 0, 0]; // Stand on floor
    hipRotation = [0, 0, 0]; // Legs straight down
    floorYPosition = -1.25; // Normal floor position
  }

  const rightLegPosition: [number, number, number] = [0.15, -0.125, 0];
  const leftLegPosition: [number, number, number] = [-0.15, -0.125, 0];

  return (
    <>
      {/* Enhanced lighting for professional look */}
      <ambientLight intensity={0.7} color="#f5f7fa" />
      
      {/* Main key light - clean white from top-right */}
      <directionalLight 
        position={[4, 6, 5]} 
        intensity={1.2} 
        color="#ffffff"
        castShadow
      />
      
      {/* Fill light - soft blue from left for depth */}
      <directionalLight 
        position={[-4, 4, 3]} 
        intensity={0.5} 
        color="#e3f2fd"
      />
      
      {/* Rim light - accent highlight from behind */}
      <pointLight 
        position={[0, 3, -4]} 
        intensity={0.6} 
        color="#fff3e0"
      />
      
      {/* Bottom fill - subtle uplighting */}
      <pointLight 
        position={[0, -2, 2]} 
        intensity={0.3} 
        color="#f0f4f8"
      />

      {/* Professional therapy bed for lying exercises - semi-transparent for visibility */}
      <mesh
        visible={pose === 'lying'}
        position={bedPosition}
      >
        <boxGeometry args={[1.2, 0.12, 2]} />
        <meshStandardMaterial
          color="#d4e3f0"
          roughness={0.5}
          metalness={0.1}
          transparent={true}
          opacity={0.7}
        />
      </mesh>

      {/* Chair for sitting exercises */}
      <group visible={pose === 'sitting'}>
        {/* Chair seat - professional design */}
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.5, 0.08, 0.5]} />
          <meshStandardMaterial
            color="#705940"
            roughness={0.4}
            metalness={0.15}
          />
        </mesh>
        
        {/* Chair back */}
        <mesh position={[0, 0.75, -0.22]}>
          <boxGeometry args={[0.5, 0.65, 0.08]} />
          <meshStandardMaterial
            color="#705940"
            roughness={0.4}
            metalness={0.15}
          />
        </mesh>
        
        {/* Chair legs - front left */}
        <mesh position={[-0.18, 0.15, 0.18]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 16]} />
          <meshStandardMaterial
            color="#5a4730"
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
        
        {/* Chair legs - front right */}
        <mesh position={[0.18, 0.15, 0.18]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 16]} />
          <meshStandardMaterial
            color="#5a4730"
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
        
        {/* Chair legs - back left */}
        <mesh position={[-0.18, 0.15, -0.18]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 16]} />
          <meshStandardMaterial
            color="#5a4730"
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
        
        {/* Chair legs - back right */}
        <mesh position={[0.18, 0.15, -0.18]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 16]} />
          <meshStandardMaterial
            color="#5a4730"
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
      </group>

      {/* Foam roll support for Short Arc Quads (exercise 5) */}
      <mesh
        visible={pose === 'lying' && exerciseId === '5'}
        position={[0.15, -0.15, -0.3]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.08, 0.08, 0.35, 16]} />
        <meshStandardMaterial
          color="#f0e5d8"
          roughness={0.6}
          metalness={0.08}
        />
      </mesh>

      <group ref={groupRef} position={[0, 0, 0]} rotation={pelvisRotation}>
        {/* Lower Back / Pelvis - professional medical blue */}
        <mesh ref={pelvisMeshRef} position={pelvisPosition}>
          <boxGeometry args={[0.4, 0.25, 0.2]} />
          <meshStandardMaterial 
            color="#4a8fd5" 
            roughness={0.35}
            metalness={0.2}
          />
        </mesh>

        {/* Right Leg */}
        <group position={rightLegPosition}>
          {/* Hip Joint - rotation point for upper leg */}
          <group ref={rightUpperLegRef} rotation={hipRotation}>
            {/* Upper Leg (Thigh) - natural skin tone */}
            <mesh position={[0, -0.25, 0]}>
              <cylinderGeometry args={[0.08, 0.07, 0.5, 32]} />
              <meshStandardMaterial 
                color="#e8c8a8" 
                roughness={0.45}
                metalness={0.05}
              />
            </mesh>
            
            {/* Knee Joint - highlighted with glow */}
            <group ref={rightKneeRef} position={[0, -0.5, 0]}>
              {/* Main knee sphere - professional highlight */}
              <mesh>
                <sphereGeometry args={[0.11, 32, 32]} />
                <meshStandardMaterial 
                  color="#d4a88a" 
                  roughness={0.3}
                  metalness={0.1}
                  emissive="#ff9547"
                  emissiveIntensity={0.3}
                />
              </mesh>
              
              {/* Glow ring around knee - clear emphasis */}
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.13, 0.025, 16, 32]} />
                <meshBasicMaterial 
                  color="#ff9547" 
                  transparent 
                  opacity={0.7}
                />
              </mesh>
              
              {/* Lower Leg (Shin) - natural skin tone */}
              <group position={[0, -0.25, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.07, 0.06, 0.5, 32]} />
                  <meshStandardMaterial 
                    color="#e8c8a8" 
                    roughness={0.45}
                    metalness={0.05}
                  />
                </mesh>
                
                {/* Foot indicator */}
                <mesh name="right_foot" position={[0, -0.3, 0.05]}>
                  <boxGeometry args={[0.08, 0.04, 0.12]} />
                  <meshStandardMaterial 
                    color="#d4a88a" 
                    roughness={0.5}
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
            {/* Upper Leg (Thigh) - natural skin tone */}
            <mesh position={[0, -0.25, 0]}>
              <cylinderGeometry args={[0.08, 0.07, 0.5, 32]} />
              <meshStandardMaterial 
                color="#e8c8a8" 
                roughness={0.45}
                metalness={0.05}
              />
            </mesh>
            
            {/* Knee Joint - subtle styling */}
            <group ref={leftKneeRef} position={[0, -0.5, 0]}>
              <mesh>
                <sphereGeometry args={[0.11, 32, 32]} />
                <meshStandardMaterial 
                  color="#d4a88a" 
                  roughness={0.3}
                  metalness={0.1}
                />
              </mesh>
              
              {/* Lower Leg (Shin) - natural skin tone */}
              <group position={[0, -0.25, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.07, 0.06, 0.5, 32]} />
                  <meshStandardMaterial 
                    color="#e8c8a8" 
                    roughness={0.45}
                    metalness={0.05}
                  />
                </mesh>
                
                {/* Foot indicator */}
                <mesh name="left_foot" position={[0, -0.3, 0.05]}>
                  <boxGeometry args={[0.08, 0.04, 0.12]} />
                  <meshStandardMaterial 
                    color="#d4a88a" 
                    roughness={0.5}
                  />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* Professional floor with clean design */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, floorYPosition, 0]}
        >
          <circleGeometry args={[3, 64]} />
          <meshStandardMaterial 
            color="#f5f7fa" 
            roughness={0.8}
            metalness={0.1}
            opacity={0.98} 
            transparent 
          />
        </mesh>
        
        {/* Refined grid pattern on floor */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, floorYPosition + 0.001, 0]}
        >
          <circleGeometry args={[3, 64]} />
          <meshBasicMaterial 
            color="#cfd8e3" 
            wireframe 
            opacity={0.2} 
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
