import eris, { Message } from 'eris';
import dotenv from 'dotenv';
import prettier from 'prettier';
import centra from 'centra';
import { EmbedBuilder } from './EmbedBuilder';

dotenv.config();

if (!process.env.TOKEN) process.exit();
const bot = new eris.Client(process.env.TOKEN);

bot.on('ready', () => {
    console.log('Bot ready!');
});

bot.on('messageCreate', async (message: Message) => {
    const prefix = '!';
    if (!message.content.startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift();

    switch (command) {
        case 'eval': {
            let code = '';

            if (args[0] == 'async') {
                args.shift();
                code = `(async() => {${args.join(' ')}})()`;
            } else {
                code = args.join(' ');
            }

            code = prettier.format(code);

            let evaled;
            let remove;

            //Attempt to eval code
            try {
                //Remove all discord things
                remove = (text: string) => {
                    return text
                        .replace(/`/g, '`' + String.fromCharCode(8203))
                        .replace(/@/g, '@' + String.fromCharCode(8203))
                        .replace(
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            bot.token!,
                            "Token"
                        );
                };

                //Eval the code and set the result
                evaled = await eval(code);

                //If it is a string, inspect it
                if (typeof evaled !== 'string')
                    evaled = (await import('util')).default.inspect(
                        evaled,
                        undefined,
                        1
                    );

                //Build the success embed
                const embed = new EmbedBuilder()
                    .setTitle('Eval Success')
                    .addField(
                        ':inbox_tray: Input:',
                        `\`\`\`js\n${code}\n\`\`\``,
                        false
                    )
                    .setColor(0x00afff)
                    .setTimestamp();

                if (evaled.toString().length > 1024) {
                    let formatted;
                    try {
                        formatted = prettier.format(remove(evaled));
                    } catch {
                        formatted = remove(evaled);
                    }
                    const result = await (
                        await centra('https://hasteb.in/documents', 'POST')
                            .body(formatted)
                            .header('content-type', 'application/json')
                            .send()
                    ).json();

                    embed.addField(
                        ':outbox_tray: Output:',
                        `[Output](https://hasteb.in/${result.key})`,
                        false
                    );
                } else {
                    embed.addField(
                        ':outbox_tray: Output:',
                        `\`\`\`js\n${remove(evaled)}\n\`\`\``,
                        false
                    );
                }

                //Send the embed
                message.channel.createMessage({
                    embed,
                });
            } catch (err) {
                //If eval has failed setup new embed

                const embed = new EmbedBuilder()
                    .setTitle('Eval Error')
                    .addField(
                        ':inbox_tray: Input:',
                        `\`\`\`js\n${code}\n\`\`\``,
                        false
                    )
                    .addField(
                        ':outbox_tray: Output:',
                        `\`\`\`${err.stack}\`\`\``,
                        false
                    )
                    .setColor(0xff0000)
                    .setTimestamp();
                //Send the embed
                message.channel.createMessage({
                    embed,
                });
                return;
            }
        }
    }
});

bot.connect();
