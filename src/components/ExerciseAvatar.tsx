import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Group, Quaternion, Euler, Vector3, BoxGeometry } from "three";
import { SensorPacket } from "@/types/sensorData";
import { sensorDataMapper } from "@/utils/sensorDataMapper";
import AngleIndicator from "./AngleIndicator";

// All exercise data in one place - exported for use in ExercisePlayer
export const exerciseDefinitions: Record<string, {
  targetAngle: number;
  startingPose: 'standing' | 'sitting' | 'lying';
}> = {
  "1": { targetAngle: 90, startingPose: 'lying' },     // Heel Slides - lying with knee bend
  "2": { targetAngle: 0, startingPose: 'lying' },       // Quad Sets - lying with straight leg
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
  
  // Refs for foot/ankle visualization
  const rightFootRef = useRef<Mesh>(null);
  const leftFootRef = useRef<Mesh>(null);

  // Helper to convert quaternion to angle in degrees
  const quaternionToAngle = (quaternion: Quaternion): number => {
    const euler = new Euler().setFromQuaternion(quaternion);
    const xAngle = Math.abs((euler.x * 180) / Math.PI);
    const yAngle = Math.abs((euler.y * 180) / Math.PI);
    const zAngle = Math.abs((euler.z * 180) / Math.PI);
    
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
    const demoSpeed = mode === 'demo' ? 0.6 : 1.0;
    const time = state.clock.getElapsedTime() * demoSpeed;

    // Helper to create quaternion from euler angles
    const createQuaternion = (x: number, y: number, z: number) => {
      const euler = new Euler(x, y, z);
      return new Quaternion().setFromEuler(euler);
    };

    // Smooth easing function for more natural movements
    const smoothStep = (t: number) => t * t * (3 - 2 * t);

    // Animation based on exercise type using quaternions
    switch (exerciseId) {
      case "1": // Heel Slides (Lying) - Slide heel toward buttocks
        if (rightUpperLegRef.current && rightKneeRef.current) {
          const progress = (Math.sin(time) * 0.5 + 0.5);
          const smoothProgress = smoothStep(progress);
          const slideAngle = smoothProgress * (Math.PI / 2); // 0 to 90 degrees
          
          // Hip flexion - bring thigh up
          rightUpperLegRef.current.quaternion.copy(createQuaternion(slideAngle * 0.7, 0, 0));
          // Knee flexion - bend knee more than hip
          rightKneeRef.current.quaternion.copy(createQuaternion(slideAngle * 1.3, 0, 0));
          
          // Foot stays neutral
          if (rightFootRef.current) {
            rightFootRef.current.quaternion.copy(createQuaternion(0, 0, 0));
          }
        }
        break;

      case "2": // Quad Sets (Lying) - Isometric quadriceps contraction
        if (rightUpperLegRef.current && rightKneeRef.current) {
          // Contract/relax cycle - hold for 3 seconds, relax for 2 seconds
          const cycleTime = time % 5; // 5 second total cycle
          const isContracting = cycleTime < 3; // First 3 seconds = contract
          const pulse = isContracting ? Math.sin((cycleTime / 3) * Math.PI) : 0;
          
          // Leg stays flat on bed - straight
          rightUpperLegRef.current.quaternion.copy(createQuaternion(0, 0, 0));
          
          // Knee presses down into bed during contraction (subtle visual)
          // This represents pushing the back of knee toward the bed
          const press = pulse * 0.05;
          rightKneeRef.current.quaternion.copy(createQuaternion(press, 0, 0));
          
          // Pulse thigh to show muscle contraction - visual feedback
          const rightThighMesh = rightUpperLegRef.current.children[0] as Mesh;
          
          if (rightThighMesh && rightThighMesh.material) {
            // Strong visual feedback for contraction - muscle tightening
            (rightThighMesh.material as any).emissiveIntensity = pulse * 0.7;
            (rightThighMesh.material as any).emissive.set("#ffd89b");
          }
          
          // Heel stays on bed, foot neutral (no lifting)
          if (rightFootRef.current) {
            rightFootRef.current.quaternion.copy(createQuaternion(0, 0, 0));
          }
        }
        break;

      case "3": // Straight Leg Raises (Lying) - Lift entire straight leg
        if (rightUpperLegRef.current && rightKneeRef.current) {
          const progress = (Math.sin(time) * 0.5 + 0.5);
          const smoothProgress = smoothStep(progress);
          const raiseAngle = smoothProgress * (Math.PI / 4); // 0 to 45 degrees
          
          // Raise entire leg from hip, keep knee locked straight
          rightUpperLegRef.current.quaternion.copy(createQuaternion(-raiseAngle, 0, 0));
          rightKneeRef.current.quaternion.copy(createQuaternion(0, 0, 0));
          
          // Keep foot in neutral position
          if (rightFootRef.current) {
            rightFootRef.current.quaternion.copy(createQuaternion(0, 0, 0));
          }
        }
        break;

      case "4": // Ankle Pumps (Lying) - ENHANCED with clear dorsiflexion/plantarflexion
        if (rightKneeRef.current && leftKneeRef.current && rightFootRef.current && leftFootRef.current) {
          // More pronounced ankle movement with faster pumping
          const progress = Math.sin(time * 2.5); // Faster oscillation
          const pumpAngle = progress * 0.7; // Larger range: -40° to +40°
          
          // Legs stay flat on bed
          rightUpperLegRef.current?.quaternion.copy(createQuaternion(0, 0, 0));
          leftUpperLegRef.current?.quaternion.copy(createQuaternion(0, 0, 0));
          rightKneeRef.current.quaternion.copy(createQuaternion(0, 0, 0));
          leftKneeRef.current.quaternion.copy(createQuaternion(0, 0, 0));
          
          // Bilateral foot pumping - both feet move together
          // Negative = Dorsiflexion (toes toward shin)
          // Positive = Plantarflexion (toes point away)
          rightFootRef.current.quaternion.copy(createQuaternion(pumpAngle, 0, 0));
          leftFootRef.current.quaternion.copy(createQuaternion(pumpAngle, 0, 0));
          
          // Visual pulse on feet to emphasize movement
          const footMeshes = [
            rightFootRef.current,
            leftFootRef.current
          ];
          footMeshes.forEach(foot => {
            if (foot && foot.material) {
              const intensity = Math.abs(progress) * 0.3;
              (foot.material as any).emissiveIntensity = intensity;
              (foot.material as any).emissive.set("#88c0f0");
            }
          });
        }
        break;

      case "5": // Short Arc Quads (Lying with support) - Straighten knee from bent position
        if (rightKneeRef.current && rightUpperLegRef.current) {
          const progress = (Math.sin(time) * 0.5 + 0.5);
          const smoothProgress = smoothStep(progress);
          
          // Thigh stays on support (fixed hip flexion)
          rightUpperLegRef.current.quaternion.copy(createQuaternion(0.35, 0, 0));
          
          // Extend lower leg: from bent (60°) to straight (0°)
          const extensionAngle = (1 - smoothProgress) * (Math.PI / 3);
          rightKneeRef.current.quaternion.copy(createQuaternion(extensionAngle, 0, 0));
          
          // Foot stays in neutral
          if (rightFootRef.current) {
            rightFootRef.current.quaternion.copy(createQuaternion(0, 0, 0));
          }
        }
        break;

      case "6": // Hamstring Curls (Standing) - Curl heel toward buttocks
        if (rightKneeRef.current && rightUpperLegRef.current) {
          const progress = (Math.sin(time) * 0.5 + 0.5);
          const smoothProgress = smoothStep(progress);
          const curlAngle = smoothProgress * (Math.PI / 2); // 0 to 90 degrees
          
          // Thigh stays vertical (no hip movement)
          rightUpperLegRef.current.quaternion.copy(createQuaternion(0, 0, 0));
          
          // Curl lower leg backward (knee flexion)
          rightKneeRef.current.quaternion.copy(createQuaternion(curlAngle, 0, 0));
          
          // Foot flexes slightly during curl
          if (rightFootRef.current) {
            rightFootRef.current.quaternion.copy(createQuaternion(curlAngle * 0.2, 0, 0));
          }
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
    // Lie flat on the therapy bed
    pelvisRotation = [-Math.PI / 2, 0, 0]; // Rotate body horizontal
    pelvisPosition = [0, 0.15, 0]; // Raised above bed for visibility
    hipRotation = [0, 0, 0]; // Legs straight relative to pelvis
    bedPosition = [0, -0.05, 0]; // Bed positioned below body
    floorYPosition = -0.25; // Raised floor to act as bed surface
  } else if (pose === 'sitting') {
    // Sit on chair with proper posture - legs straight out for Quad Sets
    pelvisRotation = [0, 0, 0]; // Pelvis upright
    pelvisPosition = [0, 0.7, 0]; // Seated on chair
    hipRotation = [0, 0, 0]; // Legs straight out in front
    floorYPosition = -1.25; // Normal floor for feet
  } else if (pose === 'standing') {
    // Stand upright with proper alignment
    pelvisRotation = [0, 0, 0]; // Pelvis upright
    pelvisPosition = [0, 0, 0]; // Standing on floor
    hipRotation = [0, 0, 0]; // Legs straight down
    floorYPosition = -1.25; // Normal floor
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

      {/* Enhanced therapy bed for lying exercises - MORE VISIBLE */}
      <group visible={pose === 'lying'}>
        {/* Main bed surface */}
        <mesh position={bedPosition}>
          <boxGeometry args={[1.3, 0.12, 2.2]} />
          <meshStandardMaterial
            color="#5DADE2"
            roughness={0.3}
            metalness={0.2}
            transparent={true}
            opacity={0.6}
          />
        </mesh>
        
        {/* Bed frame outline - thick and visible */}
        <lineSegments position={bedPosition}>
          <edgesGeometry args={[new BoxGeometry(1.3, 0.12, 2.2)]} />
          <lineBasicMaterial color="#1565C0" linewidth={3} />
        </lineSegments>
        
        {/* Bed legs for realism */}
        {[
          [-0.55, -0.25, 0.9],
          [0.55, -0.25, 0.9],
          [-0.55, -0.25, -0.9],
          [0.55, -0.25, -0.9]
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]}>
            <cylinderGeometry args={[0.04, 0.04, 0.5, 16]} />
            <meshStandardMaterial color="#34495E" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
        
        {/* Side rails */}
        <mesh position={[0.65, -0.05, 0]}>
          <boxGeometry args={[0.03, 0.15, 2.0]} />
          <meshStandardMaterial color="#34495E" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[-0.65, -0.05, 0]}>
          <boxGeometry args={[0.03, 0.15, 2.0]} />
          <meshStandardMaterial color="#34495E" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* Enhanced therapy chair for sitting exercises - repositioned to not overlap legs */}
      <group visible={pose === 'sitting'}>
        {/* Chair seat - padded appearance with better color, moved back */}
        <mesh position={[0, 0.45, -0.4]}>
          <boxGeometry args={[0.55, 0.12, 0.55]} />
          <meshStandardMaterial
            color="#8B4513"
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
        
        {/* Seat padding edge - lighter accent */}
        <mesh position={[0, 0.52, -0.4]}>
          <boxGeometry args={[0.53, 0.03, 0.53]} />
          <meshStandardMaterial
            color="#A0522D"
            roughness={0.6}
            metalness={0.05}
          />
        </mesh>
        
        {/* Chair back - tall and supportive with better color */}
        <mesh position={[0, 0.9, -0.65]}>
          <boxGeometry args={[0.55, 0.8, 0.12]} />
          <meshStandardMaterial
            color="#8B4513"
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
        
        {/* Back padding - lighter accent */}
        <mesh position={[0, 0.9, -0.58]}>  {/* Repositioned back with seat */}
          <boxGeometry args={[0.53, 0.75, 0.06]} />
          <meshStandardMaterial
            color="#A0522D"
            roughness={0.6}
            metalness={0.05}
          />
        </mesh>
        
        {/* Chair legs - repositioned to match moved seat */}
        {[
          [-0.22, 0.2, -0.18],
          [0.22, 0.2, -0.18],
          [-0.22, 0.2, -0.62],
          [0.22, 0.2, -0.62]
        ].map((pos, i) => (
          <mesh key={i} position={pos as [number, number, number]}>
            <cylinderGeometry args={[0.035, 0.03, 0.4, 16]} />
            <meshStandardMaterial
              color="#654321"
              roughness={0.4}
              metalness={0.2}
            />
          </mesh>
        ))}
        
        {/* Chair cross supports - repositioned */}
        <mesh position={[0, 0.1, -0.18]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.44, 12]} />
          <meshStandardMaterial color="#654321" metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.1, -0.62]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.025, 0.025, 0.44, 12]} />
          <meshStandardMaterial color="#654321" metalness={0.2} />
        </mesh>
      </group>

      {/* Foam roll support for Short Arc Quads (exercise 5) - MORE VISIBLE */}
      <mesh
        visible={pose === 'lying' && exerciseId === '5'}
        position={[0.15, -0.05, -0.35]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[0.1, 0.1, 0.4, 24]} />
        <meshStandardMaterial
          color="#FFB74D"
          roughness={0.6}
          metalness={0.1}
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
                
                {/* Ankle joint visualization */}
                <mesh position={[0, -0.5, 0]}>
                  <sphereGeometry args={[0.08, 24, 24]} />
                  <meshStandardMaterial 
                    color="#d4a88a" 
                    roughness={0.4}
                    metalness={0.05}
                  />
                </mesh>
                
                {/* Foot with enhanced visibility for ankle pumps */}
                <mesh 
                  ref={rightFootRef}
                  name="right_foot" 
                  position={[0, -0.55, 0.08]}
                >
                  <boxGeometry args={[0.1, 0.06, 0.18]} />
                  <meshStandardMaterial 
                    color="#c49a7a" 
                    roughness={0.5}
                    metalness={0.05}
                    emissive="#88c0f0"
                    emissiveIntensity={0}
                  />
                </mesh>
                
                {/* Toes for realistic foot appearance */}
                <mesh position={[0, -0.55, 0.18]}>
                  <boxGeometry args={[0.09, 0.04, 0.04]} />
                  <meshStandardMaterial 
                    color="#c49a7a" 
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
                
                {/* Left ankle joint */}
                <mesh position={[0, -0.5, 0]}>
                  <sphereGeometry args={[0.08, 24, 24]} />
                  <meshStandardMaterial 
                    color="#d4a88a" 
                    roughness={0.4}
                    metalness={0.05}
                  />
                </mesh>
                
                {/* Left foot with enhanced visibility */}
                <mesh 
                  ref={leftFootRef}
                  name="left_foot" 
                  position={[0, -0.55, 0.08]}
                >
                  <boxGeometry args={[0.1, 0.06, 0.18]} />
                  <meshStandardMaterial 
                    color="#c49a7a" 
                    roughness={0.5}
                    metalness={0.05}
                    emissive="#88c0f0"
                    emissiveIntensity={0}
                  />
                </mesh>
                
                {/* Left toes */}
                <mesh position={[0, -0.55, 0.18]}>
                  <boxGeometry args={[0.09, 0.04, 0.04]} />
                  <meshStandardMaterial 
                    color="#c49a7a" 
                    roughness={0.6}
                  />
                </mesh>
              </group>
            </group>
          </group>
        </group>

        {/* Enhanced floor with posture-specific styling */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, floorYPosition, 0]}
        >
          <circleGeometry args={[3.5, 64]} />
          <meshStandardMaterial 
            color={
              pose === 'lying' ? '#E3F2FD' : 
              pose === 'sitting' ? '#FFF3E0' : 
              '#E8F5E9'
            }
            roughness={0.7}
            metalness={0.15}
          />
        </mesh>
        
        {/* Grid pattern - color-coded by posture */}
        <mesh 
          rotation={[-Math.PI / 2, 0, 0]} 
          position={[0, floorYPosition + 0.002, 0]}
        >
          <circleGeometry args={[3.5, 64]} />
          <meshBasicMaterial 
            color={
              pose === 'lying' ? '#1976D2' : 
              pose === 'sitting' ? '#F57C00' : 
              '#388E3C'
            }
            wireframe 
            opacity={0.25} 
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
