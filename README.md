# Joyblox (multiplayer)

Jogo 3D no navegador, com jogadores e chat em tempo real.

## Arquivos (todos na raiz do repositório, sem pastas)

- `index.html`: o jogo (cliente)
- `server.js`: servidor multiplayer
- `package.json`: dependências (express e socket.io)

## Publicar no Render

1. Envie os 4 arquivos para um repositório no GitHub.
2. No Render: New + → Web Service → escolha o repositório.
3. Build Command: `npm install`
4. Start Command: `node server.js`
5. Plano: Free. Aguarde o deploy e abra o link.

## Como funciona

- Cada mapa é uma sala (máximo de 20 jogadores).
- O servidor só retransmite posição, aparência e chat. Moedas e meteoros ainda são locais (próxima etapa).
- O chat remove links e sequências longas de números.

## Rodar no computador (opcional)

```
npm install
npm start
```

Abra http://localhost:3000
