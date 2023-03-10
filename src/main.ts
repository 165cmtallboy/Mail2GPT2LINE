import 'dotenv/config';
import { getMails, EMail } from "./mail";
import { watching } from './config';
import { makeShortByGPT } from './gpt';
import { post } from 'request';

getMails()
    .then((mails: EMail[]) => {
        mails.forEach(async mail => {
            let marked = false;
            let froms = mail.from.join(", ");
            watching.forEach(addr => {
                if(froms.includes(addr)){
                    marked = true;
                }
            })

            if(!marked)
                return;
            
            if(!mail.text)
                return console.error("テキストがない");

            let choices = await makeShortByGPT(mail.text);
            let gpt_response = choices.map((choice) => choice.message?.content).join('\n');

            let message = `送信元: ${froms.replace('<','').replace('>', '')}\n\nAIによる要約:\n\n${gpt_response}`;
            console.log(message)
            let req = await post({
                uri: process.env.IFTTT_WEBHOOK || "",
                headers: {
                    'Content-Type': 'application/json' 
                },
                json: {
                    value1: message
                }
            });
            // console.log(req);
        })
    })
