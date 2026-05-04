import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { compressImage } from '../../lib/imageUtils';
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ReferenceUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export function ReferenceUpload({ projectId, onUploadComplete }: ReferenceUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<'character' | 'environment' | 'object' | 'animal' | 'style'>('character');

  const categories = [
    { id: 'character', label: 'Pers.', icon: '👤' },
    { id: 'environment', label: 'Cena', icon: '🖼️' },
    { id: 'object', label: 'Obj.', icon: '📦' },
    { id: 'animal', label: 'Ani.', icon: '🐾' },
    { id: 'style', label: 'Est.', icon: '🎨' },
  ];

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          try {
            const compressed = await compressImage(base64);
            await addDoc(collection(db, 'projects', projectId, 'references'), {
              projectId,
              url: compressed,
              label: file.name.split('.')[0],
              type: selectedType,
              createdAt: Date.now()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, 'references');
          }
        };
        reader.readAsDataURL(file);
      }
      toast.success(`${acceptedFiles.length} imagens enviadas!`);
      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      toast.error("Erro ao enviar imagens");
    } finally {
      setUploading(false);
    }
  }, [projectId, onUploadComplete, selectedType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true
  } as any);

  return (
    <div className="space-y-4">
      {/* Category Selector */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedType(cat.id as any)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all
              ${selectedType === cat.id 
                ? 'bg-zinc-900 text-white shadow-lg' 
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}
            `}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div 
        {...getRootProps()} 
        className={`
          border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer
          ${isDragActive ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400'}
          ${uploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        ) : (
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center">
            <Upload className="w-5 h-5 text-zinc-500" />
          </div>
        )}
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-700">Clique ou arraste imagens de referência</p>
          <p className="text-xs text-zinc-400 mt-1">Selecione uma categoria acima e envie seus arquivos</p>
        </div>
      </div>
    </div>
  );
}
