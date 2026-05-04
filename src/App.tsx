import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { auth } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { SketchEditor } from './components/editor/SketchEditor';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Project } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Palette } from 'lucide-react';
import { LibraryDialog } from './components/ui/LibraryDialog';
import { LibraryPack } from './lib/libraryData';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [activeLibraryPack, setActiveLibraryPack] = useState<LibraryPack | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro no login:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FDFCFB]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-zinc-400" />
        </motion.div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#FDFCFB] text-zinc-900 font-sans selection:bg-orange-100">
        {!user ? (
          <div className="h-screen flex flex-col items-center justify-center space-y-8 px-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-4"
            >
              <div className="flex justify-center">
                 <img src="/LOGOTIPO.png" alt="SketchForge Logo" className="h-24 w-auto mb-4" />
              </div>
              <h1 className="sr-only">SketchForge</h1>
              <p className="text-zinc-500 max-w-md mx-auto text-lg leading-relaxed">
                A ferramenta definitiva para artistas e ilustradores criarem esboços consistentes usando IA.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Button 
                onClick={handleLogin}
                size="lg"
                className="bg-zinc-900 text-white hover:bg-zinc-800 rounded-full px-8 py-6 text-lg transition-all active:scale-95"
              >
                Começar com Google
              </Button>
            </motion.div>
          </div>
        ) : (
          <div className="flex h-screen overflow-hidden">
            <Sidebar 
              activeProject={activeProject} 
              onProjectSelect={setActiveProject} 
              onLibrarySelect={setActiveLibraryPack}
              userId={user.uid}
            />
            <div className="flex-1 flex flex-col relative h-full overflow-hidden">
              <Header user={user} />
              <main className="flex-1 flex flex-col overflow-hidden min-h-0">
                <AnimatePresence mode="wait">
                  {activeProject ? (
                    <motion.div
                      key={activeProject.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex-1 flex flex-col min-h-0"
                    >
                      <SketchEditor project={activeProject} />
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="no-project"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex items-center justify-center text-zinc-400 p-12 text-center"
                    >
                      <div className="max-w-sm space-y-4">
                        <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-zinc-100">
                           <img src="/iconeapp.png" alt="SketchForge" className="w-8 h-8 opacity-50 grayscale" />
                        </div>
                        <h2 className="text-xl font-medium text-zinc-600">Selecione ou crie um projeto</h2>
                        <p className="text-sm leading-relaxed">
                          Seus projetos artísticos e bibliotecas de referências aparecerão aqui. Comece um novo projeto para rascunhar.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </main>
            </div>
          </div>
        )}
        <Toaster position="bottom-right" richColors />
        <LibraryDialog 
          pack={activeLibraryPack} 
          onClose={() => setActiveLibraryPack(null)} 
          activeProjectId={activeProject?.id || null}
        />
      </div>
    </TooltipProvider>
  );
}

