//main.js


//dependencies
const Discord = require("discord.io"),
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
var ircCS = false,
    discordCS = false;


//events and shit
ircbot.on("registered", () => {
    console.log("Connection established with IRC.");
    ircbot.join(config.bridgeSettings.channel.irc);
    ircCS = true;
    start();
});

bot.on("ready", () => {
    console.log("Connection established with Discord.");
    discordCS = true;
    start();
});


function start() {
    if (!(discordCS && ircCS)) {
        return;
    }
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
                for (var i of config.bridgeSettings.other.ignore.triggers) {
                    if (message.startsWith(i)) {
                        return;
                    }
                }
                for (var i of config.bridgeSettings.other.ignore.discordUsers) {
                    if (userID == i) {
                        return;
                    }
                }
                if (userID == bot.id) {
                    return;
                }
                ircbot.message(config.bridgeSettings.channel.irc, `${toNickname(userID) || user}: ${bot.fixMessage(message)}`);
                console.log(`(Discord) ${toNickname(userID) || user} => IRC: ${bot.fixMessage(message)}`);
            });
            console.log("Listening in IRC.");
            ircbot.on("message", (sender, channel, message) => {
                if (channel != config.bridgeSettings.channel.irc) {
                    return;
                }
                for (var i of config.bridgeSettings.other.ignore.triggers) {
                    if (message.startsWith(i)) {
                        return;
                    }
                }
                for (var i of config.bridgeSettings.other.ignore.ircUsers) {
                    if (sender.nick == i) {
                        return;
                    }
                }
                if ((message.indexOf("@everyone")) > -1 || message.indexOf("@here") > -1) {
                    ircbot.notice(sender, "Your message as been rejected due to it containing a mention to everyone.");
                    bot.sendMessage({
                        to: config.bridgeSettings.channel.discord,
                        message: `ALERT: Rejected message from ${sender.nick} on IRC due to mention to everyone.`
                    });
                    console.log(`(IRC) ${sender.nick} => Discord: ${bot.fixMessage(message)} (Message was rejected.)`);
                    return;
                }
                bot.sendMessage({
                    to: config.bridgeSettings.channel.discord,
                    message: `<${sender.nick}> ${message}`
                });
                console.log(`(IRC) ${sender.nick} => Discord: ${bot.fixMessage(message)}`);
            });
            other();
        } else {
            throw "You are not in that Discord channel.";
        }
    } else {
        throw "You are not in that Discord server.";
    }
}

function other() {
    ircbot.on("join", (user, channel) => {
        if (user.nick == ircbot.myNick) {
            return;
        }
        bot.sendMessage({
            to: config.bridgeSettings.channel.discord,
            message: `${user.nick} has joined ${channel}`
        });
    });
    ircbot.on("part", (user, channel, message) => {
        if (user.nick == ircbot.myNick) {
            return;
        }
        bot.sendMessage({
            to: config.bridgeSettings.channel.discord,
            message: `${user.nick} has left ${channel} (${message})`
        });
    });
    ircbot.on("quit", (user, channels, message) => {
        if (user.nick == ircbot.myNick) {
            return;
        }
        bot.sendMessage({
            to: config.bridgeSettings.channel.discord,
            message: `${user.nick} has quit (${message})`
        });
    });
    ircbot.on("kick", (kicker, user, channel, message) => {
        if (user.nick == ircbot.myNick) {
            return;
        }
        bot.sendMessage({
            to: config.bridgeSettings.channel.discord,
            message: `${user.nick} was kicked from ${channel} by ${kicker.nick} (${message})`
        });
    });
    ircbot.on("topic", (changer, channel, topic) => {
        bot.sendMessage({
            to: config.bridgeSettings.channel.discord,
            message: `${changer.nick} has changed the topic of ${channel} to: ${topic}`
        });
        bot.editChannelInfo({
            channel: config.bridgeSettings.channel.discord,
            topic: "Put !, &, or $ before your messages to keep them from sending. Topic: " + topic
        });
    });
    bot.editChannelInfo({
        channel: config.bridgeSettings.channel.discord,
        topic: "Put !, &, or $ before your messages to keep them from sending. Topic: " + ircbot.channels[config.bridgeSettings.channel.irc].topic
    });
}

function toNickname (userID) {
    if (bot.servers[config.bridgeSettings.channel.discordServer].members[userID].nick) {
        return bot.servers[config.bridgeSettings.channel.discordServer].members[userID].nick;
    }
    return;
}


//Openshift
/*
const http = require("http");

function handleRequest(request, response){
    response.end('BridgeBot is Online.');
    console.log("HTTP RESPONSE")
}

var server = http.createServer(handleRequest);

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8080
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'

server.listen(server_port, server_ip_address, function() {
    console.log("Listening on " + server_ip_address + ", server_port " + server_port);
}); */
