require("dotenv").config();
var Imap = require("node-imap"),
  inspect = require("util").inspect;
const simpleParser = require('mailparser').simpleParser;
const fs = require('fs');
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
var imap = new Imap({
  user: process.env.MAIL_USER,
  password: process.env.MAIL_PASSWORD,
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  tls: true,
});

function openInbox(cb) {
  imap.openBox("INBOX", true, cb);
}

function getLastMail(box){
    if(fs.existsSync('./lastMail'))
        return parseInt(fs.readFileSync('./lastMail').toString())
    else
        return box.messages.total;
}

function saveLastMail(box){
    fs.writeFileSync('./lastMail', ''+(box.messages.total+1))
}

imap.once("ready", function () {
  openInbox(function (err, box) {
    if (err) throw err;

    var f = imap.seq.fetch(getLastMail(box) + ":*", {
      bodies: ["HEADER.FIELDS (FROM)", "TEXT"],
    });
    f.on("message", function (msg, seqno) {
      console.log("Message #%d を処理しています。", seqno);
      let prefix = '(#' + seqno + ') ';

      msg.on("body", function (stream, info) {
        let buffer = "",
          count = 0;

        stream.on("data", function (chunk) {
          count += chunk.length;
          buffer += chunk.toString("utf8");
        });

        stream.once("end", async function () {
          if(info.which === "TEXT"){
            let data = await simpleParser(buffer);

            // completion = await openai.createChatCompletion({
            //     model: "gpt-3.5-turbo",
            //     messages: [
            //     {
            //         role: "system",
            //         content: system_param,
            //     },
            //     {
            //         role: "user",
            //         content: data.text,
            //     },
            //     ],
            // });
            // console.log(completion.data.choices[0].message.content);

            }else{
                console.log('Parsed header: %s', Imap.parseHeader(buffer).from);
            }
        });
      });
      msg.once("end", function () {
        
        console.log(prefix + "Finished");
      });
    });
    f.once("error", function (err) {
      console.log("Fetch error: " + err);
    });
    f.once("end", function () {
      console.log("Done fetching all messages!");
      saveLastMail(box);
      imap.end();
    });
  });
});

imap.once("error", function (err) {
  console.log(err);
});

imap.once("end", function () {
  console.log("Connection ended");
});

imap.connect();
