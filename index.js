const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys'); 
const { Boom } = require('@hapi/boom'); 
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');
const menu = require('./menu.js'); 
const settings = require('./settings.json');
const numerodono = [`${settings.NumeroDoDono}@s.whatsapp.net`];
const prefix = settings.prefix;
global.owner = ['558688559115@s.whatsapp.net'];
let grupos = {};
let pvpDesafios = {};
let usuarios = JSON.parse(fs.readFileSync('usuarios.json', 'utf8') || '{}');
const logger = { 
  info: () => {}, 
  warn: () => {}, 
  error: (error) => { 
    if (error) return; 
    console.error(error); 
  }, 
  trace: () => {}, 
  debug: () => {}, 
  child: () => logger, 
}; 

const db = {
  data: {
    chats: {}
  }
};

async function connectToWhatsApp() { 
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys'); 
  const sock = makeWASocket({ 
    auth: state, 
    logger, 
  }); 

sock.ev.on('connection.update', (update) => {
  const { connection, qr } = update;
  if (qr) {
    qrcode.generate(qr, { small: true });
  }
  if (connection === 'open') {
    console.log('Conexão com Killua Bot estabelecida com sucesso 🩵!');
  }
  if (connection === 'close') {
    if (update.lastDisconnect.error instanceof Boom && update.lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
      connectToWhatsApp();
    } else {
      console.log('Killua Bot desconectado ⚠️!');
    }
  }
});


  sock.ev.on('creds.update', saveCreds); 

sock.ev.on('messages.upsert', async (m) => {
  const msg = m.messages[0];
  if (msg.message) {
    const msgBody = msg.message.conversation || msg.message.extendedTextMessage?.text;
    const pushName = msg.pushName || 'Desconhecido';
    const chatType = msg.key.remoteJid.includes('@g.us') ? 'Grupo' : 'Privado';
    console.log(`╭━°𖠁°✮•| •.:° ❃ °:.• |•✮°𖠁°━╮`);
    console.log(`┃🩵Usuario: ${pushName}`);
    console.log(`┃🩵Tipo: ${chatType}`);
    console.log(`┃🩵Mensagem: ${msgBody}`);
    console.log(`╰━°𖠁°✮•| •.:° ❃ °:.• |•✮°𖠁°━╯`);
    const msgBodyLower = msgBody?.toLowerCase();
  if (msgBodyLower && msgBodyLower === 'prefixo') {
  await sock.sendMessage(msg.key.remoteJid, { text: `*Oii ${msg.pushName}! Aqui está meu Prefixo para usar meus comandos: [ ${settings.prefix} ] 🩵*`, mentions: [msg.key.participant || msg.key.remoteJid] });
  return;
}
    if (msgBodyLower?.startsWith(prefix)) {
      try {
    const gruposBanidos = JSON.parse(fs.readFileSync('./gruposBanidos.json', 'utf8'));
    if (gruposBanidos.includes(msg.key.remoteJid) && !msg.key.fromMe) {
      return;
    }
  } catch (error) {
    console.error('Erro ao ler arquivo de grupos banidos:', error);
  }
      const args = msgBodyLower.slice(prefix.length).trim().split(/ +/);
      const command = args.shift().toLowerCase();

switch (command) {
case 'menu':
case 'm':
  const menuMessage = menu(settings.NomeDoBot, settings.prefix, settings.NomeDoDono);
  await sock.sendMessage(msg.key.remoteJid, {
    image: { url: 'https://files.catbox.moe/2ldkk8.jpg' },           
    caption: menuMessage,
    mentions: [msg.key.participant],
    contextInfo: {
      isForwarded: true,
      forwardingScore: 999,
      externalAdReply: {
        title: 'KilluaBot-MD',
        sourceUrl: 'https://whatsapp.com/channel/0029Vb9u9E5GZNCuNwiw5i0C',
        mediaType: 1,
        renderLargerThumbnail: false,
        thumbnailUrl: 'https://files.catbox.moe/2ldkk8.jpg'
      }
    }
     [
      {
        buttonId: 'acessar_canal',
        buttonText: { displayText: 'Acessar Canal' },
        type: 1
      }
    ],
    headerType: 4
   });
  break;
  case 'ban':
  case 'b':
    if (!msg.key.fromMe) return;
    if (!msg.message.extendedTextMessage) return sock.sendMessage(msg.key.remoteJid, { text: 'Marque alguém para banir' });
    const mentioned = msg.message.extendedTextMessage.contextInfo.mentionedJid;
    if (!mentioned) return sock.sendMessage(msg.key.remoteJid, { text: 'Marque alguém para banir' });
    await sock.groupParticipantsUpdate(msg.key.remoteJid, mentioned, "remove");
    sock.sendMessage(msg.key.remoteJid, { text: `@${mentioned[0].split('@')[0]} Foi banido do grupo com sucesso! *por motivos justos*`, mentions: mentioned });
    break;
case 'cita':
  if (!msg.key.remoteJid.includes('@g.us')) return;
  if (!global.owner.includes(msg.key.participant) && !msg.key.fromMe && !global.owner.includes(msg.key.remoteJid)) return;

  try {
    const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
    const mentionedJid = groupMetadata.participants.map(p => p.id);

    // Proteção contra loop ao responder mensagens
    let textoFinal = '';
    if (msg.message?.conversation) {
      textoFinal = msg.message.conversation;
    } else if (msg.message?.extendedTextMessage?.text && !msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      textoFinal = msg.message.extendedTextMessage.text;
    } else {
      textoFinal = '';
    }

    // Remove o prefixo do texto
    if (textoFinal.toLowerCase().startsWith(prefix + 'cita')) {
      textoFinal = textoFinal.slice((prefix + 'cita').length).trim();
    }

    // Evita texto vazio
    if (textoFinal.length === 0) {
      textoFinal = '📢';
    }

    await sock.sendMessage(msg.key.remoteJid, {
      text: textoFinal,
      mentions: mentionedJid
    });

  } catch (error) {
    console.error('❌ Erro ao executar o comando totag:', error);
    await sock.sendMessage(msg.key.remoteJid, {
      text: '❌ Erro ao mencionar todos. Verifique se o bot é admin.'
    });
  }
  break;
case 'totag':
  if (!msg.key.remoteJid.includes('@g.us')) return;
  if (!global.owner.includes(msg.key.participant) && !msg.key.fromMe && !global.owner.includes(msg.key.remoteJid)) return;

  try {
    const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
    const mentionedJid = groupMetadata.participants.map(p => p.id);

    // Proteção contra loop ao responder mensagens
    let textoFinal = '';
    if (msg.message?.conversation) {
      textoFinal = msg.message.conversation;
    } else if (msg.message?.extendedTextMessage?.text && !msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      textoFinal = msg.message.extendedTextMessage.text;
    } else {
      textoFinal = '';
    }

    // Remove o prefixo do texto
    if (textoFinal.toLowerCase().startsWith(prefix + 'totag')) {
      textoFinal = textoFinal.slice((prefix + 'totag').length).trim();
    }

    // Evita texto vazio
    if (textoFinal.length === 0) {
      textoFinal = '📢';
    }

    await sock.sendMessage(msg.key.remoteJid, {
      text: textoFinal,
      mentions: mentionedJid
    });

  } catch (error) {
    console.error('❌ Erro ao executar o comando totag:', error);
    await sock.sendMessage(msg.key.remoteJid, {
      text: '❌ Erro ao mencionar todos. Verifique se o bot é admin.'
    });
  }
  break;
case 'deletar':
case 'delete':
case 'del':
case 'd':
  console.log('🔍 Iniciando comando deletar...');

  if (!msg.message) {
    console.log('❌ Nenhuma mensagem detectada.');
    return sock.sendMessage(msg.key.remoteJid, { text: '❌ Nenhuma mensagem detectada.' });
  }

  const contexto = msg.message.extendedTextMessage?.contextInfo;
  if (!contexto) {
    console.log('❌ A mensagem não é uma resposta (reply).');
    return sock.sendMessage(msg.key.remoteJid, { text: '❌ Use este comando respondendo (marcando) a mensagem que deseja apagar.' });
  }

  const stanzaId = contexto.stanzaId;
  const participant = contexto.participant;

  if (!stanzaId) {
    console.log('❌ stanzaId ausente.');
    return sock.sendMessage(msg.key.remoteJid, { text: '❌ ID da mensagem não encontrado (stanzaId).' });
  }

  if (!participant) {
    console.log('❌ participant ausente.');
    return sock.sendMessage(msg.key.remoteJid, { text: '❌ Não foi possível identificar o autor da mensagem marcada.' });
  }

  // 🔎 Exibir tudo que foi coletado
  console.log('📄 remoteJid:', msg.key.remoteJid);
  console.log('🧾 stanzaId:', stanzaId);
  console.log('👤 participant:', participant);
  console.log('🧠 contextInfo:', JSON.stringify(contexto, null, 2));

  try {
    await sock.sendMessage(msg.key.remoteJid, {
      delete: {
        remoteJid: msg.key.remoteJid,
        fromMe: false,
        id: stanzaId,
        participant: participant
      }
    });


  } catch (err) {
    console.log('❌ Exceção capturada no try/catch.');
    console.error('Erro detalhado:', err);

    await sock.sendMessage(msg.key.remoteJid, {
      text: '❌ Erro ao tentar apagar. Veja o terminal para mais detalhes.'
    });
  }
  break;

  case 'totag':
  if (!msg.key.remoteJid.includes('@g.us')) return;
  if (!global.owner.includes(msg.key.participant) && !msg.key.fromMe && !global.owner.includes(msg.key.remoteJid)) return;

  try {
    const mentionedJid = [];
    const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
    groupMetadata.participants.forEach((participant) => {
      mentionedJid.push(participant.id);
    });

    const args = msgBodyLower.replace(prefix + 'totag', '').trim();
    if (args.length === 0) {
      await sock.sendMessage(msg.key.remoteJid, { text: '', mentions: mentionedJid });
    } else {
      await sock.sendMessage(msg.key.remoteJid, { text: args, mentions: mentionedJid });
    }
  } catch (error) {
    console.error(error);
  }
  break;
case 'comer':
  if (!msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0]) {
    await sock.sendMessage(msg.key.remoteJid, { text: 'Marque alguém pra comer! 😏 Exemplo: ${prefix}comer @xuser ' }, { quoted: msg });
    break;
  }

  const quemUsou = msg.participant || msg.key.participant || msg.key.remoteJid;
  const quemFoiMarcado = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];

  await sock.sendMessage(msg.key.remoteJid, {
    video: { url: 'https://files.catbox.moe/hgdw8a.mp4' },
    gifPlayback: true ,
    caption: `O @${quemUsou.split('@')[0]} acaba de comer gostosinho o @${quemFoiMarcado.split('@')[0]} 🥵`,
    mentions: [quemUsou, quemFoiMarcado]
  }, { quoted: msg });
  break;
  case 'criador':
    const criador = { displayName: 'ɢᴀʙᴇ', vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;${'Biel'};;;\nFN:${'Bi'}\nTEL;type=CELL;type=VOICE;waid=5586988559115:+55 86 98855-9115\nX-WA-BIZ-NAME:${'Biel'}\nEND:VCARD` };
    sock.sendMessage(msg.key.remoteJid, { contacts: { displayName: criador.displayName, contacts: [criador] } });
    break;
  case 'bug':
    if (args.length === 0) return sock.sendMessage(msg.key.remoteJid, { text: 'Insira o texto do bug que deseja reportar pro meu criador 💗' });
    const bugText = args.join(' ');
    const bugMessage = `┏━━━━━━━━━━━━━━━━━━━━┓\n┃Usuario: ${msg.pushName}\n┃Bug: ${bugText}\n┗━━━━━━━━━━━━━━━━━━━━┛`;
    sock.sendMessage('5586988559115@s.whatsapp.net', { text: bugMessage });
    sock.sendMessage(msg.key.remoteJid, { text: 'Bug reportado com sucesso! Obrigado por ajudar a melhorar o Killua Bot' });
    break;
   case 'minerar':
  const sorte = Math.random();
  if (sorte < 0.7) {
    if (!users[msg.key.remoteJid]) users[msg.key.remoteJid] = { golds: 0, Comida: 0, pocaoCura: 0 };
    users[msg.key.remoteJid].golds += goldsGanho;
    const goldsGanho = Math.floor(Math.random() * 10) + 1;
    users[msg.key.remoteJid].golds += goldsGanho;
    sock.sendMessage(msg.key.remoteJid, { text: `Você minerou e encontrou ${goldsGanho} golds!` });
  } else if (sorte < 0.95) {
    if (users[msg.key.remoteJid].picareta) {
      const ferroGanho = Math.floor(Math.random() * 5) + 1;
      users[msg.key.remoteJid].ferro += ferroGanho;
      users[msg.key.remoteJid].picareta.durabilidade -= 2;
      if (users[msg.key.remoteJid].picareta.durabilidade <= 0) {
        delete users[msg.key.remoteJid].picareta;
        sock.sendMessage(msg.key.remoteJid, { text: 'Sua picareta quebrou!' });
      }
      sock.sendMessage(msg.key.remoteJid, { text: `Você minerou e encontrou ${ferroGanho} ferros!` });
    } else {
      sock.sendMessage(msg.key.remoteJid, { text: 'Você precisa de uma picareta para minerar ferro!' });
    }
  } else {
    if (users[msg.key.remoteJid].picareta && users[msg.key.remoteJid].picareta.durabilidade > 5) {
      const diamanteGanho = Math.floor(Math.random() * 2) + 1;
      users[msg.key.remoteJid].diamante += diamanteGanho;
      users[msg.key.remoteJid].picareta.durabilidade -= 5;
      if (users[msg.key.remoteJid].picareta.durabilidade <= 0) {
        delete users[msg.key.remoteJid].picareta;
        sock.sendMessage(msg.key.remoteJid, { text: 'Sua picareta quebrou!' });
      }
      sock.sendMessage(msg.key.remoteJid, { text: `Você minerou e encontrou ${diamanteGanho} diamantes!` });
    } else {
      sock.sendMessage(msg.key.remoteJid, { text: 'Você precisa de uma picareta com durabilidade suficiente para minerar diamantes!' });
    }
  }
  break;
  const perfil = `🖋️Nome: ${nome}\n🥇Golds: ${golds}\n⚒️Picareta: ${picaretaDurabilidade}`;
  sock.sendMessage(msg.key.remoteJid, { text: perfil });
  break;
case 'gerarlink':
  sock.sendMessage(msg.key.remoteJid, { text: 'Gerando seu link, aguarde...🩵 ' });
  let media;
if (m.quoted) {
  media = await downloadMediaMessage(m.quoted);
} else if (m.message) {
  if (m.message.imageMessage) {
    media = await downloadMediaMessage(m);
  } else if (m.message.videoMessage) {
    media = await downloadMediaMessage(m);
  } else if (m.message.stickerMessage) {
    media = await downloadMediaMessage(m);
  } else {
    return sock.sendMessage(msg.key.remoteJid, { text: 'Você precisa enviar ou marcar uma mídia!' });
  }
}
  const axios = require('axios');
  const fs = require('fs');
  const FormData = require('form-data');
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', media);
  axios.post('https://catbox.moe/user/api.php', form, {
    headers: form.getHeaders()
  })
  .then(response => {
    sock.sendMessage(msg.key.remoteJid, { text: response.data });
  })
  .catch(error => {
    console.error(error);
  });
  break;
  case 'pvp':
  if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: 'Esse comando só funciona em grupos' });
  const mentionedPvp = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
  if (!mentionedPvp) return sock.sendMessage(msg.key.remoteJid, { text: 'Marque alguém para desafiar' });
  const desafiado = mentionedPvp[0];
  const desafiante = msg.key.participant;
  if (desafiado === desafiante) return sock.sendMessage(msg.key.remoteJid, { text: 'Você não pode desafiar a si mesmo' });
  sock.sendMessage(msg.key.remoteJid, { text: `@${desafiante.split('@')[0]} desafiou @${desafiado.split('@')[0]} para um pvp!`, mentions: [desafiante, desafiado] });
  pvpDesafios[desafiado] = { desafiante };
  break;
   case 'aceitar':
  if (!pvpDesafios[msg.key.participant]) return sock.sendMessage(msg.key.remoteJid, { text: '*Você não foi desafiado para um PVP*!' });
  const desafianteAceitar = pvpDesafios[msg.key.participant].desafiante;
  const resultadoPvp = Math.random() < 0.5 ? desafianteAceitar : msg.key.participant;
  sock.sendMessage(msg.key.remoteJid, { text: `@${resultadoPvp.split('@')[0]} ganhou o pvp!`, mentions: [resultadoPvp] });
  delete pvpDesafios[msg.key.participant];
  break;

  case 'recusar':
  if (!pvpDesafios[msg.key.participant]) return sock.sendMessage(msg.key.remoteJid, { text: 'Você não foi desafiado para um pvp' });
  const desafianteRecusar = pvpDesafios[msg.key.participant].desafiante;
  sock.sendMessage(msg.key.remoteJid, { text: `@${msg.key.participant.split('@')[0]} recusou o pvp de @${desafianteRecusar.split('@')[0]}`, mentions: [desafianteRecusar, msg.key.participant] });
  delete pvpDesafios[msg.key.participant];
  break;
default:
  await sock.sendMessage(msg.key.remoteJid, {
    text: `╭━°𖠁°✮•| ◆ ❃ ◆ |•✮°𖠁°━╮\n┃ ➪ 𝐂omαndo: ${msgBody}\n┃ ➪ 𝐍α̃o 𝐈dentificαdo\n┃ ➪ 𝐔se *${settings.prefix}menu*\n┃ ➪ 𝐄 𝐕ejα 𝐎s 𝐂omαndos\n╰━°𖠁°✮•| ◆ ❃ ◆ |•✮°𖠁°━╯`,
    mentions: [msg.key.participant]
  }, { quoted: msg });
  break;
        }
      }
    }
  });
}

connectToWhatsApp();