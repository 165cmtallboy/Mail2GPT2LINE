import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const system_param = "受け取ったメールの文章を、箇条書きにして簡単に要約してください。提出物や返信が必要そうなものについては、強調して記述してください。";

export async function makeShortByGPT(text: string){
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: system_param,
            },
            {
                role: "user",
                content: text,
            },
        ],
    });
    return completion.data.choices;
}
