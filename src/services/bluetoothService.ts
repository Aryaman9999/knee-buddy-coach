/// <reference types="web-bluetooth" />
import { SensorPacket, BluetoothConnectionState } from '@/types/sensorData';
import { toast } from '@/hooks/use-toast';

// ESP32 BLE Configuration
const DEVICE_NAME = 'RehabSensor_001';
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

type DataCallback = (data: SensorPacket) => void;
type StateCallback = (state: BluetoothConnectionState) => void;

class BluetoothService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private dataCallbacks: DataCallback[] = [];
  private stateCallbacks: StateCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: number | null = null;

  private state: BluetoothConnectionState = {
    isConnected: false,
    isConnecting: false,
  };

  // Request device and show picker
  async requestDevice(): Promise<void> {
    try {
      this.updateState({ isConnecting: true, error: undefined });

      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { name: DEVICE_NAME },
          { services: [SERVICE_UUID] }
        ],
        optionalServices: [SERVICE_UUID]
      });

      this.device = device;
      this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));
      
      await this.connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Bluetooth request error:', error);
      this.updateState({ 
        isConnecting: false, 
        error: `Failed to request device: ${message}` 
      });
      toast({
        title: "Connection Failed",
        description: message,
        variant: "destructive"
      });
      throw error;
    }
  }

  // Connect to device
  async connect(): Promise<void> {
    if (!this.device) {
      throw new Error('No device selected. Call requestDevice() first.');
    }

    try {
      this.updateState({ isConnecting: true });
      
      console.log('Connecting to GATT server...');
      const server = await this.device.gatt?.connect();
      
      if (!server) {
        throw new Error('Failed to connect to GATT server');
      }

      console.log('Getting primary service...');
      const service = await server.getPrimaryService(SERVICE_UUID);
      
      console.log('Getting characteristic...');
      this.characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
      
      // Subscribe to notifications
      await this.characteristic.startNotifications();
      this.characteristic.addEventListener(
        'characteristicvaluechanged',
        this.handleDataReceived.bind(this)
      );

      this.reconnectAttempts = 0;
      this.updateState({
        isConnected: true,
        isConnecting: false,
        deviceName: this.device.name,
        error: undefined
      });

      toast({
        title: "Sensors Connected",
        description: `Connected to ${this.device.name}`,
      });

      console.log('Bluetooth connected successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Connection error:', error);
      this.updateState({
        isConnected: false,
        isConnecting: false,
        error: `Connection failed: ${message}`
      });
      toast({
        title: "Connection Failed",
        description: message,
        variant: "destructive"
      });
      throw error;
    }
  }

  // Disconnect from device
  async disconnect(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.characteristic) {
      try {
        await this.characteristic.stopNotifications();
        this.characteristic.removeEventListener(
          'characteristicvaluechanged',
          this.handleDataReceived.bind(this)
        );
      } catch (error) {
        console.error('Error stopping notifications:', error);
      }
      this.characteristic = null;
    }

    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }

    this.updateState({
      isConnected: false,
      isConnecting: false,
      deviceName: undefined,
      error: undefined
    });

    toast({
      title: "Sensors Disconnected",
      description: "Bluetooth connection closed",
    });
  }

  // Handle disconnection
  private async onDisconnected(): Promise<void> {
    console.log('Device disconnected');
    this.updateState({
      isConnected: false,
      isConnecting: false,
      error: 'Device disconnected'
    });

    toast({
      title: "Connection Lost",
      description: "Attempting to reconnect...",
      variant: "destructive"
    });

    // Attempt reconnection with exponential backoff
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      this.reconnectAttempts++;
      
      this.reconnectTimeout = window.setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          console.error('Reconnection failed:', error);
        }
      }, delay);
    } else {
      toast({
        title: "Reconnection Failed",
        description: "Please reconnect manually",
        variant: "destructive"
      });
    }
  }

  // Handle incoming data
  private handleDataReceived(event: Event): void {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    
    if (!value) return;

    try {
      // Check if binary or JSON format by checking size
      // Binary format is exactly 94 bytes
      if (value.byteLength === 94) {
        // Parse binary packet
        this.parseBinaryPacket(value);
      } else {
        // Legacy JSON format
        this.parseJsonPacket(value);
      }
    } catch (error) {
      console.error('Error parsing sensor data:', error);
    }
  }

  // Parse binary protocol packet (94 bytes)
  private parseBinaryPacket(value: DataView): void {
    const view = new DataView(value.buffer);
    let offset = 0;

    // 1. Timestamp (4 bytes)
    const timestamp = view.getUint32(offset, true); // little-endian
    offset += 4;

    // 2. Parse 5 quaternions (80 bytes total)
    const pelvis = {
      qw: view.getFloat32(offset, true), 
      qx: view.getFloat32(offset + 4, true),
      qy: view.getFloat32(offset + 8, true),
      qz: view.getFloat32(offset + 12, true)
    };
    offset += 16;

    const right_thigh = {
      qw: view.getFloat32(offset, true),
      qx: view.getFloat32(offset + 4, true),
      qy: view.getFloat32(offset + 8, true),
      qz: view.getFloat32(offset + 12, true)
    };
    offset += 16;

    const right_shin = {
      qw: view.getFloat32(offset, true),
      qx: view.getFloat32(offset + 4, true),
      qy: view.getFloat32(offset + 8, true),
      qz: view.getFloat32(offset + 12, true)
    };
    offset += 16;

    const left_thigh = {
      qw: view.getFloat32(offset, true),
      qx: view.getFloat32(offset + 4, true),
      qy: view.getFloat32(offset + 8, true),
      qz: view.getFloat32(offset + 12, true)
    };
    offset += 16;

    const left_shin = {
      qw: view.getFloat32(offset, true),
      qx: view.getFloat32(offset + 4, true),
      qy: view.getFloat32(offset + 8, true),
      qz: view.getFloat32(offset + 12, true)
    };
    offset += 16;

    // 3. Weight sensors (8 bytes)
    const left_wt = view.getFloat32(offset, true);
    offset += 4;
    const right_wt = view.getFloat32(offset, true);
    offset += 4;

    // 4. Battery (1 byte)
    const battery = view.getUint8(offset);
    offset += 1;

    // 5. Status (1 byte)
    const statusCode = view.getUint8(offset);
    const status = statusCode === 0 ? 'ok' : statusCode === 1 ? 'warning' : 'error';

    const packet: SensorPacket = {
      timestamp,
      sensors: { pelvis, right_thigh, right_shin, left_thigh, left_shin },
      left_wt,
      right_wt,
      battery,
      status
    };

    // Notify all listeners
    this.dataCallbacks.forEach(callback => callback(packet));
  }

  // Parse legacy JSON packet
  private parseJsonPacket(value: DataView): void {
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(value);
    const rawData = JSON.parse(jsonString);

    const packet: SensorPacket = {
      timestamp: rawData.timestamp || Date.now(),
      sensors: {
        pelvis: this.parseQuaternion(rawData.sens1),
        right_thigh: this.parseQuaternion(rawData.sens2),
        right_shin: this.parseQuaternion(rawData.sens3),
        left_thigh: this.parseQuaternion(rawData.sens4),
        left_shin: this.parseQuaternion(rawData.sens5),
      },
      left_wt: rawData.left_wt || 0,
      right_wt: rawData.right_wt || 0,
      battery: rawData.battery || 100,
      status: rawData.status || 'ok'
    };

    // Notify all listeners
    this.dataCallbacks.forEach(callback => callback(packet));
  }

  // Parse quaternion from string or object
  private parseQuaternion(data: any): { qw: number; qx: number; qy: number; qz: number } {
    if (typeof data === 'string') {
      // Parse string format: "qw,qx,qy,qz"
      const parts = data.split(',').map(parseFloat);
      return {
        qw: parts[0] || 1,
        qx: parts[1] || 0,
        qy: parts[2] || 0,
        qz: parts[3] || 0
      };
    } else if (typeof data === 'object') {
      return {
        qw: data.qw || 1,
        qx: data.qx || 0,
        qy: data.qy || 0,
        qz: data.qz || 0
      };
    }
    // Default identity quaternion
    return { qw: 1, qx: 0, qy: 0, qz: 0 };
  }

  // Subscribe to data updates
  onDataReceived(callback: DataCallback): () => void {
    this.dataCallbacks.push(callback);
    return () => {
      this.dataCallbacks = this.dataCallbacks.filter(cb => cb !== callback);
    };
  }

  // Subscribe to state changes
  onStateChange(callback: StateCallback): () => void {
    this.stateCallbacks.push(callback);
    // Immediately call with current state
    callback(this.state);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter(cb => cb !== callback);
    };
  }

  // Update state and notify listeners
  private updateState(updates: Partial<BluetoothConnectionState>): void {
    this.state = { ...this.state, ...updates };
    this.stateCallbacks.forEach(callback => callback(this.state));
  }

  // Get current connection state
  getConnectionState(): BluetoothConnectionState {
    return { ...this.state };
  }

  // Check if Web Bluetooth is supported
  static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }
}

export { BluetoothService };
export const bluetoothService = new BluetoothService();
