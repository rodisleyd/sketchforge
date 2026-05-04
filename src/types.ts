export type SketchStyle = 'Cartoon' | 'Semi-realista' | 'Realista' | 'Infantil' | 'HQ (comic style)' | 'Mangá' | 'Cyberpunk' | 'Vintage';

export interface Project {
  id: string;
  name: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  description?: string;
}

export interface ReferenceImage {
  id: string;
  projectId: string;
  url: string;
  label: string;
  type: 'character' | 'environment' | 'object' | 'style';
  createdAt: number;
}

export interface Generation {
  id: string;
  projectId: string;
  prompt: string;
  fullPrompt: string;
  style: SketchStyle;
  imageUrl: string;
  createdAt: number;
  settings?: {
    contrast: number;
    texture: number;
    constructionLines: number;
  };
}
