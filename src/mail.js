import Imap from "node-imap";
import { simpleParser } from "mailparser";
import fs from "fs";
import { promisify } from "util";

var imap = new Imap({
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    tls: true,
});
imap.openBox = promisify(imap.openBox);


function getLastMail(box) {
    if (fs.existsSync("./lastMail"))
        return parseInt(fs.readFileSync("./lastMail").toString());
    else return box.messages.total;
}

function saveLastMail(box) {
    fs.writeFileSync("./lastMail", "" + (box.messages.total + 1));
}

// TODO: ネストを治したい
export function getMails() {
    return new Promise((resolve, reject) => {
        imap.once("ready", async () => {
            let box = await imap.openBox("INBOX", true);
            
            var f = imap.seq.fetch(getLastMail(box) + ":*", {
                bodies: ["HEADER.FIELDS (FROM)", "TEXT"],
            });
            f.on("message", (msg, seqno) => {
                console.log("Message #%d を処理しています。", seqno);
                let prefix = "(#" + seqno + ") ";

                msg.on("body", (stream, info) => {
                    let buffer = "";

                    stream.on("data", chunk => {
                        buffer += chunk.toString("utf8");
                    });

                    stream.once("end", async () => {
                        if (info.which === "TEXT") {
                            let data = await simpleParser(buffer);
                        } else {
                            console.log("Parsed header: %s", Imap.parseHeader(buffer).from);
                        }
                    });
                });
                msg.once("end", () => {
                    console.log(prefix + "Finished");
                });
            });
            f.once("error", err => {
                console.log("Fetch error: " + err);
                reject(err);
            });
            f.once("end", () => {
                console.log("Done fetching all messages!");
                saveLastMail(box);
                imap.end();
            });
        });

        imap.once("error", err => {
            console.log(err);
            reject(err);
        });

        imap.once("end", () => {
            console.log("Connection ended");
        });

        imap.connect();
    });
}
