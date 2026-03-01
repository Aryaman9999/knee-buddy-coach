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
    // Create binary sensor packet
    uint8_t binaryData[94]; // Size calculation below
    createBinarySensorPacket(binaryData);
    
    // Send data via BLE
    pCharacteristic->setValue(binaryData, sizeof(binaryData));
    pCharacteristic->notify();
    
    delay(50); // 20 Hz update rate
  }
}

void createBinarySensorPacket(uint8_t* buffer) {
  // Binary packet format (94 bytes total):
  // - 4 bytes: timestamp (uint32_t)
  // - 80 bytes: 5 quaternions × 4 floats × 4 bytes = 80 bytes
  // - 8 bytes: left_wt (float), right_wt (float)
  // - 1 byte: battery (uint8_t)
  // - 1 byte: status (0=ok, 1=warning, 2=error)
  
  int offset = 0;
  
  // 1. Timestamp (4 bytes)
  uint32_t timestamp = millis();
  memcpy(buffer + offset, &timestamp, 4);
  offset += 4;
  
  // 2. Read quaternions from your 5 IMU sensors
  // Replace these with actual sensor readings
  float pelvis_qw = 1.0f, pelvis_qx = 0.0f, pelvis_qy = 0.0f, pelvis_qz = 0.0f;
  float rt_qw = 1.0f, rt_qx = 0.0f, rt_qy = 0.0f, rt_qz = 0.0f;
  float rs_qw = 1.0f, rs_qx = 0.0f, rs_qy = 0.0f, rs_qz = 0.0f;
  float lt_qw = 1.0f, lt_qx = 0.0f, lt_qy = 0.0f, lt_qz = 0.0f;
  float ls_qw = 1.0f, ls_qx = 0.0f, ls_qy = 0.0f, ls_qz = 0.0f;
  
  // Sensor 1: Pelvis (16 bytes)
  memcpy(buffer + offset, &pelvis_qw, 4); offset += 4;
  memcpy(buffer + offset, &pelvis_qx, 4); offset += 4;
  memcpy(buffer + offset, &pelvis_qy, 4); offset += 4;
  memcpy(buffer + offset, &pelvis_qz, 4); offset += 4;
  
  // Sensor 2: Right Thigh (16 bytes)
  memcpy(buffer + offset, &rt_qw, 4); offset += 4;
  memcpy(buffer + offset, &rt_qx, 4); offset += 4;
  memcpy(buffer + offset, &rt_qy, 4); offset += 4;
  memcpy(buffer + offset, &rt_qz, 4); offset += 4;
  
  // Sensor 3: Right Shin (16 bytes)
  memcpy(buffer + offset, &rs_qw, 4); offset += 4;
  memcpy(buffer + offset, &rs_qx, 4); offset += 4;
  memcpy(buffer + offset, &rs_qy, 4); offset += 4;
  memcpy(buffer + offset, &rs_qz, 4); offset += 4;
  
  // Sensor 4: Left Thigh (16 bytes)
  memcpy(buffer + offset, &lt_qw, 4); offset += 4;
  memcpy(buffer + offset, &lt_qx, 4); offset += 4;
  memcpy(buffer + offset, &lt_qy, 4); offset += 4;
  memcpy(buffer + offset, &lt_qz, 4); offset += 4;
  
  // Sensor 5: Left Shin (16 bytes)
  memcpy(buffer + offset, &ls_qw, 4); offset += 4;
  memcpy(buffer + offset, &ls_qx, 4); offset += 4;
  memcpy(buffer + offset, &ls_qy, 4); offset += 4;
  memcpy(buffer + offset, &ls_qz, 4); offset += 4;
  
  // 3. Weight sensors (8 bytes)
  float left_weight = 0.0f;  // Read from actual sensor
  float right_weight = 0.0f; // Read from actual sensor
  memcpy(buffer + offset, &left_weight, 4); offset += 4;
  memcpy(buffer + offset, &right_weight, 4); offset += 4;
  
  // 4. Battery level (1 byte, 0-100)
  uint8_t battery = getBatteryLevel();
  buffer[offset++] = battery;
  
  // 5. Status (1 byte: 0=ok, 1=warning, 2=error)
  uint8_t status = 0; // 0 = ok
  buffer[offset++] = status;
}

int getBatteryLevel() {
  // Implement battery level reading
  // Return 0-100
  return 100;
}
```

## Data Packet Format

### Binary Protocol (Recommended)

The binary packet is **94 bytes** total with the following structure:

| Offset | Size | Type | Description |
|--------|------|------|-------------|
| 0 | 4 | uint32_t | Timestamp (milliseconds) |
| 4 | 16 | 4× float | Pelvis quaternion (qw, qx, qy, qz) |
| 20 | 16 | 4× float | Right thigh quaternion (qw, qx, qy, qz) |
| 36 | 16 | 4× float | Right shin quaternion (qw, qx, qy, qz) |
| 52 | 16 | 4× float | Left thigh quaternion (qw, qx, qy, qz) |
| 68 | 16 | 4× float | Left shin quaternion (qw, qx, qy, qz) |
| 84 | 4 | float | Left heel weight (0-100) |
| 88 | 4 | float | Right heel weight (0-100) |
| 92 | 1 | uint8_t | Battery level (0-100) |
| 93 | 1 | uint8_t | Status (0=ok, 1=warning, 2=error) |

**Benefits of Binary Protocol:**
- ✅ **94 bytes** vs **250+ bytes** for JSON (62% smaller)
- ✅ **No memory fragmentation** (no String objects)
- ✅ **3-5x faster** transmission
- ✅ **Lower power consumption**
- ✅ **More reliable** on ESP32

### Legacy JSON Format (Deprecated)

For backwards compatibility, JSON format is still supported but not recommended:

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
