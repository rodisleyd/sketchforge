# Security Specification - SketchForge

## Data Invariants
1. Um projeto pertence a um único usuário e não pode ser movido entre usuários.
2. Referências e Gerações devem estar sempre vinculadas a um projeto existente.
3. Apenas o proprietário do projeto pode visualizar, criar ou excluir dados dentro dele.

## The "Dirty Dozen" Payloads
1. Criar projeto para outro `userId`.
2. Criar referência em projeto que não me pertence.
3. Tentar ler gerações da coleção raiz (sem `projectId`).
4. Injetar campo `isAdmin` em perfil de usuário (se existir).
5. Tentar excluir projeto de outro usuário via ID direto.
6. Enviar string de 1MB no campo `prompt`.
7. Enviar imagem sem `projectId` válido.
8. Tentar atualizar `createdAt` de uma geração.
9. Tentar listar gerações de todos os usuários.
10. Injetar caracteres maliciosos em nomes de projetos.
11. Tentar ler referências de um projeto sem estar autenticado.
12. Tentar atualizar o dono de um projeto (`userId`).

## Rules Logic
- `isValidProject`: Check size and required fields.
- `isValidId`: Regex validation.
- `isOwner`: Verify `request.auth.uid == resource.data.userId`.
