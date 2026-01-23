'use client'

import { useState } from 'react';
import { Device, Command } from '@prisma/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Send, Trash2, Clock, Save, Play, Bookmark } from "lucide-react";
import Link from 'next/link';
import { sendModbusCommand, buildAndSend, ModbusResult } from '@/app/actions/modbus';
import { createCommand, deleteCommand } from '@/app/actions/command';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface LogItem extends ModbusResult {
  timestamp: string;
  mode: 'RTU' | 'HEX';
}

export function DebugConsole({ device, initialCommands }: { device: Device, initialCommands: Command[] }) {
  const router = useRouter();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'RTU' | 'HEX'>('RTU');
  
  // Save Dialog
  const [saveOpen, setSaveOpen] = useState(false);
  const [commandName, setCommandName] = useState('');

  // Builder State
  const [slaveId, setSlaveId] = useState(device.slaveId);
  const [funcCode, setFuncCode] = useState(3);
  const [address, setAddress] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Hex State
  const [hexString, setHexString] = useState('');

  const addLog = (result: ModbusResult, mode: 'RTU' | 'HEX') => {
    setLogs(prev => [{ ...result, timestamp: new Date().toLocaleTimeString(), mode }, ...prev]);
  };

  const handleSendBuilder = async () => {
    setLoading(true);
    try {
      const result = await buildAndSend(device.ip, device.port, slaveId, funcCode, address, quantity);
      addLog(result, 'RTU');
    } catch (e: any) {
      addLog({ success: false, requestHex: '', error: e.message }, 'RTU');
    } finally {
      setLoading(false);
    }
  };

  const handleSendHex = async () => {
    if (!hexString) return;
    setLoading(true);
    try {
      const result = await sendModbusCommand(device.ip, device.port, hexString);
      addLog(result, 'HEX');
    } catch (e: any) {
      addLog({ success: false, requestHex: '', error: e.message }, 'HEX');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCommand = async () => {
    if (!commandName) return;
    
    await createCommand({
      name: commandName,
      deviceId: device.id,
      mode,
      ...(mode === 'RTU' ? { slaveId, funcCode, address, quantity } : { hexString })
    });
    
    setSaveOpen(false);
    setCommandName('');
    router.refresh();
  };

  const handleDeleteCommand = async (id: string) => {
    await deleteCommand(id, device.id);
    router.refresh();
  };

  const loadCommand = (cmd: Command) => {
    if (cmd.mode === 'RTU') {
      setMode('RTU');
      setSlaveId(cmd.slaveId || 1);
      setFuncCode(cmd.funcCode || 3);
      setAddress(cmd.address || 0);
      setQuantity(cmd.quantity || 1);
    } else {
      setMode('HEX');
      setHexString(cmd.hexString || '');
    }
  };

  return (
    <div className="container mx-auto py-6 h-screen flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{device.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{device.ip}:{device.port}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left Panel: Controls */}
        <div className="lg:col-span-5 flex flex-col gap-6 min-h-0 overflow-y-auto pr-2">
          {/* Saved Commands Section */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center">
                <Bookmark className="mr-2 h-4 w-4" /> Saved Commands
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2">
               {initialCommands.length === 0 ? (
                 <p className="text-xs text-muted-foreground py-2 text-center">No saved commands</p>
               ) : (
                 <div className="space-y-2 max-h-[200px] overflow-y-auto">
                   {initialCommands.map(cmd => (
                     <div key={cmd.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted group">
                       <button 
                         className="flex-1 text-left text-sm font-medium truncate"
                         onClick={() => loadCommand(cmd)}
                       >
                         {cmd.name} <span className="text-xs text-muted-foreground ml-2">[{cmd.mode}]</span>
                       </button>
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => loadCommand(cmd)}>
                            <Play className="h-3 w-3" />
                         </Button>
                         <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => handleDeleteCommand(cmd.id)}>
                            <Trash2 className="h-3 w-3" />
                         </Button>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
            </CardContent>
          </Card>

          {/* Builder Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Command Builder</CardTitle>
              <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Save className="h-4 w-4 mr-1" /> Save
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Command</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input 
                        placeholder="e.g. Read Temperature" 
                        value={commandName} 
                        onChange={e => setCommandName(e.target.value)} 
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleSaveCommand}>Save</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Button 
                  variant={mode === 'RTU' ? 'default' : 'outline'} 
                  onClick={() => setMode('RTU')}
                  className="flex-1"
                >
                  Builder
                </Button>
                <Button 
                  variant={mode === 'HEX' ? 'default' : 'outline'} 
                  onClick={() => setMode('HEX')}
                  className="flex-1"
                >
                  Hex Direct
                </Button>
              </div>

              {mode === 'RTU' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Slave ID</Label>
                      <Input type="number" value={slaveId} onChange={e => setSlaveId(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Function Code</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={funcCode}
                        onChange={e => setFuncCode(Number(e.target.value))}
                      >
                        <option value={1}>01 Read Coils</option>
                        <option value={2}>02 Read Discrete Inputs</option>
                        <option value={3}>03 Read Holding Registers</option>
                        <option value={4}>04 Read Input Registers</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Address</Label>
                      <Input type="number" value={address} onChange={e => setAddress(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleSendBuilder} disabled={loading}>
                    <Send className="mr-2 h-4 w-4" /> Send Command
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Hex String (e.g., 01 03 00 00 00 02)</Label>
                    <Textarea 
                      value={hexString} 
                      onChange={e => setHexString(e.target.value)}
                      placeholder="01 03 00 00 00 02 C4 0B"
                      className="font-mono"
                      rows={5}
                    />
                  </div>
                  <Button className="w-full" onClick={handleSendHex} disabled={loading}>
                    <Send className="mr-2 h-4 w-4" /> Send Hex
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Logs */}
        <div className="lg:col-span-7 flex flex-col min-h-0">
          <Card className="flex-1 flex flex-col min-h-0 bg-zinc-950 border-zinc-800">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-zinc-800 bg-zinc-900/50">
              <CardTitle className="text-zinc-100 text-sm font-mono flex items-center">
                <Clock className="mr-2 h-4 w-4" /> Communication Log
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLogs([])} className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-8">
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 font-mono text-sm">
              {logs.length === 0 && (
                <div className="h-full flex items-center justify-center text-zinc-600">
                  No activity
                </div>
              )}
              <div className="flex flex-col">
                {logs.map((log, index) => (
                  <div key={index} className="border-b border-zinc-800/50 p-3 hover:bg-zinc-900/30 transition-colors">
                    <div className="flex justify-between text-xs text-zinc-500 mb-1">
                      <span>[{log.timestamp}] {log.mode}</span>
                      <span>{log.duration ? `${log.duration}ms` : '-'}</span>
                    </div>
                    
                    <div className="mb-1">
                      <span className="text-yellow-500 font-bold mr-2">TX &gt;</span>
                      <span className="text-zinc-300 break-all">{log.requestHex}</span>
                    </div>
                    
                    <div>
                      {log.success ? (
                        <>
                          <span className="text-green-500 font-bold mr-2">RX &lt;</span>
                          <span className="text-green-300 break-all">{log.responseHex}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-red-500 font-bold mr-2">ERR</span>
                          <span className="text-red-400">{log.error}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
