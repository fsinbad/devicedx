import { getDeviceById } from "@/app/actions/device";
import { getDeviceCommands } from "@/app/actions/command";
import { DebugConsole } from "./debug-console";
import { notFound } from "next/navigation";

export default async function DebugPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const device = await getDeviceById(id);
  const commands = await getDeviceCommands(id);

  if (!device) {
    notFound();
  }

  return <DebugConsole device={device} initialCommands={commands} />;
}
