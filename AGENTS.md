# Operação do Foz em Destaque

Este checkout é o código de produção Next.js do portal, separado do Mendoza PDV
e do checkout experimental WordPress. Não publicar mudanças deste último aqui.

- Publicação: GitHub `mateusdiasyt/fozemdestaque`, branch `main`, Dockerfile,
  serviço EasyPanel `fozemdestaque/site`, porta 3000. Commit/push das mudanças
  validadas e publicação no serviço existente; não criar outro site ou banco.
- Não rodar seed, `db:push` ou migração de dados em deploys de UI/integrações.
- DNS Squarespace, domínio público `https://www.fozemdestaque.com`. Preservar
  e-mails, TXT/DKIM/SPF, verificação Meta e redirecionamento raiz para www.
- GA4 `G-NQ03Z7NBKT` só nas páginas públicas oficiais e após consentimento.
  Não duplicar scripts/pageviews, medir admin ou expor dados de formulários.
  Recusa/revogação deve funcionar e medição não pode impedir a navegação.
- Atualizar este guia/README quando mudar publicação ou integração importante.
- Nunca versionar segredos, arquivos .env, credenciais de e-mail, banco ou VPS.
