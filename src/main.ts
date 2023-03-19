import "dotenv/config";
import { getMails, EMail } from "./mail";
import { watching } from "./config";
import { makeShortByGPT } from "./gpt";
import SendMessage from "./line";

// メール処理
getMails()
    .then((mails: EMail[]) => {
        mails.forEach(async mail => {

            // 送信元がチェックリストにいるか確認
            let marked = false;
            const froms = mail.from.join(", ");
            watching.forEach(addr => {
                if(froms.includes(addr)){
                    marked = true;
                }
            });
            if(!marked)
                return;
            
            // メッセージの復号とGPTに食わせる
            let text = mail.text;
            if(!text)
                text = Buffer.from(mail.raw+"", "base64").toString();

            const choices = await makeShortByGPT(text+"");
            const gpt_response = choices.map((choice) => choice.message?.content).join("\n");

            const message = `送信元: ${froms.replace("<","").replace(">", "")}\n\nAIによる要約:\n\n${gpt_response}`;
            console.log(message);

            // 送信
            if(process.env.DONT_SEND)
                return;
            SendMessage(message);
        });
    });

// ついでに週報アラートもする
function WeeklyReportAlarm(){
    const date = new Date();

    // 日曜１８時にアラーム
    if(date.getDay() === 0 && date.getHours() == 18){
        SendMessage("[定例アラーム]\n\n週報を書いて送信しましょう。");
    }
}
WeeklyReportAlarm();