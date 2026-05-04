import { LibraryPack } from '../../lib/libraryData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Check, Library, Loader2, Bookmark, Upload, Trash } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { collection, addDoc, query, onSnapshot, where, deleteDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { compressImage } from '../../lib/imageUtils';

interface LibraryDialogProps {
  pack: LibraryPack | null;
  onClose: () => void;
  activeProjectId: string | null;
}

export function LibraryDialog({ pack, onClose, activeProjectId }: LibraryDialogProps) {
  const [importing, setImporting] = useState<string | null>(null);
  const [userImages, setUserImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Mapeamento dinâmico de tipo baseado no Pack selecionado
    const packTypeMap: Record<string, string> = {
      'pack-01': 'character',
      'pack-02': 'environment',
      'pack-03': 'object',
      'pack-04': 'animal'
    };
    
    const typeFilter = pack ? packTypeMap[pack.id] : 'character';
    
    setLoading(true);
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'user_library'),
      where('userId', '==', user.uid),
      where('type', '==', typeFilter)
    );

    const unsub = onSnapshot(q, (snap) => {
      const imgs: any[] = [];
      snap.forEach(d => imgs.push({ id: d.id, ...d.data() }));
      setUserImages(imgs);
      setLoading(false);
    });

    return unsub;
  }, [pack?.id]);

  const imagesToDisplay = userImages; // Mostrar apenas as do usuário para Cenários se for o que ele quer

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setLoading(true);
    try {
      const compressed = await compressImage(file);
      const packTypeMap: Record<string, string> = {
        'pack-01': 'character',
        'pack-02': 'environment',
        'pack-03': 'object',
        'pack-04': 'animal'
      };

      await addDoc(collection(db, 'user_library'), {
        userId: auth.currentUser.uid,
        url: compressed,
        label: file.name.split('.')[0],
        type: pack ? packTypeMap[pack.id] : 'character',
        createdAt: Date.now()
      });
      toast.success("Imagem adicionada à biblioteca!");
    } catch (error) {
      toast.error("Erro ao subir imagem");
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deseja remover esta imagem da biblioteca?")) return;
    
    try {
      await deleteDoc(doc(db, 'user_library', id));
      toast.success("Imagem removida");
    } catch (error) {
      toast.error("Erro ao remover");
    }
  };

  const importImage = async (img: any) => {
    if (!activeProjectId) {
      toast.error("Selecione um projeto primeiro!");
      return;
    }
    
    setImporting(img.id);
    try {
      await addDoc(collection(db, 'projects', activeProjectId, 'references'), {
        projectId: activeProjectId,
        url: img.url,
        label: img.label,
        type: img.type,
        createdAt: Date.now()
      });
      toast.success(`${img.label} adicionado ao projeto!`);
    } catch (error) {
      toast.error("Erro ao importar imagem");
    } finally {
      setImporting(null);
    }
  };

  return (
    <Dialog open={!!pack} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-5xl w-[95vw] rounded-3xl p-0 overflow-hidden border-none shadow-2xl flex flex-col">
        <div className="flex h-[80vh] min-h-0">
          {/* Left Side: Info */}
          <div className="w-64 bg-zinc-50 p-8 flex flex-col border-r border-zinc-100">
             <div className={`w-12 h-12 ${pack?.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-zinc-200`}>
                <Library className="w-6 h-6 text-white" />
             </div>
             <DialogHeader className="text-left space-y-2 p-0">
                <DialogTitle className="text-2xl font-bold tracking-tight text-zinc-900">{pack?.name}</DialogTitle>
                <DialogDescription className="text-sm text-zinc-500 leading-relaxed">
                   {pack?.description}
                </DialogDescription>
             </DialogHeader>
             
             <div className="mt-auto">
                <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-2">Curadoria</div>
                <div className="flex -space-x-2">
                   {[1,2,3].map(i => (
                     <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-zinc-200" />
                   ))}
                </div>
             </div>
          </div>

          {/* Right Side: Grid */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
             <div className="flex-1 p-8 overflow-y-auto">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-200" />
                  </div>
                ) : imagesToDisplay.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
                    <Bookmark className="w-12 h-12 stroke-[1px]" />
                    <p className="text-sm">Você ainda não salvou nenhum personagem.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 pb-8">
                    {/* Upload Card */}
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[4/5] rounded-2xl border-2 border-dashed border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 transition-all flex flex-col items-center justify-center gap-3 text-zinc-400 group"
                    >
                      <div className="p-3 rounded-full bg-zinc-50 group-hover:scale-110 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-medium">Adicionar {pack?.id === 'pack-01' ? 'Personagem' : 'Cenário'}</span>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept="image/*"
                      />
                    </button>

                    {imagesToDisplay.map((img) => (
                      <div key={img.id} className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-100">
                          <img src={img.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          
                          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between translate-y-4 group-hover:translate-y-0 transition-transform opacity-0 group-hover:opacity-100">
                            <div className="text-white">
                                <div className="text-xs font-bold uppercase tracking-wider">{img.label}</div>
                                <div className="text-[10px] opacity-70">Salvo por você</div>
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                  size="icon" 
                                  variant="destructive"
                                  className="rounded-full h-10 w-10 shadow-xl bg-red-500/80 backdrop-blur hover:bg-red-600"
                                  onClick={(e) => deleteImage(img.id, e)}
                                >
                                    <Trash className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  className="rounded-full bg-white text-zinc-900 hover:bg-zinc-100 h-10 w-10 shadow-xl"
                                  disabled={importing === img.id}
                                  onClick={() => importImage(img)}
                                >
                                    {importing === img.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                                </Button>
                            </div>
                          </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
             
             <div className="p-6 border-t border-zinc-100 flex justify-end">
                <Button variant="ghost" onClick={onClose} className="rounded-xl font-medium text-zinc-500">Fechar Galeria</Button>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
