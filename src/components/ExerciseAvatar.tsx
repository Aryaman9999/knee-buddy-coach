import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Group, Quaternion, Euler } from "three";

interface ExerciseAvatarProps {
  exerciseId: string;
  currentRep: number;
  isPaused: boolean;
}

const ExerciseAvatar = ({ exerciseId, currentRep, isPaused }: ExerciseAvatarProps) => {
  const groupRef = useRef<Group>(null);
  const rightUpperLegRef = useRef<Mesh>(null);
  const rightLowerLegRef = useRef<Mesh>(null);
  const leftUpperLegRef = useRef<Mesh>(null);
  const leftLowerLegRef = useRef<Mesh>(null);
  const sensorRef = useRef<Mesh>(null);

  const animationSpeed = 2;

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
        if (rightUpperLegRef.current && rightLowerLegRef.current) {
          const slide = Math.sin(time) * 0.5;
          rightUpperLegRef.current.quaternion.copy(createQuaternion(slide, 0, 0));
          rightLowerLegRef.current.quaternion.copy(createQuaternion(Math.abs(slide) * 0.8, 0, 0));
        }
        break;

      case "2": // Quad Sets
        if (rightUpperLegRef.current && leftUpperLegRef.current && rightLowerLegRef.current && leftLowerLegRef.current) {
          const flex = Math.abs(Math.sin(time)) * 0.3;
          rightUpperLegRef.current.quaternion.copy(createQuaternion(-flex * 0.2, 0, 0));
          leftUpperLegRef.current.quaternion.copy(createQuaternion(-flex * 0.2, 0, 0));
          rightLowerLegRef.current.quaternion.copy(createQuaternion(flex, 0, 0));
          leftLowerLegRef.current.quaternion.copy(createQuaternion(flex, 0, 0));
        }
        break;

      case "3": // Straight Leg Raises
        if (rightUpperLegRef.current && rightLowerLegRef.current) {
          const raise = Math.sin(time) * 0.5 + 0.5;
          rightUpperLegRef.current.quaternion.copy(createQuaternion(-raise * 0.8, 0, 0));
          rightLowerLegRef.current.quaternion.copy(createQuaternion(0, 0, 0));
        }
        break;

      case "4": // Ankle Pumps
        if (rightLowerLegRef.current && leftLowerLegRef.current) {
          const pump = Math.sin(time * 2) * 0.4;
          rightLowerLegRef.current.quaternion.copy(createQuaternion(pump * 0.5, 0, 0));
          leftLowerLegRef.current.quaternion.copy(createQuaternion(pump * 0.5, 0, 0));
        }
        break;

      case "5": // Short Arc Quads
        if (rightUpperLegRef.current && rightLowerLegRef.current) {
          const arc = Math.sin(time) * 0.4;
          rightUpperLegRef.current.quaternion.copy(createQuaternion(arc * 0.3, 0, 0));
          rightLowerLegRef.current.quaternion.copy(createQuaternion(Math.abs(arc), 0, 0));
        }
        break;

      case "6": // Hamstring Curls
        if (rightUpperLegRef.current && rightLowerLegRef.current) {
          const curl = Math.sin(time) * 0.8;
          rightUpperLegRef.current.quaternion.copy(createQuaternion(Math.abs(curl) * 0.2, 0, 0));
          rightLowerLegRef.current.quaternion.copy(createQuaternion(Math.abs(curl), 0, 0));
        }
        break;
    }

    // Sensor pulse animation
    if (sensorRef.current) {
      const pulse = Math.sin(time * 3) * 0.1 + 1;
      sensorRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Lower Back / Pelvis */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.25, 0.2]} />
        <meshStandardMaterial color="#4A90E2" />
      </mesh>

      {/* Sensor in the middle of lower back */}
      <mesh ref={sensorRef} position={[0, 0, -0.15]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#FF4444" emissive="#FF4444" emissiveIntensity={0.5} />
      </mesh>

      {/* Right Leg */}
      <group position={[0.15, -0.125, 0]}>
        {/* Upper Leg (Thigh) */}
        <group>
          <mesh ref={rightUpperLegRef} position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.5, 16]} />
            <meshStandardMaterial color="#8B7355" />
          </mesh>
          
          {/* Knee Joint */}
          <mesh position={[0, -0.5, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color="#6B5D4F" />
          </mesh>
          
          {/* Lower Leg (Shin) */}
          <mesh ref={rightLowerLegRef} position={[0, -0.75, 0]}>
            <cylinderGeometry args={[0.07, 0.06, 0.5, 16]} />
            <meshStandardMaterial color="#8B7355" />
          </mesh>
        </group>
      </group>

      {/* Left Leg */}
      <group position={[-0.15, -0.125, 0]}>
        {/* Upper Leg (Thigh) */}
        <group>
          <mesh ref={leftUpperLegRef} position={[0, -0.25, 0]}>
            <cylinderGeometry args={[0.08, 0.07, 0.5, 16]} />
            <meshStandardMaterial color="#8B7355" />
          </mesh>
          
          {/* Knee Joint */}
          <mesh position={[0, -0.5, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshStandardMaterial color="#6B5D4F" />
          </mesh>
          
          {/* Lower Leg (Shin) */}
          <mesh ref={leftLowerLegRef} position={[0, -0.75, 0]}>
            <cylinderGeometry args={[0.07, 0.06, 0.5, 16]} />
            <meshStandardMaterial color="#8B7355" />
          </mesh>
        </group>
      </group>

      {/* Floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#E0E0E0" opacity={0.5} transparent />
      </mesh>
    </group>
  );
};

export default ExerciseAvatar;
