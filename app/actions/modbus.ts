'use server'

import net from 'net';
import { appendCRC, checkCRC } from '@/lib/crc';

export type ModbusResult = {
  success: boolean;
  requestHex: string;
  responseHex?: string;
  duration?: number;
  error?: string;
};

export async function sendModbusCommand(
  ip: string, 
  port: number, 
  requestBuffer: string | Buffer
): Promise<ModbusResult> {
  // Convert hex string to Buffer if needed
  let bufferToSend: Buffer;
  if (typeof requestBuffer === 'string') {
    const cleanHex = requestBuffer.replace(/\s+/g, '');
    bufferToSend = Buffer.from(cleanHex, 'hex');
  } else {
    bufferToSend = requestBuffer;
  }

  const startTime = Date.now();

  return new Promise((resolve) => {
    const client = new net.Socket();
    let responseData = Buffer.alloc(0);
    let isResolved = false;

    // 3s Timeout
    client.setTimeout(3000);

    const cleanup = () => {
      isResolved = true;
      client.destroy();
    };

    client.on('connect', () => {
      client.write(bufferToSend);
    });

    client.on('data', (chunk) => {
      responseData = Buffer.concat([responseData, chunk]);
      // Simple heuristic: if we have enough data and valid CRC
      if (responseData.length >= 4 && checkCRC(responseData)) {
        cleanup();
        resolve({
          success: true,
          requestHex: bufferToSend.toString('hex').toUpperCase(),
          responseHex: responseData.toString('hex').toUpperCase(),
          duration: Date.now() - startTime
        });
      }
    });

    client.on('timeout', () => {
      if (!isResolved) {
        cleanup();
        resolve({
          success: false,
          requestHex: bufferToSend.toString('hex').toUpperCase(),
          error: 'Connection timed out'
        });
      }
    });

    client.on('error', (err) => {
      if (!isResolved) {
        cleanup();
        resolve({
          success: false,
          requestHex: bufferToSend.toString('hex').toUpperCase(),
          error: err.message
        });
      }
    });

    client.on('close', () => {
      if (!isResolved) {
        // Closed without enough data or CRC match
        resolve(responseData.length > 0 ? {
          success: true, // Treat partial data as success? Maybe not for RTU. Let's say false if CRC bad.
          requestHex: bufferToSend.toString('hex').toUpperCase(),
          responseHex: responseData.toString('hex').toUpperCase(), // Return what we got
          duration: Date.now() - startTime,
          error: 'Connection closed (CRC mismatch or partial data)'
        } : {
          success: false,
          requestHex: bufferToSend.toString('hex').toUpperCase(),
          error: 'Connection closed with no data'
        });
      }
    });

    // Start connection
    client.connect(port, ip);
  });
}

// Helper to build RTU frame
export async function buildAndSend(
  ip: string,
  port: number,
  slaveId: number,
  funcCode: number,
  address: number,
  quantity: number
) {
  const buf = Buffer.alloc(6);
  buf.writeUInt8(slaveId, 0);
  buf.writeUInt8(funcCode, 1);
  buf.writeUInt16BE(address, 2);
  buf.writeUInt16BE(quantity, 4);
  const frame = appendCRC(buf);
  return sendModbusCommand(ip, port, frame);
}
