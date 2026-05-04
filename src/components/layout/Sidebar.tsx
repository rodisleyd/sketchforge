import { useState, useEffect } from 'react';
import { Project } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Plus, Folder, Trash2, Library, Layers, Palette, Bookmark } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { LIBRARY_DATA, LibraryPack } from '../../lib/libraryData';
import * as React from 'react';

interface SidebarProps {
  activeProject: Project | null;
  onProjectSelect: (project: Project | null) => void;
  onLibrarySelect: (pack: LibraryPack) => void;
  userId: string;
}

export function Sidebar({ activeProject, onProjectSelect, onLibrarySelect, userId }: SidebarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'projects'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs: Project[] = [];
      snapshot.forEach((doc) => {
        projs.push({ id: doc.id, ...doc.data() } as Project);
      });
      setProjects(projs.sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'projects');
    });

    return unsubscribe;
  }, [userId]);

  const handleCreateProject = async () => {
    if (!projectName.trim()) return;
    try {
      const docRef = await addDoc(collection(db, 'projects'), {
        name: projectName,
        userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setProjectName('');
      setIsCreating(false);
      toast.success("Projeto criado!");
    } catch (error) {
      toast.error("Erro ao criar projeto");
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir este projeto e todas as gerações?")) return;
    try {
      // Cleanup subcollections first
      const refsQ = query(collection(db, 'projects', id, 'references'));
      const gensQ = query(collection(db, 'projects', id, 'generations'));
      
      const [refsSnap, gensSnap] = await Promise.all([getDocs(refsQ), getDocs(gensQ)]);
      
      const deletePromises: Promise<void>[] = [];
      refsSnap.forEach(d => deletePromises.push(deleteDoc(doc(db, 'projects', id, 'references', d.id))));
      gensSnap.forEach(d => deletePromises.push(deleteDoc(doc(db, 'projects', id, 'generations', d.id))));
      
      await Promise.all(deletePromises);
      await deleteDoc(doc(db, 'projects', id));
      
      if (activeProject?.id === id) onProjectSelect(null);
      toast.success("Projeto e dados excluídos");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir projeto e seus dados");
    }
  };

  return (
    <aside className="w-72 border-r border-zinc-100 flex flex-col h-full bg-white z-20">
      <div className="p-6">
        <div className="mb-8 px-1">
           <img src="/LOGOTIPO.png" alt="SketchForge" className="h-10 w-auto object-contain" />
        </div>

        <Button 
          onClick={() => setIsCreating(true)}
          className="w-full bg-zinc-900 text-white hover:bg-zinc-800 rounded-xl py-5 transition-all shadow-lg shadow-zinc-100"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-4">
        <div className="space-y-6">
          <AnimatePresence>
            {isCreating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden px-2"
              >
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 space-y-3">
                  <input
                    autoFocus
                    placeholder="Nome do projeto..."
                    className="w-full bg-transparent outline-none text-sm font-medium"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateProject} className="flex-1 bg-zinc-900 h-8">Criar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)} className="h-8">Cancelar</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
             <div className="px-2 mb-3 text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                <Folder className="w-3 h-3" />
                Projetos
             </div>
             <div className="space-y-1">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => onProjectSelect(project)}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border border-transparent",
                      activeProject?.id === project.id 
                        ? "bg-zinc-900 text-white shadow-xl shadow-zinc-200" 
                        : "hover:bg-zinc-50 text-zinc-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full transition-all",
                        activeProject?.id === project.id ? "bg-orange-400" : "bg-zinc-200 group-hover:bg-zinc-400"
                      )} />
                      <span className="text-sm font-medium truncate max-w-[140px]">{project.name}</span>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteProject(project.id, e)}
                      className={cn(
                        "opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all",
                        activeProject?.id === project.id && "group-hover:text-red-400"
                      )}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
             </div>
          </div>

          <div>
             <div className="px-2 mb-3 text-[10px] uppercase font-bold tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                <Library className="w-3 h-3" />
                Bibliotecas
             </div>
             <div className="space-y-1">
                {LIBRARY_DATA.map((pack) => (
                  <div 
                    key={pack.id}
                    onClick={() => onLibrarySelect(pack)}
                    className="flex items-center justify-between p-2 px-3 rounded-xl hover:bg-zinc-50 cursor-pointer group transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                       <div className={cn("w-1.5 h-1.5 rounded-full", pack.color)} />
                       <span className="text-xs font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">{pack.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">{pack.tag}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-6 border-t border-zinc-100 mt-auto bg-zinc-50/50">
          <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center shrink-0">
                  <Palette className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="min-w-0">
                   <div className="text-xs font-semibold text-zinc-900 truncate">Vibe Artística</div>
                   <div className="text-[10px] text-zinc-500 font-mono tracking-tighter">SKETCHFORGE-V1</div>
                </div>
             </div>
          </div>
      </div>
    </aside>
  );
}
