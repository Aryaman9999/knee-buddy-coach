import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bluetooth, BluetoothConnected, BluetoothSearching, Battery, Signal } from 'lucide-react';
import { bluetoothService, BluetoothService } from '@/services/bluetoothService';
import { BluetoothConnectionState } from '@/types/sensorData';

interface SensorConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
  showDetails?: boolean;
}

const SensorConnection = ({ onConnectionChange, showDetails = true }: SensorConnectionProps) => {
  const [connectionState, setConnectionState] = useState<BluetoothConnectionState & { battery?: number }>({
    isConnected: false,
    isConnecting: false,
  });

  useEffect(() => {
    const unsubscribeState = bluetoothService.onStateChange((state) => {
      setConnectionState(state);
      onConnectionChange?.(state.isConnected);
    });

    // Subscribe to sensor data to get battery level
    const unsubscribeData = bluetoothService.onDataReceived((packet) => {
      setConnectionState(prev => ({
        ...prev,
        battery: packet.battery
      }));
    });

    return () => {
      unsubscribeState();
      unsubscribeData();
    };
  }, [onConnectionChange]);

  const handleConnect = async () => {
    try {
      await bluetoothService.requestDevice();
    } catch (error) {
      console.error('Connection error:', error);
    }
  };

  const handleDisconnect = async () => {
    await bluetoothService.disconnect();
  };

  if (!BluetoothService.isSupported()) {
    return (
      <Card className="bg-destructive/10 border-destructive">
        <CardContent className="p-4">
          <p className="text-sm text-destructive">
            Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={connectionState.isConnected ? 'bg-success/10 border-success' : 'bg-muted'}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {connectionState.isConnecting ? (
              <BluetoothSearching className="h-6 w-6 text-primary animate-pulse" />
            ) : connectionState.isConnected ? (
              <BluetoothConnected className="h-6 w-6 text-success" />
            ) : (
              <Bluetooth className="h-6 w-6 text-muted-foreground" />
            )}
            
            <div>
              <p className="font-semibold">
                {connectionState.isConnecting && 'Connecting...'}
                {connectionState.isConnected && `Connected: ${connectionState.deviceName || 'Sensors'}`}
                {!connectionState.isConnecting && !connectionState.isConnected && 'Sensors Disconnected'}
              </p>
              {connectionState.error && (
                <p className="text-sm text-destructive">{connectionState.error}</p>
              )}
            </div>
          </div>

          {showDetails && connectionState.isConnected && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Battery className="h-4 w-4" />
                <span className="text-sm">{connectionState.battery ?? 0}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Signal className="h-4 w-4" />
                <span className="text-sm">{connectionState.signalStrength ? `${connectionState.signalStrength}%` : 'Strong'}</span>
              </div>
            </div>
          )}

          <div>
            {connectionState.isConnected ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleConnect}
                disabled={connectionState.isConnecting}
              >
                {connectionState.isConnecting ? 'Connecting...' : 'Connect Sensors'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SensorConnection;
