import { getDevices, createDevice, deleteDevice } from "@/app/actions/device";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { PlusCircle, Trash2, MonitorPlay } from "lucide-react";
import { redirect } from "next/navigation";

export default async function Home() {
  const devices = await getDevices();

  async function handleCreate(formData: FormData) {
    'use server'
    const name = formData.get("name") as string;
    const ip = formData.get("ip") as string;
    const port = parseInt(formData.get("port") as string);
    const slaveId = parseInt(formData.get("slaveId") as string);
    const description = formData.get("description") as string;

    if (name && ip && port) {
      await createDevice({ name, ip, port, slaveId: slaveId || 1, description });
      redirect("/");
    }
  }

  async function handleDelete(id: string) {
    'use server'
    await deleteDevice(id);
    redirect("/");
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Device Manager</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {devices.map((device) => (
          <Card key={device.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex justify-between items-center">
                {device.name}
                <form action={handleDelete.bind(null, device.id)}>
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </form>
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {device.ip}:{device.port} (ID: {device.slaveId})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px]">
                {device.description || "No description"}
              </p>
            </CardContent>
            <CardFooter>
              <Link href={`/debug/${device.id}`} className="w-full">
                <Button className="w-full">
                  <MonitorPlay className="mr-2 h-4 w-4" /> Debug
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Add New Device</CardTitle>
          <CardDescription>Configure a new Modbus TCP/RTU endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleCreate} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Factory Sensor 1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slaveId">Slave ID</Label>
                <Input id="slaveId" name="slaveId" type="number" defaultValue="1" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ip">IP Address</Label>
                <Input id="ip" name="ip" placeholder="192.168.1.100" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input id="port" name="port" type="number" defaultValue="502" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" placeholder="Optional notes" />
            </div>
            <Button type="submit" className="w-full">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Device
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
