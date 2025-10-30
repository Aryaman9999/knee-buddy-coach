# ESP32 BLE Setup Guide

## Overview
This guide explains how to configure your ESP32 to send sensor data to the rehabilitation web application via Bluetooth Low Energy (BLE).

## Required Hardware
- ESP32 development board
- 5x IMU sensors (MPU6050, BNO055, or similar with quaternion output)
- Appropriate wiring and power supply

## BLE Configuration

### Service and Characteristic UUIDs
```cpp
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define DEVICE_NAME         "RehabSensor_001"
```

### Arduino Code Example

```cpp
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

BLECharacteristic *pCharacteristic;
bool deviceConnected = false;

// BLE Server callbacks
class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("Device connected");
  }

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("Device disconnected");
    // Restart advertising
    pServer->getAdvertising()->start();
  }
};

void setup() {
  Serial.begin(115200);
  
  // Initialize BLE
  BLEDevice::init(DEVICE_NAME);
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());
  
  // Create BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);
  
  // Create BLE Characteristic
  pCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_UUID,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  
  // Add descriptor for notifications
  pCharacteristic->addDescriptor(new BLE2902());
  
  // Start the service
  pService->start();
  
  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  pAdvertising->start();
  
  Serial.println("BLE device is ready!");
  
  // Initialize your IMU sensors here
  // initIMUSensors();
}

void loop() {
  if (deviceConnected) {
    // Read quaternion data from all 5 sensors
    // This is pseudo-code - implement based on your IMU library
    
    String jsonData = createSensorPacket();
    
    // Send data via BLE
    pCharacteristic->setValue(jsonData.c_str());
    pCharacteristic->notify();
    
    delay(50); // 20 Hz update rate
  }
}

String createSensorPacket() {
  // Read quaternions from your 5 IMU sensors
  // Format: sens1 = pelvis, sens2 = right thigh, sens3 = right shin,
  //         sens4 = left thigh, sens5 = left shin
  
  String json = "{";
  json += "\"timestamp\":" + String(millis()) + ",";
  
  // Option 1: Object format (recommended)
  json += "\"sens1\":{\"qw\":1.0,\"qx\":0.0,\"qy\":0.0,\"qz\":0.0},";
  json += "\"sens2\":{\"qw\":1.0,\"qx\":0.0,\"qy\":0.0,\"qz\":0.0},";
  json += "\"sens3\":{\"qw\":1.0,\"qx\":0.0,\"qy\":0.0,\"qz\":0.0},";
  json += "\"sens4\":{\"qw\":1.0,\"qx\":0.0,\"qy\":0.0,\"qz\":0.0},";
  json += "\"sens5\":{\"qw\":1.0,\"qx\":0.0,\"qy\":0.0,\"qz\":0.0},";
  
  // Option 2: String format (also supported)
  // json += "\"sens1\":\"1.0,0.0,0.0,0.0\",";
  
  json += "\"battery\":" + String(getBatteryLevel()) + ",";
  json += "\"status\":\"ok\"";
  json += "}";
  
  return json;
}

int getBatteryLevel() {
  // Implement battery level reading
  // Return 0-100
  return 100;
}
```

## Data Packet Format

### JSON Structure
```json
{
  "timestamp": 123456789,
  "sens1": {"qw": 1.0, "qx": 0.0, "qy": 0.0, "qz": 0.0},
  "sens2": {"qw": 0.9, "qx": 0.1, "qy": 0.0, "qz": 0.0},
  "sens3": {"qw": 0.8, "qx": 0.2, "qy": 0.0, "qz": 0.0},
  "sens4": {"qw": 0.9, "qx": 0.1, "qy": 0.0, "qz": 0.0},
  "sens5": {"qw": 0.8, "qx": 0.2, "qy": 0.0, "qz": 0.0},
  "battery": 85,
  "status": "ok"
}
```

### Alternative String Format
```json
{
  "timestamp": 123456789,
  "sens1": "1.0,0.0,0.0,0.0",
  "sens2": "0.9,0.1,0.0,0.0",
  "sens3": "0.8,0.2,0.0,0.0",
  "sens4": "0.9,0.1,0.0,0.0",
  "sens5": "0.8,0.2,0.0,0.0",
  "battery": 85,
  "status": "ok"
}
```

## Sensor Mapping

| Sensor ID | Body Part | Position |
|-----------|-----------|----------|
| sens1 | Pelvis | Lower back/pelvis |
| sens2 | Right Thigh | Upper leg (right) |
| sens3 | Right Shin | Lower leg (right) |
| sens4 | Left Thigh | Upper leg (left) |
| sens5 | Left Shin | Lower leg (left) |

## Quaternion Format

Quaternions represent 3D orientation:
- **qw**: Real part (scalar)
- **qx, qy, qz**: Imaginary parts (vector)

Requirements:
- Must be normalized: √(qw² + qx² + qy² + qz²) = 1.0
- Identity (no rotation): {qw: 1, qx: 0, qy: 0, qz: 0}

## Update Rate

Recommended: **20-50 Hz** (20-50 updates per second)
- Too fast: Increased power consumption, potential data loss
- Too slow: Jerky motion, poor user experience

## Power Management

```cpp
// Reduce BLE transmission power to save battery
esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_ADV, ESP_PWR_LVL_N12);
esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_SCAN, ESP_PWR_LVL_N12);
```

## Troubleshooting

### Device Not Appearing
1. Ensure ESP32 is powered on and running the sketch
2. Check that Bluetooth is enabled on your computer
3. Verify the device name matches `DEVICE_NAME` in code
4. Try restarting both devices

### Connection Drops
1. Reduce distance between devices
2. Remove obstacles between devices
3. Lower update rate if bandwidth is an issue
4. Check battery level

### Invalid Data
1. Ensure quaternions are normalized
2. Verify JSON format is correct
3. Check for special characters in strings
4. Monitor Serial output for errors

## Testing

Use the Serial Monitor to verify data:
```cpp
Serial.println(jsonData); // Print before sending
```

Expected output:
```
{"timestamp":12345,"sens1":{"qw":1.0,...},"battery":100,"status":"ok"}
```

## Next Steps

1. Upload this code to your ESP32
2. Power on the device
3. Open the web application
4. Click "Connect Sensors"
5. Select "RehabSensor_001" from the device picker
6. Begin exercise session

## Support

For IMU-specific code, refer to your sensor's library documentation:
- **MPU6050**: DMP quaternion output
- **BNO055**: Absolute orientation quaternion
- **MPU9250**: Madgwick/Mahony filter output
