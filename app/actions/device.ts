'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getDevices() {
  return prisma.device.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function getDeviceById(id: string) {
  return prisma.device.findUnique({
    where: { id }
  });
}

export async function createDevice(data: {
  name: string;
  ip: string;
  port: number;
  slaveId: number;
  description?: string;
}) {
  await prisma.device.create({ data });
  revalidatePath('/');
}

export async function updateDevice(id: string, data: {
  name?: string;
  ip?: string;
  port?: number;
  slaveId?: number;
  description?: string;
}) {
  await prisma.device.update({
    where: { id },
    data
  });
  revalidatePath('/');
}

export async function deleteDevice(id: string) {
  await prisma.device.delete({ where: { id } });
  revalidatePath('/');
}
