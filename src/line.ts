import { post } from "request";

export default async function SendMessage(text: string){
    const req = await post({
        uri: process.env.IFTTT_WEBHOOK || "",
        headers: {
            "Content-Type": "application/json" 
        },
        json: {
            value1: text
        }
    });

    return req;
}