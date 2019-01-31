const Discord = require('discord.js');
const fs = require('fs');
const client = new Discord.Client();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', function(message) {
    if (/^!\S+/g.test(message.content)) {
        if (message.channel.id === "539537645777321994") { // #bot-testing
            let match = /^!(\S+)/g.exec(message.content); // Finds the command after ! ("!test blah" returns "test")
            let command = match[1];
            switch (command) {
                case "allclasses":
                    let classes = getAllClassesNames(message);
                    let output = "```\n";
                    for (let i = 0; i < classes.length; i++) {
                        output += classes[i] + "\n";
                    }
                    output += "```";
                    message.channel.send(output);
                    break;
                case "classes":
                    let match = /^!(\S+)\s(.*)/g.exec(message.content);
                    if (match !== null) {
                        if (match.length !== 3) {
                            message.reply("please add your classes after `!classes`, separated by commas.");
                        } else {
                            let userClasses = match[2].toLowerCase().split(",");
                            for (let i = 0; i < userClasses.length; i++) {
                                userClasses[i] = userClasses[i].trim();
                            }
                            let allClasses = getAllClassesNamesSystemSorted(message);
                            let allIDs = getAllClassesIDsSystemSorted(message);
                            let allClassesSimplified = [];
                            let userClassesSimplified = [];
                            for (let i = 0; i < allClasses.length; i++) {
                                allClassesSimplified.push(allClasses[i].trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, ""));
                            }
                            for (let i = 0; i < userClasses.length; i++) {
                                userClassesSimplified.push(userClasses[i].trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, ""));
                            }
                            userClassesSimplified = replaceAliases(userClassesSimplified);
                            /* BEGIN ROLE ASSIGNMENT */
                            let indicesOfRolesToAssign = [];
                            for (let i = 0; i < userClassesSimplified.length; i++) {
                                for (let j = 0; j < allClassesSimplified.length; j++) {
                                    if (userClassesSimplified[i] === allClassesSimplified[j]) {
                                        indicesOfRolesToAssign.push(j);
                                    }
                                }
                            }
                            let rolesToAssign = [];
                            for (let i = 0; i < indicesOfRolesToAssign.length; i++) {
                                rolesToAssign.push(message.guild.roles.find(r => r.id === allIDs[indicesOfRolesToAssign[i].toString()]))
                            }
                            for (let i = 0; i < rolesToAssign.length; i++) {
                                message.member.addRole(rolesToAssign[i]).catch(console.error);
                            }
                            let assignedClasses = "";
                            for (let i = 0; i < rolesToAssign.length; i++) {
                                assignedClasses += rolesToAssign[i].name;
                                if (i !== rolesToAssign.length - 1) {
                                    assignedClasses += ", ";
                                }
                            }
                            message.reply("you have been assigned to these classes: " + assignedClasses + ".");
                        }
                    } else {
                        message.reply("please add your classes after `!classes`, separated by commas.");
                    }
                    break;
                case 'addclass':
                    let classMatch = /^\s*!addclass\s(.+)/.exec(message.content);
                    if (classMatch !== null) {
                        let userClass = classMatch[1];
                        userClass = userClass.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
                        let allClasses = getAllClassesNamesSystemSorted(message);
                        userClass = replaceAlias(userClass);
                        let allClassesSimplified = [];
                        for (let i = 0; i < allClasses.length; i++) {
                            allClassesSimplified.push(allClasses[i].trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, ""));
                        }
                        if (allClassesSimplified.indexOf(userClass) !== -1) { // If a valid class
                            let classIndex = allClassesSimplified.indexOf(userClass);
                            let classID = getAllClassesIDsSystemSorted(message)[classIndex];
                            let classRole = message.guild.roles.find(r => r.id === classID.toString());
                            if (message.member.roles.has(classRole.id)) {
                                message.reply("you are already assigned to " + classRole.name + ".");
                            } else {
                                message.member.addRole(classRole).catch(console.error);
                                message.reply("you have been assigned to " + classRole.name + ".");
                            }
                        } else {
                            message.reply("I didn't recognize that class.");
                        }
                    } else {
                        message.reply("please specify a class.");
                    }
                    break;
                case 'removeclass':
                    let classRemove = /^\s*!removeclass\s(.+)/.exec(message.content);
                    if (classRemove !== null) {
                        let userClass = classRemove[1];
                        userClass = userClass.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
                        let allClasses = getAllClassesNamesSystemSorted(message);
                        userClass = replaceAlias(userClass);
                        let allClassesSimplified = [];
                        for (let i = 0; i < allClasses.length; i++) {
                            allClassesSimplified.push(allClasses[i].trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, ""));
                        }
                        if (allClassesSimplified.indexOf(userClass) !== -1) { // If a valid class
                            let classIndex = allClassesSimplified.indexOf(userClass);
                            let classID = getAllClassesIDsSystemSorted(message)[classIndex];
                            let classRole = message.guild.roles.find(r => r.id === classID.toString());
                            if (!message.member.roles.has(classRole.id)) {
                                message.reply("you aren't assigned to " + classRole.name + ".");
                            } else {
                                message.member.removeRole(classRole).catch(console.error);
                                message.reply("you have been removed from " + classRole.name + ".");
                            }
                        } else {
                            message.reply("I didn't recognize that class.");
                        }
                    } else {
                        message.reply("please specify a class.");
                    }
                    break;
                case 'removeallclasses':

                    break;

            }
        }
    }
});

