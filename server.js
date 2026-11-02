// Joyblox - servidor multiplayer (Node.js + Express + Socket.IO)
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 2e4, pingTimeout: 20000 });
const PORT = process.env.PORT || 3000;

const MAPS = new Set(['coins', 'nd', 'obby', 'obby2', 'obby3']);
const MAX_ROOM = 20; // jogadores por sala (mapa)
const COLOR = /^#[0-9a-f]{6}$/i;

const players = new Map(); // socket.id -> jogador

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (req, res) => res.send('ok'));

/* ---------- validações: nunca confie no que vem do cliente ---------- */
const num = (v, min, max, d = 0) => {
  v = Number(v);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
};
const pick = (v, list, d) => (list.includes(String(v)) ? String(v) : d);
const col = (v, d) => (typeof v === 'string' && COLOR.test(v) ? v : d);
function cleanName(n) {
  n = String(n || '').replace(/[^\p{L}\p{N}_ ]/gu, '').trim().slice(0, 12);
  return n || 'Jogador';
}
// Remove links e números longos (telefones) para proteger os jogadores
function cleanChat(t) {
  return String(t || '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .replace(/(https?:\/\/|www\.)\S+/gi, '###')
    .replace(/\d[\d\s.\-]{6,}\d/g, '###')
    .trim()
    .slice(0, 120);
}
const pub = p => ({
  id: p.id, name: p.name, h: p.h, t: p.t, l: p.l,
  hat: p.hat, face: p.face, back: p.back,
  x: p.x, y: p.y, z: p.z, ry: p.ry,
});
const roomOf = map => 'm:' + map;
const countIn = map => [...players.values()].filter(p => p.map === map).length;

function leave(socket) {
  const p = players.get(socket.id);
  if (!p) return;
  players.delete(socket.id);
  socket.leave(roomOf(p.map));
  io.to(roomOf(p.map)).emit('left', { id: p.id, count: countIn(p.map) });
}

io.on('connection', socket => {
  socket.on('join', d => {
    if (!d || typeof d !== 'object') return;
    const map = String(d.map);
    if (!MAPS.has(map)) return;
    leave(socket);
    if (countIn(map) >= MAX_ROOM) {
      socket.emit('full');
      return;
    }
    const p = {
      id: socket.id, map,
      name: cleanName(d.name),
      h: col(d.h, '#f5cd30'), t: col(d.t, '#e2231a'), l: col(d.l, '#2c4ea5'),
      hat: pick(d.hat, ['0', '1', '2', '3', '4', '5'], '0'),
      face: pick(d.face, ['0', '1', '2'], '0'),
      back: pick(d.back, ['0', '1', '2', '3'], '0'),
      x: num(d.x, -100, 100), y: num(d.y, -10, 100), z: num(d.z, -100, 100), ry: 0,
      lastS: 0, lastC: 0,
    };
    players.set(socket.id, p);
    socket.join(roomOf(map));
    const others = [...players.values()].filter(q => q.map === map && q.id !== p.id).map(pub);
    const count = others.length + 1;
    socket.emit('init', { players: others, count });
    socket.to(roomOf(map)).emit('joined', Object.assign(pub(p), { count }));
  });

  socket.on('state', d => {
    const p = players.get(socket.id);
    if (!p || !d) return;
    const now = Date.now();
    if (now - p.lastS < 40) return; // no máximo ~25 atualizações/s
    p.lastS = now;
    p.x = num(d.x, -100, 100, p.x);
    p.y = num(d.y, -10, 100, p.y);
    p.z = num(d.z, -100, 100, p.z);
    p.ry = num(d.ry, -10, 10, p.ry);
    socket.to(roomOf(p.map)).volatile.emit('s', { id: p.id, x: p.x, y: p.y, z: p.z, ry: p.ry });
  });

  socket.on('chat', text => {
    const p = players.get(socket.id);
    if (!p) return;
    const now = Date.now();
    if (now - p.lastC < 1200) return; // anti-spam
    const msg = cleanChat(text);
    if (!msg) return;
    p.lastC = now;
    io.to(roomOf(p.map)).emit('chat', { name: p.name, text: msg });
  });

  socket.on('leave', () => leave(socket));
  socket.on('disconnect', () => leave(socket));
});

server.listen(PORT, () => console.log('Joyblox rodando na porta ' + PORT));
