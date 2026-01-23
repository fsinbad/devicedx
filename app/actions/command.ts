'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getDeviceCommands(deviceId: string) {
  return prisma.command.findMany({
    where: { deviceId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createCommand(data: {
  name: string;
  deviceId: string;
  mode: string;
  slaveId?: number;
  funcCode?: number;
  address?: number;
  quantity?: number;
  hexString?: string;
}) {
  await prisma.command.create({ data });
  revalidatePath(`/debug/${data.deviceId}`);
}

export async function deleteCommand(id: string, deviceId: string) {
  await prisma.command.delete({ where: { id } });
  revalidatePath(`/debug/${deviceId}`);
}
