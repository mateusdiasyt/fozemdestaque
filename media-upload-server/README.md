# Foz em Destaque Media Upload Server

Servico pequeno para rodar na VPS e gravar uploads no mesmo volume servido pelo nginx de midia.

## Variaveis

- `MEDIA_UPLOAD_TOKEN`: segredo compartilhado com o site na Vercel.
- `MEDIA_PUBLIC_BASE_URL`: URL publica do nginx, por exemplo `https://fozemdestaque-media.bohu4g.easypanel.host`.
- `UPLOAD_ROOT`: pasta de destino dentro do container. Padrao: `/media`.
- `MAX_UPLOAD_BYTES`: limite maximo por arquivo. Padrao: `104857600`.

## Endpoint

```txt
POST /upload
Authorization: Bearer <MEDIA_UPLOAD_TOKEN>
multipart/form-data:
  file: arquivo
  path: caminho relativo, ex: uploads/arquivo.webp
```
