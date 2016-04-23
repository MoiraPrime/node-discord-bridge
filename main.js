//main.js


//dependencies
const EE = require("events"),
    Discord = require("discord.io"),
    config = require("./config.json"),
    bot = new Discord({
        token: config.discord.token,
        autorun: true
    }),
    IRC = require("internet-relay-chat"),
    ircbot = new IRC({
        "server": config.IRC.server.hostname,
        "port": config.IRC.server.port,
        "secure": config.IRC.server.ssl,
        "password": config.IRC.server.password,
        "nick": config.IRC.nick,
        "floodDelay": config.IRC.floodDelay,
        "autoReconnect": config.IRC.autoReconnect,
        "username": config.IRC.username,
        "realname": config.IRC.realname
    });

//IRC lib lacks an autoconnect
ircbot.connect();

//global vars and consts
const ircCS = ircbot.connected,
    discordCS = bot.connected;


//events and shit
ircbot.on("registered", () => {
    console.log("Connection established with IRC.");
    ircbot.join(config.bridgeSettings.channel.irc);
});

bot.on("ready", () => {
    console.log("Connection established with Discord.");
});


setTimeout(() => {
    if (config.bridgeSettings.channel.discordServer in bot.servers) {
        if (config.bridgeSettings.channel.discord in bot.servers[config.bridgeSettings.channel.discordServer].channels) {
            console.log("Listening in Discord");
            bot.sendMessage({
                to: config.bridgeSettings.channel.discord,
                message: "ALERT: The bot is now listening."
            });
            ircbot.message(config.bridgeSettings.channel.irc, "ALERT: The bot is now listening.")
            bot.on("message", (user, userID, channelID, message, rawEvent) => {
                if (channelID != config.bridgeSettings.channel.discord) {
                    return;
                }
                if (message.startsWith("!") || message.startsWith("&") || message.startsWith("$")) {
                    return;
                }
                if (userID == bot.id) {
                    return;
                }
                ircbot.message(config.bridgeSettings.channel.irc, `>>${user}: ${bot.fixMessage(message)}`);
                console.log(`(Discord) ${user} => IRC: ${bot.fixMessage(message)}`);
            });
            console.log("Listening in IRC.");
            ircbot.on("message", (sender, channel, message) => {
                if (channel != config.bridgeSettings.channel.irc) {
                    return;
                }
                if (message.startsWith("!") || message.startsWith("&") || message.startsWith("$")) {
                    return;
                }
                if ((message.indexOf("@everyone")) > -1 || message.indexOf("@here") > -1) {
                    ircbot.notice(sender, "Your message as been rejected due to it containing a mention to everyone.");
                    bot.sendMessage({to: config.bridgeSettings.channel.discord, message: `ALERT: Rejected message from ${sender.nick} on IRC due to mention to everyone.`});
                    console.log(`(IRC) ${sender.nick} => Discord: ${bot.fixMessage(message)} (Message was rejected.)`);
                    return;
                }
                bot.sendMessage({
                    to: config.bridgeSettings.channel.discord,
                    message: `>>${sender.nick}: ${message}`
                });
                console.log(`(IRC) ${sender.nick} => Discord: ${bot.fixMessage(message)}`);
            });
        } else {
            throw "You are not in that Discord channel.";
        }
    } else {
        throw "You are not in that Discord server.";
    }
}, 10000);