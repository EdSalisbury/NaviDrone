#include <Wire.h>
#include <SoftwareSerial.h>
#include <Adafruit_Sensor.h>  // https://github.com/adafruit/Adafruit_Sensor
#include <Adafruit_LSM303.h>  // https://github.com/adafruit/Adafruit_LSM303
#include "esp8266.h"          

// Note: you must edit ESP8266.h after installation to include the following:
// #define ESP8266_USE_SOFTWARE_SERIAL

#define WIFI_RX_PIN 2
#define WIFI_TX_PIN 3

#define WIFI_SSID "BebopDrone-A024060"
#define WIFI_PASSWORD ""

#define SERVER_PORT 4242

SoftwareSerial wifi_serial(WIFI_RX_PIN, WIFI_TX_PIN);

//Adafruit_GPS GPS(&gps_serial);
ESP8266 wifi(wifi_serial);

//Define pins for forward ultrasonic sensor
#define fechoPin 9  //echo
#define ftrigPin 8  //trig

//Define pins for bottom ultrasonic sensor
#define bechoPin 7  //echo
#define btrigPin 6  //trig

Adafruit_LSM303 lsm;
uint32_t timer = millis();

String server_ip = "";

long get_sensor_distance(int trigPin, int echoPin)
{
    // send a pulse on the trigger pin to initiate measurement
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);

    // the length of the pulse on the echo pin is proportional to the distance
    long duration = pulseIn(echoPin, HIGH);
    long distance = (duration/2) / 74;
    return distance;
}

void setup()
{
    Serial.begin(9600);
    wifi_serial.begin(9600);
    delay(1000);
    
    wifi_serial.println("AT+RST");
    // Set up compass
    lsm.begin();

    //Set up ultrasonic sensors
    pinMode(ftrigPin, OUTPUT);
    pinMode(fechoPin, INPUT);

    pinMode(btrigPin, OUTPUT);
    pinMode(bechoPin, INPUT);

    // Set up wifi
    
    Serial.print(F("Connecting to Drone WiFi network"));
    delay(1000);

    int count = 0;
    int retry_count = 5;
    bool ret = false;
    while (count < retry_count and !ret)
    {
        Serial.print(".");
        ret = wifi.joinAP(WIFI_SSID, WIFI_PASSWORD);
        count++;
        delay(1000);
    }
    if (ret)
        Serial.println(F(" done."));
    else
        Serial.println(F(" Cannot join WiFi network!"));

    // Get server IP address
    String ip_data = wifi.getLocalIP();
    
    if (ip_data.indexOf("192.168.42.2") != -1)
        server_ip = "192.168.42.3";
    else
        server_ip = "192.168.42.2";  
}

void loop()
{
    delay(200);
    int forward_distance = get_sensor_distance(ftrigPin, fechoPin);
    delay(200);
    int bottom_distance = get_sensor_distance(btrigPin, bechoPin);
    delay(200);
    lsm.read();
   
    char json[130];
    
    sprintf(json, "{\"forward\": %d, \"bottom\": %d, \"mag\": {\"x\": %d, \"y\": %d, \"z\": %d}}", 
                 forward_distance, bottom_distance, 
                 (int)lsm.magData.x, (int)lsm.magData.y, (int)lsm.magData.z);

    String headers = F("POST /api HTTP/1.1\r\nContent-Type: application/json\r\nContent-Length: ");
    String cmd = F("AT+CIPSTART=\"TCP\",\"");
    cmd += server_ip;
    cmd += "\",4242";

    wifi_serial.println(cmd);
    //delay(100);

    cmd = headers;
    cmd += strlen(json);
    cmd += "\r\n\r\n";
    cmd += json;

    Serial.println(json);
    
    wifi_serial.print(F("AT+CIPSEND="));
    wifi_serial.println(cmd.length());
    if(wifi_serial.find(">"))
        wifi_serial.print(cmd);
    else
        wifi_serial.println(F("AT+CIPCLOSE"));

}