function getAllClassesNamesAlphabetSorted(message) {
    let classes = [];
    let botRolePosition = message.guild.roles.find(r => r.id === "540336652313165835").position;
    for (let i = 0; i < message.member.guild.roles.array().length; i++) {
        if (message.member.guild.roles.array()[i].position < botRolePosition && message.member.guild.roles.array()[i].name !== "@everyone") {
            classes.push(message.member.guild.roles.array()[i].name);
        }
    }
    classes.sort();
    return classes;
}

function getAllClassesNamesSystemSorted(message) {
    let classes = [];
    let botRolePosition = message.guild.roles.find(r => r.id === "540336652313165835").position;
    for (let i = 0; i < message.member.guild.roles.array().length; i++) {
        if (message.member.guild.roles.array()[i].position < botRolePosition && message.member.guild.roles.array()[i].name !== "@everyone") {
            classes.push(message.member.guild.roles.array()[i].name);
        }
    }
    return classes;
}

function getAllClassesIDsSystemSorted(message) {
    let classes = [];
    let botRolePosition = message.guild.roles.find(r => r.id === "540336652313165835").position;
    for (let i = 0; i < message.member.guild.roles.array().length; i++) {
        if (message.member.guild.roles.array()[i].position < botRolePosition && message.member.guild.roles.array()[i].name !== "@everyone") {
            classes.push(message.member.guild.roles.array()[i].id);
        }
    }
    return classes;
}

function replaceAliases(userInput) {
    let replaced = userInput;
    let buffer = fs.readFileSync('aliases.db');
    let lines = buffer.toString().split("\n");
    let commentLineRegex = new RegExp('^\\s*#');
    let aliasRegex = new RegExp('([a-z0-9]+):([a-z0-9,]+)');
    let masterTarget = [];
    let masterAliases = [];
    for (let i = 0; i < lines.length; i++) { // For each alias in the file
        if (!commentLineRegex.test(lines[i]) && aliasRegex.test(lines[i])) { // If the line isn't a comment and is a valid alias
            let data = aliasRegex.exec(lines[i]); // Execute RegExp
            masterTarget.push(data[1]); // The target "apcalculus"
            masterAliases.push(data[2].split(",")); // The aliases ["apcalc","calcab",...]
        }
    }
    for (let i = 0; i < replaced.length; i++) { // For each class that the user entered
        for (let j = 0; j < masterAliases.length; j++) { // For each set of aliases
            for (let k = 0; k < masterAliases[j].length; k++) { // For each alias
                if (masterAliases[j][k] === replaced[i]) { // If the thing the user entered needs to be replaced
                    replaced[i] = masterTarget[j]; // masterAliases's & masterTarget's have aligning indices
                }
            }
        }
    }
    return replaced;
}

function replaceAlias(studentClass) {
    let replaced = studentClass;
    let buffer = fs.readFileSync('aliases.db');
    let lines = buffer.toString().split("\n");
    let commentLineRegex = new RegExp('^\\s*#');
    let aliasRegex = new RegExp('([a-z0-9]+):([a-z0-9,]+)');
    let masterTarget = [];
    let masterAliases = [];
    for (let i = 0; i < lines.length; i++) { // For each alias in the file
        if (!commentLineRegex.test(lines[i]) && aliasRegex.test(lines[i])) { // If the line isn't a comment and is a valid alias
            let data = aliasRegex.exec(lines[i]); // Execute RegExp
            masterTarget.push(data[1]); // The target "apcalculus"
            masterAliases.push(data[2].split(",")); // The aliases ["apcalc","calcab",...]
        }
    }
        for (let j = 0; j < masterAliases.length; j++) { // For each set of aliases
            for (let k = 0; k < masterAliases[j].length; k++) { // For each alias
                if (masterAliases[j][k] === replaced) { // If the thing the user entered needs to be replaced
                    replaced = masterTarget[j]; // masterAliases's & masterTarget's have aligning indices
                }
            }
        }
    return replaced;
}


client.login('NTM5NTI1Nzg1Mzk2OTY5NDcz.DzDp_Q.b8o1LH841zdpIL3-PGkG8JCClq8');