import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Group, Quaternion, Euler, Vector3 } from "three";
import AngleIndicator from "./AngleIndicator";

interface ExerciseAvatarProps {
  exerciseId: string;
  currentRep: number;
  isPaused: boolean;
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
  "6": "sitting", // Hamstring Curls
};

const ExerciseAvatar = ({ exerciseId, currentRep, isPaused }: ExerciseAvatarProps) => {
  const groupRef = useRef<Group>(null);
  const rightUpperLegRef = useRef<Group>(null);
  const rightKneeRef = useRef<Group>(null);
  const leftUpperLegRef = useRef<Group>(null);
  const leftKneeRef = useRef<Group>(null);

  const [currentKneeAngle, setCurrentKneeAngle] = useState(0);

  const animationSpeed = 2;

  // Helper to convert quaternion to angle in degrees
  const quaternionToAngle = (quaternion: Quaternion): number => {
    const euler = new Euler().setFromQuaternion(quaternion);
    return Math.abs((euler.x * 180) / Math.PI);
  };

  useFrame((state) => {
    if (!groupRef.current || isPaused) return;

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

      case "2": // Quad Sets
        if (rightUpperLegRef.current && leftUpperLegRef.current && rightKneeRef.current && leftKneeRef.current) {
          const flex = Math.abs(Math.sin(time)) * 0.3;
          rightUpperLegRef.current.quaternion.copy(createQuaternion(-flex * 0.2, 0, 0));
          leftUpperLegRef.current.quaternion.copy(createQuaternion(-flex * 0.2, 0, 0));
          rightKneeRef.current.quaternion.copy(createQuaternion(flex, 0, 0));
          leftKneeRef.current.quaternion.copy(createQuaternion(flex, 0, 0));
        }
        break;

      case "3": // Straight Leg Raises
        if (rightUpperLegRef.current && rightKneeRef.current) {
          const raise = Math.sin(time) * 0.5 + 0.5;
          rightUpperLegRef.current.quaternion.copy(createQuaternion(-raise * 0.8, 0, 0));
          rightKneeRef.current.quaternion.copy(createQuaternion(0, 0, 0));
        }
        break;

      case "4": // Ankle Pumps
        if (rightKneeRef.current && leftKneeRef.current) {
          const pump = Math.sin(time * 2) * 0.4;
          rightKneeRef.current.quaternion.copy(createQuaternion(pump * 0.5, 0, 0));
          leftKneeRef.current.quaternion.copy(createQuaternion(pump * 0.5, 0, 0));
        }
        break;

      case "5": // Short Arc Quads (Seated - extending from 90°)
        if (rightUpperLegRef.current && rightKneeRef.current) {
          const extension = Math.sin(time) * 0.6; // Extension from seated position
          rightUpperLegRef.current.quaternion.copy(createQuaternion(0, 0, 0)); // Thigh stays horizontal
          rightKneeRef.current.quaternion.copy(createQuaternion(-Math.abs(extension), 0, 0)); // Negative for extension
        }
        break;

      case "6": // Hamstring Curls (Seated - flexing from 90°)
        if (rightUpperLegRef.current && rightKneeRef.current) {
          const curl = Math.sin(time) * 0.9; // Curl motion
          rightUpperLegRef.current.quaternion.copy(createQuaternion(0, 0, 0)); // Thigh stays horizontal
          rightKneeRef.current.quaternion.copy(createQuaternion(Math.abs(curl), 0, 0)); // Flexion
        }
        break;
    }

    // Update current knee angle for visualization
    if (rightKneeRef.current) {
      const angle = quaternionToAngle(rightKneeRef.current.quaternion);
      setCurrentKneeAngle(angle);
    }
  });

  const pose = exercisePoses[exerciseId] || "lying";
  const isSitting = pose === "sitting";

  // Position adjustments based on pose
  const pelvisRotation: [number, number, number] = isSitting ? [-Math.PI / 3, 0, 0] : [0, 0, 0];
  const pelvisPosition: [number, number, number] = isSitting ? [0, 0.3, 0] : [0, 0, 0];
  const legYPosition = isSitting ? 0.175 : -0.125;
  const floorYPosition = isSitting ? -0.8 : -1.25;

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Lower Back / Pelvis - rotated for sitting */}
      <mesh position={pelvisPosition} rotation={pelvisRotation}>
        <boxGeometry args={[0.4, 0.25, 0.2]} />
        <meshStandardMaterial color="#4A90E2" />
      </mesh>

      {/* Right Leg */}
      <group position={[0.15, legYPosition, 0]}>
        {/* Hip Joint - rotation point for upper leg */}
        <group ref={rightUpperLegRef}>
          {/* Upper Leg (Thigh) */}
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.5, 16]} />
            <meshStandardMaterial color="#8B7355" />
          </mesh>
          
          {/* Knee Joint - child of upper leg */}
          <group ref={rightKneeRef} position={[0, -0.5, 0]}>
            <mesh>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshStandardMaterial color="#6B5D4F" />
            </mesh>
            
            {/* Lower Leg (Shin) - child of knee joint */}
            <group position={[0, -0.25, 0]}>
              <mesh>
                <cylinderGeometry args={[0.07, 0.06, 0.5, 16]} />
                <meshStandardMaterial color="#8B7355" />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* Left Leg */}
      <group position={[-0.15, legYPosition, 0]}>
        {/* Hip Joint - rotation point for upper leg */}
        <group ref={leftUpperLegRef}>
          {/* Upper Leg (Thigh) */}
          <mesh position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.5, 16]} />
            <meshStandardMaterial color="#8B7355" />
          </mesh>
          
          {/* Knee Joint - child of upper leg */}
          <group ref={leftKneeRef} position={[0, -0.5, 0]}>
            <mesh>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshStandardMaterial color="#6B5D4F" />
            </mesh>
            
            {/* Lower Leg (Shin) - child of knee joint */}
            <group position={[0, -0.25, 0]}>
              <mesh>
                <cylinderGeometry args={[0.07, 0.06, 0.5, 16]} />
                <meshStandardMaterial color="#8B7355" />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* Floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorYPosition, 0]}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#E0E0E0" opacity={0.5} transparent />
      </mesh>

      {/* Angle Indicator at right knee */}
      <AngleIndicator
        targetAngle={exerciseTargetAngles[exerciseId] || 90}
        currentAngle={currentKneeAngle}
        position={new Vector3(0.15, isSitting ? -0.125 : -0.625, 0.3)}
        showArrows={true}
      />
    </group>
  );
};

export default ExerciseAvatar;
