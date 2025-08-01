# AGENTS.md

## 🛠️ Build/Lint/Test Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (API + client) |
| `npm run build` | Build for production |
| `npm run check` | Type checking with TypeScript |
| `npm run db:push` | Push schema changes to database |
| **Testing** | No test framework detected - use `npm run check` for type validation |

## 🎨 Code Style Guidelines

### **Language & Framework**
- **TypeScript**: Strict mode enabled, ESNext modules
- **React**: Functional components with hooks, no class components

### **Imports & Structure**
- **Import aliases**: 
  - `@/*` → client/src
  - `@shared/*` → shared code
- **File Structure**: 
  - Colocate related files
  - Use `index.ts` for exports

### **Naming Conventions**
- **Components**: `PascalCase`
- **Functions/Variables**: `camelCase`

### **Styling & Formatting**
- **CSS**: Tailwind CSS with class-variance-authority for components
- **Formatting**: Follow existing patterns, no trailing semicolons
- **Error Handling**: Use try-catch with proper TypeScript error types

---
