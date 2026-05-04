import { useState, useEffect } from 'react';
import { Project, SketchStyle, ReferenceImage, Generation } from '../../types';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { generateSketch } from '../../services/imageService';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ReferenceUpload } from '../ui/ReferenceUpload';
import { 
  Sparkles, 
  Download, 
  History, 
  Image as ImageIcon, 
  Plus, 
  Send,
  Loader2,
  CheckCircle2,
  Maximize2,
  Copy,
  Trash,
  Bookmark
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface SketchEditorProps {
  project: Project;
}

const STYLES: SketchStyle[] = ['Cartoon', 'Semi-realista', 'Realista', 'Infantil', 'HQ (comic style)', 'Mangá', 'Cyberpunk', 'Vintage'];

export function SketchEditor({ project }: SketchEditorProps) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<SketchStyle>('Semi-realista');
  const [references, setReferences] = useState<ReferenceImage[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedRefIds, setSelectedRefIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationTime, setGenerationTime] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setGenerationTime(0);
      interval = setInterval(() => {
        setGenerationTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const [activeGeneration, setActiveGeneration] = useState<Generation | null>(null);
  const [settings, setSettings] = useState({
    contrast: 50,
    texture: 25,
    constructionLines: 75
  });

  useEffect(() => {
    // Refs
    const refQ = query(collection(db, 'projects', project.id, 'references'));
    const unsubRefs = onSnapshot(refQ, (snap) => {
      const rs: ReferenceImage[] = [];
      snap.forEach(d => rs.push({ id: d.id, ...d.data() } as ReferenceImage));
      setReferences(rs.sort((a, b) => b.createdAt - a.createdAt));
    });

    // Gens
    const genQ = query(collection(db, 'projects', project.id, 'generations'));
    const unsubGens = onSnapshot(genQ, (snap) => {
      const gs: Generation[] = [];
      snap.forEach(d => gs.push({ id: d.id, ...d.data() } as Generation));
      const sortedGens = gs.sort((a, b) => b.createdAt - a.createdAt);
      setGenerations(sortedGens);
      if (sortedGens.length > 0 && !activeGeneration) {
        setActiveGeneration(sortedGens[0]);
      }
    });

    return () => { unsubRefs(); unsubGens(); };
  }, [project.id]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Por favor, descreva o que deseja desenhar.");
      return;
    }

    setIsGenerating(true);
    try {
      const selectedRefData = references
        .filter(r => selectedRefIds.includes(r.id))
        .map(r => r.url);

      const result = await generateSketch({
        prompt,
        style,
        references: selectedRefData,
        settings
      });

      const newGen = {
        projectId: project.id,
        prompt,
        fullPrompt: result.fullPrompt,
        style,
        imageUrl: result.imageUrl,
        createdAt: Date.now()
      };

      const docRef = await addDoc(collection(db, 'projects', project.id, 'generations'), newGen);
      setActiveGeneration({ id: docRef.id, ...newGen });
      setIsGenerating(false);
      toast.success("Esboço gerado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar esboço. Tente novamente.");
      setIsGenerating(false);
    }
  };

  const toggleRefSelection = (id: string) => {
    setSelectedRefIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const downloadImage = () => {
    if (!activeGeneration) return;
    const link = document.createElement('a');
    link.href = activeGeneration.imageUrl;
    link.download = `sketchforge-${project.name}-${activeGeneration.id}.png`;
    link.click();
  };

  const copyPrompt = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Prompt copiado!");
  };

  const deleteGeneration = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'generations', id));
      if (activeGeneration?.id === id) setActiveGeneration(null);
      toast.success("Geração removida");
    } catch (error) {
      toast.error("Erro ao remover");
    }
  };

  const deleteReference = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'projects', project.id, 'references', id));
      setSelectedRefIds(prev => prev.filter(i => i !== id));
      toast.success("Referência removida");
    } catch (error) {
      toast.error("Erro ao remover");
    }
  };

  const saveToReferenceLibrary = async (ref: ReferenceImage, e: React.MouseEvent) => {
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    try {
      // Usar uma coleção global para a biblioteca do usuário
      await addDoc(collection(db, 'user_library'), {
        userId: user.uid,
        url: ref.url,
        label: ref.label || "Sem nome",
        type: ref.type || "character",
        createdAt: Date.now(),
        sourceProjectId: project.id
      });
      toast.success("Adicionado à sua Biblioteca pessoal!");
    } catch (error) {
      console.error("Erro ao salvar na biblioteca:", error);
      toast.error("Erro ao salvar na biblioteca");
    }
  };

  const cycleReferenceType = async (ref: ReferenceImage, e: React.MouseEvent) => {
    e.stopPropagation();
    const types: ReferenceImage['type'][] = ['character', 'environment', 'object', 'animal', 'style'];
    const currentIndex = types.indexOf(ref.type);
    const nextIndex = (currentIndex + 1) % types.length;
    const nextType = types[nextIndex];

    try {
      await updateDoc(doc(db, 'projects', project.id, 'references', ref.id), {
        type: nextType
      });
      toast.success(`Alterado para ${nextType === 'character' ? 'Personagem' : nextType === 'environment' ? 'Cenário' : nextType === 'object' ? 'Objeto' : nextType === 'animal' ? 'Animal' : 'Estilo'}`);
    } catch (error) {
      toast.error("Erro ao alterar tipo");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#FDFCFB] overflow-hidden">
      {/* Editor Main Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side: Controls */}
        <div className="w-[400px] border-r border-zinc-100 flex flex-col bg-white overflow-hidden h-full">
          <ScrollArea className="flex-1 min-h-0 w-full">
            <div className="p-6 space-y-8 pb-12">
              {/* Style & Prompt */}
              <section className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400">Estilo Artístico</label>
                    <Select value={style} onValueChange={(v: SketchStyle) => setStyle(v)}>
                      <SelectTrigger className="rounded-xl bg-zinc-50 border-zinc-100 focus:ring-zinc-900">
                        <SelectValue placeholder="Selecione o estilo" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl overflow-hidden">
                        {STYLES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>

                 <div className="space-y-2">
                    <div className="flex items-center justify-between">
                       <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400">Prompt do Artista</label>
                       <button 
                        onClick={() => setPrompt('')}
                        className="text-[10px] text-zinc-400 hover:text-zinc-900 transition-colors uppercase font-bold tracking-wider"
                       >
                         Limpar
                       </button>
                    </div>
                    <div className="relative">
                       <textarea
                         value={prompt}
                         onChange={(e) => setPrompt(e.target.value)}
                         placeholder="Ex: Personagem ciborgue em pose heróica, vista frontal... (Dica: descreva traços marcantes das referências)"
                         className="w-full h-32 p-4 bg-zinc-50 rounded-2xl border border-zinc-100 resize-none outline-none focus:border-zinc-300 transition-all text-sm leading-relaxed"
                       />
                       <div className="absolute bottom-3 right-3 text-[10px] text-zinc-400 font-mono">
                         {prompt.length}/500
                       </div>
                    </div>
                 </div>
              </section>

              {/* Reference Management */}
              <section className="space-y-4">
                 <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400">Referências ({references.length})</label>
                    <div className="text-[10px] text-zinc-400">Selecione para usar na IA</div>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-2">
                    {references.map(ref => (
                      <div key={ref.id} className="relative group">
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleRefSelection(ref.id)}
                          className={cn(
                            "relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all group",
                            selectedRefIds.includes(ref.id) ? "border-zinc-900" : "border-transparent"
                          )}
                        >
                          <img src={ref.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute top-1 left-1 flex gap-1 z-10">
                             {selectedRefIds.includes(ref.id) && (
                               <div className="bg-zinc-900 rounded-full p-0.5">
                                 <CheckCircle2 className="w-3 h-3 text-white" />
                               </div>
                             )}
                             <Badge 
                                onClick={(e) => cycleReferenceType(ref, e)}
                                className="bg-white/80 backdrop-blur text-[8px] text-zinc-900 h-4 border-none px-1.5 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-bold cursor-pointer hover:bg-white"
                              >
                               {ref.type === 'character' ? 'Pers.' : 
                                ref.type === 'environment' ? 'Cena' : 
                                ref.type === 'object' ? 'Obj.' : 
                                ref.type === 'animal' ? 'Ani.' : ref.type}
                             </Badge>
                          </div>
                          <div className="absolute top-1 right-1 flex gap-1 z-10">
                            <button 
                              onClick={(e) => saveToReferenceLibrary(ref, e)}
                              title="Salvar na Biblioteca"
                              className="p-1 bg-white/80 backdrop-blur rounded-md opacity-0 group-hover:opacity-100 hover:text-blue-500 transition-all shadow-sm"
                            >
                              <Bookmark className="w-2.5 h-2.5" />
                            </button>
                            <button 
                              onClick={(e) => deleteReference(ref.id, e)}
                              className="p-1 bg-white/80 backdrop-blur rounded-md opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all shadow-sm"
                            >
                              <Trash className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    ))}
                    <div className="col-span-3 mt-2">
                       <ReferenceUpload projectId={project.id} />
                    </div>
                 </div>
              </section>

              {/* Advanced Settings */}
              <section className="space-y-8 pt-6 border-t border-zinc-100">
                  <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400">Pós-processamento (Estilo)</label>
                  
                     <div className="space-y-4">
                        <div className="flex justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-tighter">
                           <span>Contraste do Grafite</span>
                           <span className="text-zinc-900 font-mono">{settings.contrast}%</span>
                        </div>
                        <input 
                          type="range"
                          value={settings.contrast}
                          onChange={(e) => setSettings(s => ({...s, contrast: parseInt(e.target.value)}))}
                          className="w-full h-1 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                        />
                     </div>

                     <div className="space-y-4">
                        <div className="flex justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-tighter">
                           <span>Textura do Papel</span>
                           <span className="text-zinc-900 font-mono">{settings.texture}%</span>
                        </div>
                        <input 
                          type="range"
                          value={settings.texture}
                          onChange={(e) => setSettings(s => ({...s, texture: parseInt(e.target.value)}))}
                          className="w-full h-1 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                        />
                     </div>

                     <div className="space-y-4">
                        <div className="flex justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-tighter">
                           <span>Linhas de Construção</span>
                           <span className="text-zinc-900 font-mono">{settings.constructionLines}%</span>
                        </div>
                        <input 
                          type="range"
                          value={settings.constructionLines}
                          onChange={(e) => setSettings(s => ({...s, constructionLines: parseInt(e.target.value)}))}
                          className="w-full h-1 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-900"
                        />
                     </div>
               </section>
            </div>
          </ScrollArea>

          <div className="p-6 border-t border-zinc-100">
            <Button 
              disabled={isGenerating}
              onClick={handleGenerate}
              className="w-full h-14 bg-zinc-900 text-white hover:bg-zinc-800 rounded-2xl shadow-2xl shadow-zinc-200 transition-all active:scale-95 group font-medium"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  Gerando Esboço...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-3 text-orange-400 group-hover:rotate-12 transition-transform" />
                  Gerar Sketch
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Center: Preview Area */}
        <div className="flex-1 bg-zinc-50 relative flex flex-col">
           <div className="h-10 px-6 border-b border-zinc-100 flex items-center justify-between text-[10px] uppercase font-bold tracking-[0.15em] text-zinc-400 bg-white/50 backdrop-blur-sm z-10">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                 Preview em tempo real
              </div>
              <div className="flex items-center gap-4">
                 <span>Zoom: 100%</span>
                 <span>RGB: 255, 255, 255</span>
              </div>
           </div>

           <div className="flex-1 relative flex items-center justify-center p-12 overflow-hidden">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                   <motion.div 
                     key="loading"
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     exit={{ opacity: 0 }}
                     className="flex flex-col items-center gap-4"
                   >
                     <div className="w-20 h-20 relative flex items-center justify-center">
                        <div className="absolute inset-0 border-t-2 border-zinc-900 rounded-full animate-spin" />
                        <div className="absolute inset-2 border-r-2 border-zinc-300 rounded-full animate-spin [animation-duration:1.5s]" />
                        <span className="text-sm font-mono font-bold text-zinc-900">{generationTime}s</span>
                     </div>
                     <div className="flex flex-col items-center">
                       <p className="text-sm font-medium text-zinc-500 font-mono tracking-tight animate-pulse">MAPEANDO TRAÇOS E VOLUMES...</p>
                       <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-widest">Sua arte está sendo forjada</p>
                     </div>
                   </motion.div>
                ) : activeGeneration ? (
                  <motion.div
                    key={activeGeneration.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative group h-full max-h-full flex items-center"
                  >
                    <div className="relative shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] bg-white rounded-sm overflow-hidden p-8 border border-zinc-200">
                       {/* Subtle Paper Texture Overlay if needed, but the white paper is in the prompt */}
                       <img 
                        src={activeGeneration.imageUrl} 
                        className="max-w-full max-h-[70vh] object-contain block select-none" 
                        referrerPolicy="no-referrer" 
                       />
                    </div>
                    
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button size="icon" variant="secondary" className="rounded-full shadow-lg h-10 w-10 bg-white/90 backdrop-blur hover:bg-white" onClick={downloadImage}>
                          <Download className="w-4 h-4" />
                       </Button>
                       <Button size="icon" variant="secondary" className="rounded-full shadow-lg h-10 w-10 bg-white/90 backdrop-blur hover:bg-white">
                          <Maximize2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-zinc-300">
                     <ImageIcon className="w-16 h-16 stroke-[1px]" />
                     <p className="text-sm">Configuração finalizada. Pronto para gerar.</p>
                  </div>
                )}
              </AnimatePresence>
           </div>
        </div>

        {/* Right Side: History / Details */}
        <div className="w-64 border-l border-zinc-100 bg-white flex flex-col overflow-hidden h-full">
           <div className="p-4 border-b border-zinc-100 flex items-center gap-2 text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400">
              <History className="w-3 h-3" />
              Histórico ({generations.length})
           </div>
           
           <ScrollArea className="flex-1 min-h-0">
              <div className="p-3 grid grid-cols-2 gap-2">
                 {generations.map(gen => (
                    <motion.div
                     key={gen.id}
                     whileHover={{ scale: 1.02 }}
                     onClick={() => setActiveGeneration(gen)}
                     className={cn(
                       "aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all p-1 group/item relative",
                       activeGeneration?.id === gen.id ? "border-zinc-900" : "border-zinc-100 hover:border-zinc-300"
                     )}
                    >
                      <img src={gen.imageUrl} className="w-full h-full object-cover rounded-sm" referrerPolicy="no-referrer" />
                      <button 
                        onClick={(e) => deleteGeneration(gen.id, e)}
                        className="absolute top-1 right-1 p-1 bg-white/80 backdrop-blur rounded-md opacity-0 group-hover/item:opacity-100 hover:text-red-500 transition-all shadow-sm"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </motion.div>
                 ))}
              </div>
           </ScrollArea>

           {activeGeneration && (
             <div className="p-4 border-t border-zinc-100 space-y-4 bg-zinc-50/50">
               <div className="space-y-1">
                 <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Prompt utilizado</div>
                 <p className="text-[11px] leading-relaxed line-clamp-4 text-zinc-600">
                   {activeGeneration.prompt}
                 </p>
               </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[9px] h-5 rounded-full border-zinc-200 bg-white font-mono uppercase tracking-tighter">
                    {activeGeneration.style}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-zinc-400 hover:text-zinc-900"
                    onClick={() => copyPrompt(activeGeneration.prompt)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
