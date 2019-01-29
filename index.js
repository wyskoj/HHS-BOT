const Discord = require('discord.js');
const client = new Discord.Client();

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', function (message) {
  args = message.content.split(" ");
  switch (args[0]) {
    case '!ping':
      message.channel.send("Hi " + message.member.nickname + "!");
      break;
    case '!addrole':
      let roleToAdd = message.guild.roles.find(r => r.name === message.content.substring(9));
      try {
        if (message.member.roles.has(roleToAdd.id)) {
          message.reply("you already have the *" + roleToAdd.name + "* role.");
        } else {
          const guildMember = message.member;
          guildMember.addRole(roleToAdd);
          message.reply("you now have the *" + roleToAdd.name + "* role.");
        }
      } catch {
        message.channel.send("There was an error setting that role. Check spelling and capitalization.")
      }
      break;
    case '!removerole':
      let roleToRemove = message.guild.roles.find(r => r.name === message.content.substring(12));
      try {
        if (message.member.roles.has(roleToRemove.id)) {
          const guildMember = message.member;
          guildMember.removeRole(roleToRemove);
          message.reply("you no longer have the *" + roleToRemove.name + "* role.");
        } else {
          message.reply("you don't have the *" + roleToRemove.name + "* role.")
        }
      } catch {
        message.channel.send("There was an error setting that role. Check spelling and capitalization.")
      }
      break;
    case '!web':
    case '!website':
      message.channel.send("https://www.haslett.k12.mi.us/hhs");
      break;
  }
});
   
client.login('NTM5NTI1Nzg1Mzk2OTY5NDcz.DzDp_Q.b8o1LH841zdpIL3-PGkG8JCClq8');