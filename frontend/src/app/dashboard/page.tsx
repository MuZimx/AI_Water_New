
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Waves, 
  User, 
  LogOut, 
  Settings, 
  Upload, 
  FileAudio,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  PlayCircle,
  Home,
  Bell,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
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
import { API, type AudioFile, type User as UserType, RiskLevel } from '@/lib/api';
import { RiskBadge } from '@/components/risk-badge';
import { AudioPlayer } from '@/components/audio-player';
import { AIInterpretationTool } from '@/components/ai-interpretation-tool';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<AudioFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

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
      await API.uploadFile(file);
      loadFiles();
      toast({ title: "上传成功", description: "文件正由 AI Water 进行智能分析。" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "上传失败", description: error.message || "文件传输过程中发生错误。" });
    } finally {
      setIsUploading(false);
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
      <header className="sticky top-0 z-30 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg shadow-sm">
              <Waves className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-headline font-bold text-primary tracking-tight">AI <span className="text-secondary">Water</span></h1>
          </div>
          
          <div className="flex items-center gap-2">
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
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>账户设置</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  安全令牌管理
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  断开会话
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 mb-4">
        {/* 左侧：列表 */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-headline font-bold text-primary tracking-tight">监控清单</h2>
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
                        disabled={isUploading}
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
            </div>
          </div>

          <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full sm:w-[400px] grid-cols-3 bg-muted/50 p-1">
              <TabsTrigger value="all" className="text-xs sm:text-sm">所有样本</TabsTrigger>
              <TabsTrigger value="high" className="text-xs sm:text-sm text-destructive data-[state=active]:text-destructive">高风险</TabsTrigger>
              <TabsTrigger value="processing" className="text-xs sm:text-sm">分析中</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6 space-y-4">
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
            <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-secondary" /> 网络同步正常</span>
            <span className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-secondary" /> 安全加密</span>
          </div>
        </div>
      </footer>

      {/* 底部导航栏 (仅手机端) - 类安卓体验 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-lg border-t border-border px-6 py-3 flex justify-between items-center shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('all')} className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'all' ? 'text-primary' : 'text-muted-foreground')}>
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-medium">概览</span>
        </button>
        <button onClick={() => setActiveTab('high')} className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'high' ? 'text-destructive' : 'text-muted-foreground')}>
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
        <button onClick={() => setActiveTab('processing')} className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'processing' ? 'text-secondary' : 'text-muted-foreground')}>
          <Activity className="h-5 w-5" />
          <span className="text-[10px] font-medium">分析</span>
        </button>
        <button onClick={() => router.push('/profile')} className="flex flex-col items-center gap-1 text-muted-foreground">
          <User className="h-5 w-5" />
          <span className="text-[10px] font-medium">设置</span>
        </button>
      </div>
    </div>
  );
}
