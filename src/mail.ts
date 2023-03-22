import "dotenv/config";
import Imap from "node-imap";
import { simpleParser } from "mailparser";
import fs from "fs";

const imap = new Imap({
    user: process.env.MAIL_USER || "",
    password: process.env.MAIL_PASSWORD || "",
    host: process.env.MAIL_HOST || "",
    port: parseInt(process.env.MAIL_PORT || ""),
    tls: true,
});

function checkMail(box: Imap.Box){
    if (!fs.existsSync("./lastMail"))  
        return true;
    
    return getLastMail(box) < box.messages.total;
}

function getLastMail(box: Imap.Box) {
    if (fs.existsSync("./lastMail"))
        return parseInt(fs.readFileSync("./lastMail").toString());
    else return box.messages.total;
}

function saveLastMail(box: Imap.Box) {
    fs.writeFileSync("./lastMail", "" + (box.messages.total + 1));
}

// TODO: ネストを治したい
export function getMails() {
    return new Promise<EMail[]>((resolve, reject) => {
        const messages: EMail[] = [];

        imap.once("ready", async () => {
            imap.openBox("INBOX", true, (err, box) => {
                let start = 0;
                let done = 0;

                if(!checkMail(box)){
                    imap.end();
                    return resolve([]);
                }

                const f = imap.seq.fetch(getLastMail(box) + ":*", {
                    bodies: ["HEADER.FIELDS (FROM TO)", "TEXT"],
                });

                // メッセージの処理
                f.on("message", (msg, seqno) => {
                    start++;
                    console.log("Message #%d を処理しています。", seqno);
                    let from: string[];
                    let to: string[];
                    msg.on("body", (stream, info) => {

                        // ストリームの内容をバッファーに貯める
                        let buffer = "";
                        stream.on("data", chunk => {
                            buffer += chunk.toString("utf8");
                        });

                        stream.once("end", async () => {
                            if (info.which === "TEXT") {
                                const data = await simpleParser(buffer);
                                console.log("data incomming", start, done);
                                messages.push({

                                    to, from, text: data.text, raw: buffer
                                });
                                done++;

                                if(done === start)
                                    resolve(messages);
                            } else {
                                console.log("Parsed header: %s", Imap.parseHeader(buffer));
                                const header = Imap.parseHeader(buffer);
                                from = header.from;
                                to = header.to;
                            }
                        });

                    });

                });
                // フェッチエラー処理
                f.once("error", err => {
                    console.log("Fetch error: " + err);
                    reject(err);
                });

                // フェッチ終了処理
                f.once("end", () => {
                    console.log("Done fetching all messages!");
                    saveLastMail(box); //最後のメール受信番号をメモっておく
                    imap.end();
                });
            });
        });

        // 接続諸々の処理
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


export interface EMail{
    from: string[]
    to: string[]
    text?: string
    raw?: string
}