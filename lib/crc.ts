function calculateCRC16(buffer: Buffer): number {
  let crc = 0xFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      if ((crc & 1) !== 0) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc = crc >> 1;
      }
    }
  }
  return crc;
}

export function appendCRC(buffer: Buffer): Buffer {
  const crc = calculateCRC16(buffer);
  const crcBuffer = Buffer.alloc(2);
  crcBuffer.writeUInt16LE(crc, 0);
  return Buffer.concat([buffer, crcBuffer]);
}

export function checkCRC(buffer: Buffer): boolean {
  if (buffer.length < 2) return false;
  const data = buffer.subarray(0, buffer.length - 2);
  const receivedCrc = buffer.readUInt16LE(buffer.length - 2);
  const calculatedCrc = calculateCRC16(data);
  return receivedCrc === calculatedCrc;
}
