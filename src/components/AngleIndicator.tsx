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
  
  // Calculate color based on how close current is to target
  const getAngleColor = () => {
    const difference = Math.abs(targetAngle - currentAngle);
    
    if (difference < 5) return "#22c55e"; // green - excellent
    if (difference < 10) return "#eab308"; // yellow - good
    if (difference < 20) return "#f97316"; // orange - okay
    return "#ef4444"; // red - needs improvement
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

  return (
    <group ref={groupRef} position={position}>
      {/* Target angle arc (semi-transparent white) */}
      <Line
        points={targetArcPoints}
        color="#ffffff"
        lineWidth={3}
        opacity={0.3}
        transparent
        dashed
        dashSize={0.05}
        gapSize={0.03}
      />
      
      {/* Current angle arc (color-coded) */}
      <Line
        points={currentArcPoints}
        color={currentColor}
        lineWidth={5}
        opacity={0.9}
        transparent
      />

      {/* Center point */}
      <mesh>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Angle text */}
      <Text
        position={[0.4, -0.1, 0]}
        fontSize={0.12}
        color={currentColor}
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {Math.round(currentAngle)}°
      </Text>

      {/* Target angle text */}
      <Text
        position={[0.4, -0.25, 0]}
        fontSize={0.08}
        color="#aaaaaa"
        anchorX="left"
        anchorY="middle"
      >
        Target: {targetAngle}°
      </Text>

      {/* Directional arrows */}
      {showArrows && Math.abs(targetAngle - currentAngle) > 5 && (
        <group>
          {/* Arrow 1 */}
          <mesh position={[0.5, -0.4 * arrowDirection, 0]}>
            <coneGeometry args={[0.05, 0.15, 8]} />
            <meshBasicMaterial color={currentColor} />
            <mesh rotation={[0, 0, arrowDirection > 0 ? Math.PI : 0]}>
              <coneGeometry args={[0.05, 0.15, 8]} />
              <meshBasicMaterial color={currentColor} />
            </mesh>
          </mesh>
          
          {/* Arrow 2 */}
          <mesh position={[0.6, -0.4 * arrowDirection, 0]}>
            <coneGeometry args={[0.05, 0.15, 8]} />
            <meshBasicMaterial color={currentColor} />
            <mesh rotation={[0, 0, arrowDirection > 0 ? Math.PI : 0]}>
              <coneGeometry args={[0.05, 0.15, 8]} />
              <meshBasicMaterial color={currentColor} />
            </mesh>
          </mesh>
        </group>
      )}
    </group>
  );
};

export default AngleIndicator;
