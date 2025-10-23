import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Mesh, Group } from "three";

interface ExerciseAvatarProps {
  exerciseId: string;
  currentRep: number;
  isPaused: boolean;
}

const ExerciseAvatar = ({ exerciseId, currentRep, isPaused }: ExerciseAvatarProps) => {
  const groupRef = useRef<Group>(null);
  const rightLegRef = useRef<Mesh>(null);
  const leftLegRef = useRef<Mesh>(null);
  const rightArmRef = useRef<Mesh>(null);
  const leftArmRef = useRef<Mesh>(null);
  const rightFootRef = useRef<Mesh>(null);
  const leftFootRef = useRef<Mesh>(null);

  const animationSpeed = 2;

  useFrame((state) => {
    if (!groupRef.current || isPaused) return;

    const time = state.clock.getElapsedTime() * animationSpeed;

    // Animation based on exercise type
    switch (exerciseId) {
      case "1": // Heel Slides
        if (rightLegRef.current && rightFootRef.current) {
          const slide = Math.sin(time) * 0.3;
          rightLegRef.current.rotation.x = slide;
          rightFootRef.current.position.z = slide * 0.5;
        }
        break;

      case "2": // Quad Sets
        if (rightLegRef.current && leftLegRef.current) {
          const flex = Math.abs(Math.sin(time)) * 0.2;
          rightLegRef.current.scale.y = 1 + flex;
          leftLegRef.current.scale.y = 1 + flex;
        }
        break;

      case "3": // Straight Leg Raises
        if (rightLegRef.current) {
          const raise = Math.sin(time) * 0.5 + 0.5;
          rightLegRef.current.rotation.x = -raise * 0.8;
        }
        break;

      case "4": // Ankle Pumps
        if (rightFootRef.current && leftFootRef.current) {
          const pump = Math.sin(time * 2) * 0.4;
          rightFootRef.current.rotation.x = pump;
          leftFootRef.current.rotation.x = pump;
        }
        break;

      case "5": // Short Arc Quads
        if (rightLegRef.current) {
          const arc = Math.sin(time) * 0.3;
          rightLegRef.current.rotation.x = arc;
        }
        break;

      case "6": // Hamstring Curls
        if (rightLegRef.current && rightFootRef.current) {
          const curl = Math.sin(time) * 0.6;
          rightLegRef.current.rotation.x = Math.abs(curl);
          rightFootRef.current.rotation.x = -Math.abs(curl) * 0.5;
        }
        break;
    }
  });

  return (
    <group ref={groupRef} position={[0, -1, 0]}>
      {/* Head */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#8B7355" />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.4, 0.6, 0.2]} />
        <meshStandardMaterial color="#4A90E2" />
      </mesh>

      {/* Pelvis */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[0.35, 0.2, 0.2]} />
        <meshStandardMaterial color="#4A90E2" />
      </mesh>

      {/* Right Arm */}
      <mesh ref={rightArmRef} position={[0.3, 1.3, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 16]} />
        <meshStandardMaterial color="#8B7355" />
      </mesh>

      {/* Left Arm */}
      <mesh ref={leftArmRef} position={[-0.3, 1.3, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 16]} />
        <meshStandardMaterial color="#8B7355" />
      </mesh>

      {/* Right Leg */}
      <group position={[0.12, 0.4, 0]}>
        <mesh ref={rightLegRef} position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.6, 16]} />
          <meshStandardMaterial color="#8B7355" />
        </mesh>
        {/* Right Foot */}
        <mesh ref={rightFootRef} position={[0, -0.6, 0.08]}>
          <boxGeometry args={[0.1, 0.05, 0.2]} />
          <meshStandardMaterial color="#2C3E50" />
        </mesh>
      </group>

      {/* Left Leg */}
      <group position={[-0.12, 0.4, 0]}>
        <mesh ref={leftLegRef} position={[0, -0.25, 0]}>
          <cylinderGeometry args={[0.06, 0.05, 0.6, 16]} />
          <meshStandardMaterial color="#8B7355" />
        </mesh>
        {/* Left Foot */}
        <mesh ref={leftFootRef} position={[0, -0.6, 0.08]}>
          <boxGeometry args={[0.1, 0.05, 0.2]} />
          <meshStandardMaterial color="#2C3E50" />
        </mesh>
      </group>

      {/* Floor plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
        <planeGeometry args={[3, 3]} />
        <meshStandardMaterial color="#E0E0E0" opacity={0.5} transparent />
      </mesh>
    </group>
  );
};

export default ExerciseAvatar;
