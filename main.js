require("dotenv").config();
var Imap = require("node-imap"),
  inspect = require("util").inspect;
const { Configuration, OpenAIApi } = require("openai");
const simpleParser = require('mailparser').simpleParser;


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

imap.once("ready", function () {
  openInbox(function (err, box) {
    if (err) throw err;
    var f = imap.seq.fetch((box.messages.total) + ":*", {
      bodies: ["HEADER.FIELDS (FROM)", "TEXT"],
    });
    f.on("message", function (msg, seqno) {
      console.log("Message #%d を処理しています。", seqno);
      var prefix = '(#' + seqno + ') ';

      msg.on("body", function (stream, info) {
        var buffer = "",
          count = 0;

        stream.on("data", function (chunk) {
          count += chunk.length;
          buffer += chunk.toString("utf8");
        });

        stream.once("end", async function () {
            // console.log(info.which, buffer
                
            //     )
          if(info.which === "TEXT"){
            let data = await simpleParser(buffer);

            completion = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages: [
                {
                    role: "system",
                    content:
                    "受け取ったメールの文章を、箇条書きにして簡単に要約してください。提出物や返信が必要そうなものについては、強調して記述してください。",
                },
                {
                    role: "user",
                    content: data.text,
                },
                ],
            });
            console.log(completion.data.choices[0].message.content);

            }else{
                console.log('Parsed header: %s', inspect(Imap.parseHeader(buffer)));
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
