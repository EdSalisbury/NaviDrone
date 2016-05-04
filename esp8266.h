// Trimmed-down version of:
// https://github.com/itead/ITEADLIB_Arduino_WeeESP8266

#ifndef __ESP8266_H__
#define __ESP8266_H__

#include "Arduino.h"
#include "SoftwareSerial.h"


class ESP8266 {
public:
  ESP8266(SoftwareSerial &uart, uint32_t baud = 9600);
  bool joinAP(String ssid, String pwd);
  String getLocalIP(void);
  bool createTCP(String addr, uint32_t port);
  bool send(const uint8_t *buffer, uint32_t len);

private:
  SoftwareSerial *m_puart;
  bool recvFind(String target, uint32_t timeout = 1000);
  bool recvFindAndFilter(String target, String begin, String end, String &data, uint32_t timeout = 1000);
  void rx_empty(void);
  String recvString(String target, uint32_t timeout = 1000);
  String recvString(String target1, String target2, uint32_t timeout = 1000);
  String recvString(String target1, String target2, String target3, uint32_t timeout = 1000);
  bool sATCWJAP(String ssid, String pwd);
  bool eATCIFSR(String &list);
  bool sATCIPSTARTSingle(String type, String addr, uint32_t port);
  bool sATCIPSENDSingle(const uint8_t *buffer, uint32_t len);
};

#endif
