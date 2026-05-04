import { ReferenceImage } from './types';

export interface LibraryPack {
  id: string;
  name: string;
  description: string;
  tag: string;
  color: string;
  images: Partial<ReferenceImage>[];
}

export const LIBRARY_DATA: LibraryPack[] = [
  {
    id: 'pack-01',
    name: 'Personagens',
    description: 'Anatomia e poses para personagens heróicos e fantasia.',
    tag: 'PRO',
    color: 'bg-blue-400',
    images: []
  },
  {
    id: 'pack-02',
    name: 'Cenários',
    description: 'Ambientes cyberpunk e paisagens naturais para composição.',
    tag: 'PRO',
    color: 'bg-green-400',
    images: []
  },
  {
    id: 'pack-03',
    name: 'Objetos',
    description: 'Acessórios, armas e itens de cena para detalhamento.',
    tag: 'PRO',
    color: 'bg-amber-400',
    images: []
  },
  {
    id: 'pack-04',
    name: 'Animais',
    description: 'Criaturas e animais para montarias ou companheiros.',
    tag: 'PRO',
    color: 'bg-purple-400',
    images: []
  }
];
