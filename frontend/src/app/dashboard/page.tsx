
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Trash2,
  Waves,
  User,
  LogOut,
  Settings,
  Upload,
  FileAudio,
  ChevronRight,
  RefreshCw,
  PlayCircle,
  Home,
  Bell,
  Activity,
  Wrench,
  MessageSquare,
  MapPin,
  CheckSquare,
  Send,
  RotateCcw,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { API, type AudioFile, type User as UserType } from '@/lib/api';
import { RiskBadge } from '@/components/risk-badge';
import { AudioPlayer } from '@/components/audio-player';
import { AIInterpretationTool } from '@/components/ai-interpretation-tool';
import { WorkerNotifications } from '@/components/worker-notifications';
import { SensorDetailsDialog } from '@/components/sensor-details-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

const SensorMap = dynamic(() => import('@/components/sensor-map'), { ssr: false });

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<AudioFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sensors, setSensors] = useState<any[]>([]);
  const [workers, setWorkers] = useState<UserType[]>([]);
  const [selectedSensor, setSelectedSensor] = useState<any>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<number[]>([]);
  const [deadline, setDeadline] = useState('');
  const [workerStatus, setWorkerStatus] = useState<{ status: string } | null>(null);
  const [sensorDetailsOpen, setSensorDetailsOpen] = useState(false);
  const [selectedSensorId, setSelectedSensorId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedSensorForUpload, setSelectedSensorForUpload] = useState<number | undefined>(undefined);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await API.getCurrentUser();
        if (!user) {
          router.push('/');
          return;
        }
  setCurrentUser(user);
  loadFiles();
      } catch {
        router.push('/');
      }
    };
    loadUser();

    const interval = setInterval(loadFiles, 5000); // 5秒轮询一次
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: '网络已恢复', description: '当前已恢复联网，可继续同步数据。' });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({ variant: 'destructive', title: '当前离线', description: '网络连接已断开，数据可能无法实时同步。' });
    };

    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // load sensors and workers on mount
  useEffect(() => {
    loadSensors();
    if (currentUser?.role === '管理员') {
      loadWorkers();
    }
  }, [currentUser]);

  // 工人状态轮询
  useEffect(() => {
    if (currentUser?.role === '工人') {
      const checkWorkerStatus = async () => {
        try {
          const status = await API.getWorkerStatus();
          setWorkerStatus(status);
        } catch (error) {
          console.error('获取工人状态失败', error);
        }
      };

      checkWorkerStatus();
      const interval = setInterval(checkWorkerStatus, 5000); // 5秒轮询一次
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // 注册全局函数供地图弹窗调用
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).triggerAssignWorker = (sensorId: number) => {
        const sensor = sensors.find(s => s.id === sensorId);
        if (sensor && currentUser?.role === '管理员') {
          setSelectedSensor(sensor);
          setSelectedWorkers([]);
          setDeadline('');
          setAssignDialogOpen(true);
        }
      };

      // 清理函数
      return () => {
        if (typeof window !== 'undefined') {
          delete (window as any).triggerAssignWorker;
        }
      };
    }
  }, [sensors, currentUser]);

  const loadSensors = async () => {
    try {
      const data = await API.getSensors();
      setSensors(data || []);
    } catch (e) {
      console.error('加载传感器失败', e);
    }
  };

  const loadWorkers = async () => {
    try {
      const workersList = await API.getWorkers();
      setWorkers(workersList);
    } catch (e) {
      console.error('加载工人列表失败', e);
    }
  };

  const loadFiles = async () => {
    try {
      const files = await API.getFiles();

      // 获取每个文件的处理状态，确定 status
      const filesWithStatus = await Promise.all(
        files.map(async (file) => {
          if (file.risk_level === '未检测') {
            try {
              const status = await API.getFileStatus(file.filename);
              return {
                ...file,
                status: status.status || 'processing'
              };
            } catch {
              return {
                ...file,
                status: 'processing'
              };
            }
          } else {
            return {
              ...file,
              status: 'completed'
            };
          }
        })
      );

      setFiles(filesWithStatus);
    } catch (error) {
      console.error('加载文件失败:', error);
    }
  };

  const handleLogout = async () => {
    await API.logout();
    router.push('/');
  };

  const handleDeleteFile = async (id: number) => {
    try {
      await API.deleteFile(id);
      setFiles(files.filter(f => f.id !== id));
      if (selectedFile?.id === id) setSelectedFile(null);
      toast({ title: "文件已移除", description: "音频分析文件已成功从系统中删除。" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "删除失败", description: error.message || "无法删除文件。" });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({ variant: "destructive", title: "无效文件", description: "仅允许上传音频文件进行分析。" });
      return;
    }

    setIsUploading(true);
    try {
      await API.uploadFile(file, selectedSensorForUpload);
      loadFiles();
      toast({ title: "上传成功", description: "文件正由 AI Water 进行智能分析。" });
      setSelectedSensorForUpload(undefined); // 重置传感器选择
    } catch (error: any) {
      toast({ variant: "destructive", title: "上传失败", description: error.message || "文件传输过程中发生错误。" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSensorClick = (sensor: any) => {
    // 点击传感器时不直接打开派工对话框，而是让弹窗先显示
    // 实际的派工通过点击弹窗内的按钮触发
    if (currentUser?.role === '管理员' && (sensor.status === '严重漏水' || sensor.status === '轻微漏水')) {
      // 可以在这里做一些预处理，如高亮等
    }
  };

  const handleAssignWorker = async () => {
    if (!selectedSensor || selectedWorkers.length === 0) {
      toast({ variant: "destructive", title: "参数错误", description: "请选择至少一名工人" });
      return;
    }

    try {
      await API.createCommand({
        title: `维修任务：${selectedSensor.name}`,
        content: `检测到${selectedSensor.status}，请立即前往该传感器位置进行检查和维修。`,
        worker_ids: selectedWorkers,
        sensor_id: selectedSensor.id,
        deadline: deadline || undefined,
      } as any);
      toast({ title: "派工成功", description: `已向 ${selectedWorkers.length} 名工人发送维修通知` });
      setAssignDialogOpen(false);
      setSelectedSensor(null);
      setSelectedWorkers([]);
      setDeadline('');
      // 刷新传感器数据以更新分配状态
      loadSensors();
    } catch (error: any) {
      toast({ variant: "destructive", title: "派工失败", description: error.message || "请稍后重试" });
    }
  };

  const toggleWorkerSelection = (workerId: number) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleResetMaintenance = async () => {
    setIsResetting(true);
    try {
      await API.resetMaintenance();
      toast({ title: "重置成功", description: "所有维修记录已删除，工人状态已恢复" });
      setResetDialogOpen(false);
      // 刷新数据
      loadSensors();
      loadWorkers();
      if (currentUser?.role === '工人') {
        API.getWorkerStatus().then(setWorkerStatus).catch(console.error);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "重置失败", description: error.message || "请稍后重试" });
    } finally {
      setIsResetting(false);
    }
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.original_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'high' && f.risk_level === '高风险') ||
      (activeTab === 'processing' && (f.status === 'processing' || f.risk_level === '未检测'));
    return matchesSearch && matchesTab;
  });

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-[2000] w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg shadow-sm">
              <Waves className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-headline font-bold text-primary tracking-tight">AI <span className="text-secondary">Water</span></h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" className="h-10 px-3" onClick={() => router.push('/maintenance')}>
                <Wrench className="h-4 w-4 mr-2" />
                <span>检修记录</span>
              </Button>
              <Button variant="ghost" className="h-10 px-3" onClick={() => router.push('/commands')}>
                <MessageSquare className="h-4 w-4 mr-2" />
                <span>命令管理</span>
              </Button>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-secondary/10 rounded-full border border-secondary/20 mr-2">
              <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">监控中</span>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-1 pl-3 h-10 rounded-full border border-transparent hover:border-border transition-all">
                  <span className="text-sm font-medium hidden sm:inline-block">{currentUser?.username}</span>
                  <div className="bg-muted h-8 w-8 rounded-full flex items-center justify-center text-primary border shadow-sm">
                    <User className="h-4 w-4" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-[10000]">
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  个人中心
                </DropdownMenuItem>
                {currentUser?.role === '管理员' && (
                  <>
                    <DropdownMenuItem onClick={() => router.push('/workers')}>
                      <Users className="mr-2 h-4 w-4" />
                      工人账号管理
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setResetDialogOpen(true)} className="text-orange-600 focus:bg-orange-50">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      重置维修记录
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* 工人任务提醒横幅（仅工人且状态为工作中时显示） */}
      {!isOnline && (
        <div className="relative z-30 bg-destructive text-destructive-foreground border-b">
          <div className="container mx-auto px-4 py-2 text-sm font-medium">
            当前处于离线状态，数据可能不会实时更新。
          </div>
        </div>
      )}

      {/* 工人任务提醒横幅（仅工人且状态为工作中时显示） */}
      {currentUser?.role === '工人' && workerStatus?.status === '工作中' && (
        <div className="relative z-20 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-b border-orange-600 shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-full animate-pulse">
                <Bell className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">正在进行维修任务</p>
                <p className="text-white/90 text-sm mt-1">请查看任务详情并处理</p>
              </div>
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTaskDialogOpen(true);
                }}
                variant="secondary"
                className="bg-white text-orange-600 hover:bg-orange-50 pointer-events-auto relative z-10"
              >
                查看详情
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto p-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-4">
        {/* 地图卡片（左上） */}
        <div className="lg:col-span-12">
          <Card>
            <CardHeader>
              <CardTitle>地图总览</CardTitle>
              <CardDescription>显示城市中传感器位置信息与最新状态</CardDescription>
            </CardHeader>
            <CardContent>
              <SensorMap
                sensors={sensors}
                onSensorClick={handleSensorClick}
                isAdmin={currentUser?.role === '管理员'}
                onViewDetails={(sensorId) => {
                  setSelectedSensorId(sensorId);
                  setSensorDetailsOpen(true);
                }}
              />
            </CardContent>
          </Card>
        </div>
        {/* 左侧：列表 */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-headline font-bold text-primary tracking-tight">手动检查</h2>
              <p className="text-xs text-muted-foreground">当前共有 {files.length} 个采集样本</p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="搜索文件名..." 
                  className="pl-9 h-10 bg-white shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="h-10 bg-primary text-white shadow-md">
                    <Plus className="mr-2 h-4 w-4" /> 上传
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="font-headline text-xl">采集信号录入</DialogTitle>
                    <DialogDescription>
                      上传泵站或管道的音频样本，系统将通过 AI 模型自动分析漏损风险。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    {/* 传感器选择 */}
                    <div className="space-y-2">
                      <Label htmlFor="sensor-select">选择传感器 <span className="text-red-500">*</span></Label>
                      <Select
                        value={selectedSensorForUpload?.toString()}
                        onValueChange={(value) => setSelectedSensorForUpload(parseInt(value, 10))}
                      >
                        <SelectTrigger id="sensor-select">
                          <SelectValue placeholder="请选择传感器" />
                        </SelectTrigger>
                        <SelectContent>
                          {sensors.length === 0 ? (
                            <SelectItem value="loading" disabled>加载中...</SelectItem>
                          ) : (
                            sensors.map((sensor) => (
                              <SelectItem key={sensor.id} value={sensor.id.toString()}>
                                {sensor.name} ({sensor.status})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-xl p-10 hover:border-secondary/50 hover:bg-secondary/5 transition-all group cursor-pointer relative">
                      <input
                        type="file"
                        id="audio-upload"
                        title="上传音频文件"
                        aria-label="上传音频文件，支持 .wav 和 .mp3"
                        aria-describedby="audio-upload-desc"
                        accept="audio/*"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                        disabled={isUploading || !selectedSensorForUpload}
                      />
                      <Upload className="h-10 w-10 text-muted-foreground mb-4 group-hover:text-secondary group-hover:scale-110 transition-all" />
                      <p className="text-sm font-medium">点击或拖拽音频文件</p>
                      <p id="audio-upload-desc" className="text-xs text-muted-foreground mt-1">支持 .wav, .mp3 (最大 50MB)</p>
                    </div>
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span>正在上传信号...</span>
                          <span className="text-secondary">处理中</span>
                        </div>
                        <Progress value={45} className="h-2 bg-muted overflow-hidden" />
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* 派工对话框（仅管理员可见） */}
              <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent className="sm:max-w-[500px] z-[10000]">
                  <DialogHeader>
                    <DialogTitle className="font-headline text-xl">分配维修工</DialogTitle>
                    <DialogDescription>
                      为 {selectedSensor?.name} 选择负责维修的工人
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {/* 传感器信息 */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{selectedSensor?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          selectedSensor?.status === '严重漏水' ? 'bg-red-100 text-red-700' :
                          selectedSensor?.status === '轻微漏水' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {selectedSensor?.status}
                        </span>
                      </div>
                    </div>

                    {/* 工人选择 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">选择工人（可多选）</label>
                      <p className="text-xs text-muted-foreground">仅显示空闲状态的工人</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {workers.filter(w => w.worker_status === '空闲').length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">暂无空闲工人</p>
                        ) : (
                          workers.filter(w => w.worker_status === '空闲').map((worker) => (
                          <div
                            key={worker.id}
                            onClick={() => toggleWorkerSelection(worker.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedWorkers.includes(worker.id)
                                ? 'border-primary bg-primary/5'
                                : 'border-muted hover:border-primary/30'
                            }`}
                          >
                            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                              selectedWorkers.includes(worker.id)
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground'
                            }`}>
                              {selectedWorkers.includes(worker.id) && (
                                <CheckSquare className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{worker.full_name || worker.username}</p>
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full">空闲</span>
                              </div>
                              <p className="text-xs text-muted-foreground">{worker.phone || '未设置电话'}</p>
                            </div>
                          </div>
                        )))}
                      </div>
                    </div>

                    {/* 截止时间 */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">截止时间（可选）</label>
                      <Input
                        type="datetime-local"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="bg-white"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAssignDialogOpen(false)}>
                      取消
                    </Button>
                    <Button
                      type="button"
                      onClick={handleAssignWorker}
                      disabled={selectedWorkers.length === 0}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      发送指令
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full sm:w-[400px] grid-cols-3 bg-muted/50 p-1">
              <TabsTrigger value="all" className="text-xs sm:text-sm">所有样本</TabsTrigger>
              <TabsTrigger value="high" className="text-xs sm:text-sm text-destructive data-[state=active]:text-destructive">高风险</TabsTrigger>
              <TabsTrigger value="processing" className="text-xs sm:text-sm">分析中</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6 space-y-4">
              {filteredFiles.length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <FileAudio className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="font-headline text-lg font-semibold text-muted-foreground">暂无分析记录</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2">
                      当前筛选条件下没有找到任何信号样本。
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {filteredFiles.map((file) => (
                    <Card
                      key={file.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md border border-transparent bg-white/70 backdrop-blur-sm",
                        selectedFile?.id === file.id ? 'border-primary ring-1 ring-primary/20 shadow-md scale-[1.01]' : 'hover:border-primary/20'
                      )}
                      onClick={() => setSelectedFile(file)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={cn(
                          "p-3 rounded-xl flex-shrink-0",
                          file.status === 'processing' ? 'bg-secondary/10' : 'bg-muted'
                        )}>
                          {file.status === 'processing' ? (
                            <RefreshCw className="h-6 w-6 text-secondary animate-spin" />
                          ) : (
                            <FileAudio className="h-6 w-6 text-primary" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate text-sm sm:text-base">{file.original_name}</h4>
                            <RiskBadge level={file.risk_level} className="text-[10px]" />
                          </div>
                          <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
                            <span>{format(new Date(file.upload_time), 'yyyy/MM/dd HH:mm')}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            {file.status === 'completed' && file.risk_level !== '未检测' && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                <span className="text-primary font-bold">置信度 {Math.round(file.confidence * 100)}%</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-2">
                           {file.status === 'completed' && <PlayCircle className="h-5 w-5 text-primary/40" />}
                           <ChevronRight className={cn("h-5 w-5 transition-transform", selectedFile?.id === file.id ? 'rotate-90' : 'text-muted-foreground')} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="high" className="mt-6 space-y-4">
              {filteredFiles.length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <FileAudio className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="font-headline text-lg font-semibold text-muted-foreground">暂无高风险记录</h3>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {filteredFiles.map((file) => (
                    <Card
                      key={file.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md border border-transparent bg-white/70 backdrop-blur-sm",
                        selectedFile?.id === file.id ? 'border-primary ring-1 ring-primary/20 shadow-md scale-[1.01]' : 'hover:border-primary/20'
                      )}
                      onClick={() => setSelectedFile(file)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={cn(
                          "p-3 rounded-xl flex-shrink-0",
                          file.status === 'processing' ? 'bg-secondary/10' : 'bg-destructive/10'
                        )}>
                          {file.status === 'processing' ? (
                            <RefreshCw className="h-6 w-6 text-secondary animate-spin" />
                          ) : (
                            <FileAudio className="h-6 w-6 text-destructive" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate text-sm sm:text-base">{file.original_name}</h4>
                            <RiskBadge level={file.risk_level} className="text-[10px]" />
                          </div>
                          <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
                            <span>{format(new Date(file.upload_time), 'yyyy/MM/dd HH:mm')}</span>
                          </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-2">
                           <ChevronRight className={cn("h-5 w-5 transition-transform", selectedFile?.id === file.id ? 'rotate-90' : 'text-muted-foreground')} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="processing" className="mt-6 space-y-4">
              {filteredFiles.length === 0 ? (
                <Card className="border-dashed border-2 bg-transparent">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <FileAudio className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="font-headline text-lg font-semibold text-muted-foreground">暂无分析中记录</h3>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {filteredFiles.map((file) => (
                    <Card
                      key={file.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md border border-transparent bg-white/70 backdrop-blur-sm",
                        selectedFile?.id === file.id ? 'border-primary ring-1 ring-primary/20 shadow-md scale-[1.01]' : 'hover:border-primary/20'
                      )}
                      onClick={() => setSelectedFile(file)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-secondary/10 flex-shrink-0">
                          <RefreshCw className="h-6 w-6 text-secondary animate-spin" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate text-sm sm:text-base">{file.original_name}</h4>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] sm:text-xs text-muted-foreground">
                            <span>{format(new Date(file.upload_time), 'yyyy/MM/dd HH:mm')}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* 右侧：详情面板 */}
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-24 space-y-6">
            {selectedFile ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-right-4 duration-300">
                <Card className="overflow-hidden shadow-xl border-none">
                  <CardHeader className="bg-primary text-white space-y-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-headline flex items-center gap-2 text-lg">
                        分析报告
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8"
                        onClick={() => handleDeleteFile(selectedFile.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/60 font-bold tracking-widest uppercase">采集点位 / 文件名</p>
                      <p className="text-base font-bold leading-tight truncate">{selectedFile.original_name}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6 bg-white">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">诊断状态</p>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-2 w-2 rounded-full", (selectedFile.status === 'completed' || selectedFile.risk_level !== '未检测') ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse')} />
                          <span className="text-xs font-semibold">{(selectedFile.status === 'completed' || selectedFile.risk_level !== '未检测') ? '诊断完成' : 'AI 扫描中'}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">匹配置信度</p>
                        <p className="text-xs font-semibold">{(selectedFile.status === 'completed' || selectedFile.risk_level !== '未检测') ? `${Math.round(selectedFile.confidence * 100)}%` : '评估中'}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">主要风险向量</p>
                       <RiskBadge level={selectedFile.risk_level} className="w-full justify-center py-2.5 text-sm rounded-lg" />
                    </div>

                    {(selectedFile.status === 'completed' || selectedFile.risk_level !== '未检测') && (
                      <div className="space-y-3 pt-2 border-t border-dashed">
                        <AudioPlayer
                          src={`${process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:3000'}/uploads/${selectedFile.filename}`}
                          title={selectedFile.original_name}
                        />
                      </div>
                    )}

                    {selectedFile.status === 'processing' && selectedFile.risk_level === '未检测' && (
                       <div className="bg-muted/30 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 border border-muted">
                         <RefreshCw className="h-8 w-8 text-secondary animate-spin" />
                         <p className="text-xs font-medium text-muted-foreground">正在应用傅里叶变换识别水力瞬变信号...</p>
                       </div>
                    )}
                  </CardContent>
                </Card>

                {(selectedFile.status === 'completed' || selectedFile.risk_level !== '未检测') && (
                  <AIInterpretationTool riskLevel={selectedFile.risk_level} confidence={selectedFile.confidence} />
                )}
              </div>
            ) : (
              <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm h-[300px] lg:h-[400px] flex flex-col items-center justify-center text-center p-8">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <Activity className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <CardTitle className="text-lg font-headline font-bold text-muted-foreground">待诊断工作区</CardTitle>
                <CardDescription className="max-w-[200px] mt-2">
                  从左侧列表中选择一个音频样本，以查看 AI 给出的风险分析和维护建议。
                </CardDescription>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* 底部版权信息 (仅 PC) */}
      <footer className="hidden md:block py-6 border-t bg-white">
        <div className="container mx-auto px-4 flex items-center justify-between text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} AI Water 监控系统。所有关键指标运行正常。</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <div className={cn('h-1.5 w-1.5 rounded-full', isOnline ? 'bg-secondary' : 'bg-destructive animate-pulse')} />
              {isOnline ? '网络同步正常' : '离线模式'}
            </span>
            <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-secondary" /> 安全加密</span>
          </div>
        </div>
      </footer>

      {/* 底部导航栏 (仅手机端) - 类安卓体验 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-lg border-t border-border px-6 py-3 flex justify-between items-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button type="button" onClick={() => setActiveTab('all')} className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'all' ? 'text-primary' : 'text-muted-foreground')}>
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">概览</span>
        </button>
        <button type="button" onClick={() => setActiveTab('high')} className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'high' ? 'text-destructive' : 'text-muted-foreground')}>
          <Bell className="h-5 w-5" />
          <span className="text-[10px] font-medium">预警</span>
        </button>
        <button
          type="button"
          aria-label="上传采集样本"
          title="上传采集样本"
          className="flex flex-col items-center gap-1 -mt-8 bg-primary p-3 rounded-full shadow-lg text-white ring-4 ring-background"
        >
           <Plus className="h-6 w-6" />
        </button>
        <button type="button" onClick={() => setActiveTab('processing')} className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'processing' ? 'text-secondary' : 'text-muted-foreground')}>
          <Activity className="h-5 w-5" />
          <span className="text-[10px] font-medium">分析</span>
        </button>
        <button type="button" onClick={() => router.push('/profile')} className="flex flex-col items-center gap-1 text-muted-foreground">
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">设置</span>
        </button>
      </div>

      {/* 重置维修记录确认对话框 */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md z-[10000]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="bg-orange-100 p-2 rounded-full">
                <RotateCcw className="h-6 w-6 text-orange-600" />
              </div>
              重置维修记录
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-orange-900 font-medium mb-2">
                ⚠️ 此操作不可撤销
              </p>
              <p className="text-orange-700 text-sm">
                确定要删除所有维修记录吗？此操作将：
              </p>
              <ul className="text-orange-700 text-sm mt-2 space-y-1 list-disc list-inside">
                <li>删除所有检修记录（含照片和传感器关联）</li>
                <li>删除所有派工指令和维修反馈</li>
                <li>将所有工人状态重置为"空闲"</li>
                <li>传感器状态保持不变，只清除维修记录</li>
              </ul>
            </div>
          </div>
          <DialogFooter className="flex gap-2 !flex-row !justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              disabled={isResetting}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleResetMaintenance}
              disabled={isResetting}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isResetting ? '重置中...' : '确认重置'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 传感器详情对话框 */}
      <SensorDetailsDialog
        open={sensorDetailsOpen}
        onOpenChange={setSensorDetailsOpen}
        sensorId={selectedSensorId}
      />

      {/* 维修任务弹窗 */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-[700px] z-[10000] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">维修任务详情</DialogTitle>
            <DialogDescription>
              查看并处理当前维修任务
            </DialogDescription>
          </DialogHeader>
          <WorkerNotifications
            currentUser={currentUser}
            onStatusChange={() => {
              // 刷新工人状态
              API.getWorkerStatus().then(setWorkerStatus).catch(console.error);
            }}
            onRefreshSensors={loadSensors}
            fromBanner={false}
            inDialog={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
