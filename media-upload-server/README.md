# Foz em Destaque Media Upload Server

Servico pequeno para rodar na VPS, receber uploads do painel admin e servir os arquivos publicamente.

## EasyPanel

Crie um aplicativo separado, por exemplo `media-upload`, apontando para este diretorio:

```txt
media-upload-server
```

Use um volume persistente montado em:

```txt
/media
```

Configure o dominio do servico para a porta interna:

```txt
3000
```

Depois teste:

```txt
https://seu-dominio-do-uploader/health
```

## Variaveis do servico na VPS

- `MEDIA_UPLOAD_TOKEN`: segredo compartilhado com o site na Vercel.
- `MEDIA_PUBLIC_BASE_URL`: URL publica deste proprio servico, sem barra final. Exemplo: `https://fozemdestaque-upload.bohu4g.easypanel.host`.
- `UPLOAD_ROOT`: pasta de destino dentro do container. Padrao: `/media`.
- `MAX_UPLOAD_BYTES`: limite maximo por arquivo. Padrao: `104857600`.

## Variaveis do site na Vercel

- `MEDIA_UPLOAD_ENDPOINT`: URL privada de upload. Exemplo: `https://fozemdestaque-upload.bohu4g.easypanel.host/upload`.
- `MEDIA_UPLOAD_TOKEN`: o mesmo segredo configurado na VPS.
- `MEDIA_PUBLIC_BASE_URL`: a URL publica do servico. Exemplo: `https://fozemdestaque-upload.bohu4g.easypanel.host`.

## Endpoint

```txt
POST /upload
Authorization: Bearer <MEDIA_UPLOAD_TOKEN>
multipart/form-data:
  file: arquivo
  path: caminho relativo, ex: uploads/arquivo.webp
```

Arquivos gravados ficam acessiveis publicamente no mesmo caminho:

```txt
GET /uploads/arquivo.webp
```
