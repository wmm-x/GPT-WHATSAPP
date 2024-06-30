const botname = "GPT Whatsapp";
const chalk = require("chalk");

const   {smsg,isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, await, sleep } = require("./lib/function.js");

const { default: AnonyConnect, useSingleFileAuthState, fetchLatestBaileysVersion, generateForwardMessageContent, prepareWAMessageMedia, generateWAMessageFromContent, generateMessageID, downloadContentFromMessage, jidDecode, proto } = require("@adiwajshing/baileys")
const {
	default: makeWASocket,
	BufferJSON,
	initInMemoryKeyStore,
	DisconnectReason,
	AnyMessageContent,
        makeInMemoryStore,
	useMultiFileAuthState,
	delay
} = require("@adiwajshing/baileys")
const gptHandler = require("./gpt");
const pino = require("pino");
const store = makeInMemoryStore({
  logger: pino().child({ level: "fatal", stream: "store" }),
});

function title() {
  console.clear();
  console.log(
    chalk.yellow(
      `\n\n               ${chalk.bold.yellow(`[ ${botname} ]`)}\n\n`
    )
  );
}
async function startgpt() {
  const connectToWhatsApp = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(
      "auth_info_baileys"
    );
    const gpt = makeWASocket({
      printQRInTerminal: true,
      logger: pino({ level: "fatal" }),
      auth: state,
      browser: [`${botname}`, "Safari", "3.0"],
      getMessage: async (key) => {
        return {};
      },
    });

   
    if (store) store.bind(gpt.ev);

    gpt.decodeJid = (jid) => {
      if (!jid) return jid;
      if (/:\d+@/gi.test(jid)) {
        let decode = jidDecode(jid) || {};
        return (
          (decode.user && decode.server && decode.user + "@" + decode.server) ||
          jid
        );
      } else return jid;
    };
    title()
    gpt.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (global.qr !== qr) {
        global.qr = qr;
      }

      if (connection === "close") {
        if (
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut
        ) {
          console.log("Connection closed, reconnecting...");
          await connectToWhatsApp(); 
        } else {
          const fs = require("fs");
          console.log("Connection logged out, printing new QR code...");

          fs.rmSync("auth_info_baileys", { recursive: true, force: true });
          await connectToWhatsApp();
        }
      }

      if (connection === "open") {
        console.log(` ${chalk.hex('#42B812')(`Connecting to whatsapp successfully...`)}\n\n`);
        
      }
    });
    gpt.ev.on("creds.update", saveCreds);

    gpt.ev.on("messages.upsert", async (chatUpdate) => {
    
      try {
        mek = chatUpdate.messages[0];
        if (!mek.message) return;
        mek.message =
          Object.keys(mek.message)[0] === "ephemeralMessage"
            ? mek.message.ephemeralMessage.message
            : mek.message;
        if (mek.key && mek.key.remoteJid === "status@broadcast") return;
        if (!gpt.public && !mek.key.fromMe && chatUpdate.type === "notify")
          return;
        if (mek.key.id.startsWith("BAE5") && mek.key.id.length === 16) return;
        m = smsg(gpt, mek, store);
        require("./gpt")(gpt, m, chatUpdate, store);
      } catch (e) {
        console.log(e);
      }
    });
    gpt.public = true;
    gpt.setStatus = (status) => {
      gpt.query({
        tag: "iq",
        attrs: {
          to: "@s.whatsapp.net",
          type: "set",
          xmlns: "status",
        },
        content: [
          {
            tag: "status",
            attrs: {},
            content: Buffer.from(status, "utf-8"),
          },
        ],
      });
      return status;
    };


    return gpt;
  };

  connectToWhatsApp().catch((err) => console.log(err));
}

startgpt();
