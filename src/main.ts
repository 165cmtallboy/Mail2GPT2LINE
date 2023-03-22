import "dotenv/config";
import { getMails, EMail } from "./mail";
import { watching_from, watching_to } from "./config";
import { makeShortByGPT } from "./gpt";
import SendMessage from "./line";
import cron from "node-cron";

console.log("started script.");

function isWatching(received: string[], watching: string[]): boolean{
    const froms = received.join(", ");

    let flag = false;
    watching.forEach(addr => {
        if(froms.includes(addr)){
            flag = true;
        }
    });

    return flag;
}

const job = async () => {
    console.log("started cron jobs!");
    
    // メール処理
    const mails: EMail[] = await getMails();
    mails.forEach(async mail => {

        // 送信元/送信先がチェックリストにいるか確認
        if(!isWatching(mail.to, watching_to) || !isWatching(mail.from, watching_from))
            return;
            
        // メッセージの復号とGPTに食わせる
        let text = mail.text;
        if(!text)
            text = Buffer.from(mail.raw+"", "base64").toString();

        const choices = await makeShortByGPT(text+"");
        const gpt_response = choices.map((choice) => choice.message?.content).join("\n");

        const message = `送信元: ${mail.from.join(",").replace("<","").replace(">", "")}\n\nAIによる要約:\n\n${gpt_response}`;
        console.log(message);

        // 送信
        if(process.env.DONT_SEND)
            return;
        SendMessage(message);
    });

    WeeklyReportAlarm();
};

if(!process.env.DONT_SEND){
    cron.schedule("0 * * * *", job);
}else{
    job();
}


// ついでに週報アラートもする
function WeeklyReportAlarm(){
    const date = new Date();

    // 日曜１８時にアラーム
    if(date.getDay() === 0 && date.getHours() == 18){
        if(process.env.DONT_SEND)
            return;

        SendMessage("[定例アラーム]\n\n週報を書いて送信しましょう。");
    }
}
