import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, Quaternion, Euler, Vector3, Shape } from "three";
import { Line, Text } from "@react-three/drei";

interface AngleIndicatorProps {
  targetAngle: number; // Target angle in degrees
  currentAngle: number; // Current angle in degrees
  position: Vector3;
  showArrows?: boolean;
}

const AngleIndicator = ({ targetAngle, currentAngle, position, showArrows = true }: AngleIndicatorProps) => {
  const groupRef = useRef<Group>(null);

  // Calculate color based on how close current is to target (soft pastels)
  const getAngleColor = () => {
    const difference = Math.abs(targetAngle - currentAngle);

    if (difference < 5) return "#86d99e"; // soft green - excellent
    if (difference < 10) return "#ffd966"; // soft yellow - good
    if (difference < 20) return "#ffb366"; // soft orange - okay
    return "#ff9999"; // soft red - needs improvement
  };

  // Create arc points for the angle visualization
  const createArcPoints = (angle: number, radius: number = 0.3) => {
    const points: [number, number, number][] = [];
    const segments = 32;
    const angleRad = (angle * Math.PI) / 180;

    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * angleRad;
      const x = Math.cos(theta) * radius;
      const y = -Math.sin(theta) * radius;
      points.push([x, y, 0]);
    }

    return points;
  };

  const currentColor = getAngleColor();
  const currentArcPoints = createArcPoints(currentAngle);
  const targetArcPoints = createArcPoints(targetAngle);

  // Arrow direction (1 = extend, -1 = flex)
  const arrowDirection = currentAngle < targetAngle ? 1 : -1;

  // Pulsing animation for feedback - smooth frame-based animation
  useFrame((state) => {
    if (groupRef.current && Math.abs(targetAngle - currentAngle) < 5) {
      const pulse = Math.sin(state.clock.getElapsedTime() * 2) * 0.02 + 1;
      groupRef.current.scale.setScalar(pulse);
    } else if (groupRef.current) {
      groupRef.current.scale.setScalar(1);
    }
  });

  // Use time for smooth arrow animation
  const arrowAnimRef = useRef(0);
  useFrame((state) => {
    arrowAnimRef.current = state.clock.getElapsedTime();
  });

  // Encouraging feedback text
  const getFeedbackText = () => {
    const difference = Math.abs(targetAngle - currentAngle);
    if (difference < 5) return "Perfect! 🎯";
    if (difference < 10) return "Great job!";
    if (difference < 20) return "Almost there";
    return currentAngle < targetAngle ? "A little higher" : "A little lower";
  };

  return (
    <group ref={groupRef} position={position}>
      {/* Soft background glow */}
      <mesh>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.08}
        />
      </mesh>

      {/* Target angle arc (soft dashed line) */}
      <Line
        points={targetArcPoints}
        color="#b8d4e8"
        lineWidth={4}
        opacity={0.5}
        transparent
        dashed
        dashSize={0.04}
        gapSize={0.02}
      />

      {/* Current angle arc (thick, color-coded with glow) */}
      <Line
        points={currentArcPoints}
        color={currentColor}
        lineWidth={7}
        opacity={1}
        transparent
      />

      {/* Subtle glow behind current arc */}
      <Line
        points={currentArcPoints}
        color={currentColor}
        lineWidth={12}
        opacity={0.2}
        transparent
      />

      {/* Center point with subtle glow */}
      <mesh>
        <sphereGeometry args={[0.05, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={currentColor}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Main angle display - large and clear */}
      <Text
        position={[0.85, -0.05, 0]}
        fontSize={0.16}
        color={currentColor}
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#ffffff"
      >
        {Math.round(currentAngle)}°
      </Text>

      {/* Target angle text - smaller, subtle */}
      <Text
        position={[0.85, -0.22, 0]}
        fontSize={0.09}
        color="#5a7a92"
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#ffffff"
      >
        Target: {targetAngle}°
      </Text>

      {/* Encouraging feedback text */}
      <Text
        position={[0.85, -0.35, 0]}
        fontSize={0.1}
        color={currentColor}
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.008}
        outlineColor="#ffffff"
      >
        {getFeedbackText()}
      </Text>

      {/* Smooth animated directional arrows */}
      {showArrows && Math.abs(targetAngle - currentAngle) > 5 && (
        <group>
          {/* Arrow 1 with gentle pulse - using frame-based animation */}
          <mesh
            position={[
              0.55,
              -0.5 * arrowDirection + Math.sin(arrowAnimRef.current * 3) * 0.05,
              0
            ]}
            rotation={[0, 0, arrowDirection > 0 ? 0 : Math.PI]}
          >
            <coneGeometry args={[0.06, 0.18, 16]} />
            <meshStandardMaterial
              color={currentColor}
              emissive={currentColor}
              emissiveIntensity={0.3}
              transparent
              opacity={0.85}
            />
          </mesh>

          {/* Arrow 2 with offset pulse */}
          <mesh
            position={[
              0.68,
              -0.5 * arrowDirection + Math.sin(arrowAnimRef.current * 3 + Math.PI / 2) * 0.05,
              0
            ]}
            rotation={[0, 0, arrowDirection > 0 ? 0 : Math.PI]}
          >
            <coneGeometry args={[0.06, 0.18, 16]} />
            <meshStandardMaterial
              color={currentColor}
              emissive={currentColor}
              emissiveIntensity={0.3}
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

export default AngleIndicator;
