// Vitest não passa pelo bundler do Next.js, que é quem normalmente troca
// "server-only" por um módulo vazio em compilações de servidor — sem isto,
// importar (mesmo indiretamente) qualquer ficheiro com "import server-only"
// falha nos testes. Ver vitest.config.ts (resolve.alias).
export {};
