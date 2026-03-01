export interface Quaternion {
  qw: number;
  qx: number;
  qy: number;
  qz: number;
}

export interface SensorReading {
  quaternion: Quaternion;
  timestamp: number;
}

export enum SensorPosition {
  PELVIS = 'pelvis',
  RIGHT_THIGH = 'right_thigh',
  RIGHT_SHIN = 'right_shin',
  LEFT_THIGH = 'left_thigh',
  LEFT_SHIN = 'left_shin'
}

export interface SensorPacket {
  timestamp: number;
  sensors: {
    pelvis: Quaternion;
    right_thigh: Quaternion;
    right_shin: Quaternion;
    left_thigh: Quaternion;
    left_shin: Quaternion;
  };
  left_wt: number;  // Left heel weight sensor (0-100)
  right_wt: number; // Right heel weight sensor (0-100)
  battery: number; // 0-100
  status: 'ok' | 'warning' | 'error';
}

export interface BluetoothConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  deviceName?: string;
  error?: string;
  signalStrength?: number;
}
