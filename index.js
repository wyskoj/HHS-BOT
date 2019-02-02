const Discord = require('discord.js');
const fs = require('fs');
const client = new Discord.Client();

const LEVENSHTEIN_DISTANCE_TOLERANCE = 2;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('error', console.error);

client.on('message', function(message) {
    if (/^!\S+/g.test(message.content)) {
            let match = /^!(\S+)/g.exec(message.content); // Finds the command after ! ("!test blah" returns "test")
            let command = match[1];
            switch (command) {
                case "allclasses":
                    let classes = getAllClassesNamesAlphabetSorted(message);
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
                            // userClassesSimplified = replaceAliases(userClassesSimplified);
                            // userClassesSimplified = levensteinReplace(userClassesSimplified, message);

                            userClassesSimplified = replaceAliasesAndMistakes(userClassesSimplified, message);

                            /* BEGIN ROLE ASSIGNMENT */
                            let indicesOfRolesToAssign = [];
                            let classesThatCouldNotBeAssigned = [];
                            for (let i = 0; i < userClassesSimplified.length; i++) {
                                let assigned = false;
                                for (let j = 0; j < allClassesSimplified.length; j++) {
                                    if (userClassesSimplified[i] === allClassesSimplified[j]) {
                                        indicesOfRolesToAssign.push(j);
                                        assigned = true;
                                    }
                                }
                                if (assigned === false) {
                                    classesThatCouldNotBeAssigned.push(userClassesSimplified[i]);
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
                            if (rolesToAssign.length === 0) {
                                message.reply("you were not added to any classes.");
                            } else {
                                message.reply("you have been assigned to these classes: " + assignedClasses + ".");

                            }
                            if (classesThatCouldNotBeAssigned.length > 1) {
                                let botErrorChannel = message.guild.channels.get("541061854969987078");
                                botErrorChannel.send(timeStamp() + " Could not add bulk add classes: `" + classesThatCouldNotBeAssigned.toString() + "`.");
                            }
                        }
                    } else {
                        message.reply("please add your classes after `!classes`, separated by commas.");
                    }
                    break;
                case 'addclass':
                    let classMatch = /^\s*!addclass\s(.+)/.exec(message.content);
                    if (classMatch !== null) {
                        let userClass = classMatch[1];
                        let arrayed = [];
                        arrayed.push(userClass);
                        let fixed = replaceAliasesAndMistakes(arrayed, message)[0];
                        let allClassesSimplified = [];
                        let allClasses = getAllClassesNamesSystemSorted(message);
                        for (let i = 0; i < allClasses.length; i++) {
                            allClassesSimplified.push(allClasses[i].trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, ""));
                        }
                        if (allClassesSimplified.indexOf(fixed) !== -1) { // If a valid class
                            let classIndex = allClassesSimplified.indexOf(fixed);
                            let classID = getAllClassesIDsSystemSorted(message)[classIndex];
                            let classRole = message.guild.roles.find(r => r.id === classID.toString());
                            if (message.member.roles.has(classRole.id)) {
                                message.reply("you are already assigned to " + classRole.name + ".");
                            } else {
                                message.member.addRole(classRole).catch(console.error);
                                message.reply("you have been assigned to " + classRole.name + ".");
                            }
                        } else {
                            let botErrorChannel = message.guild.channels.get("541061854969987078");
                            botErrorChannel.send(timeStamp() + " Could not add unknown class: `" + fixed + "`.");
                            message.reply("I didn't recognize that class.");
                        }
                    } else {
                        message.reply("please specify a class.");
                    }
                    break;
                case 'removeclass':
                    let classRemoveMatch = /^\s*!removeclass\s(.+)/.exec(message.content);
                    if (classRemoveMatch !== null) {
                        let userClass = classRemoveMatch[1];
                        let arrayed = [];
                        arrayed.push(userClass);
                        let fixed = replaceAliasesAndMistakes(arrayed, message)[0];
                        let allClassesSimplified = [];
                        let allClasses = getAllClassesNamesSystemSorted(message);
                        for (let i = 0; i < allClasses.length; i++) {
                            allClassesSimplified.push(allClasses[i].trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, ""));
                        }
                        if (allClassesSimplified.indexOf(fixed) !== -1) { // If a valid class
                            let classIndex = allClassesSimplified.indexOf(fixed);
                            let classID = getAllClassesIDsSystemSorted(message)[classIndex];
                            let classRole = message.guild.roles.find(r => r.id === classID.toString());
                            if (message.member.roles.has(classRole.id)) {
                                message.member.removeRole(classRole).catch(console.error);
                                message.reply("you have been removed from " + classRole.name + ".");
                            } else {
                                message.reply("you aren't assigned to " + classRole.name + ".");
                            }
                        } else {
                            let botErrorChannel = message.guild.channels.get("541061854969987078");
                            botErrorChannel.send(timeStamp() + " Could not remove unknown class: `" + fixed + "`.");
                            message.reply("I didn't recognize that class.");
                        }
                    } else {
                        message.reply("please specify a class.");
                    }
                    break;
                case 'removeallclasses':
                    let allClasses = getAllClassesIDsSystemSorted(message);
                    let IDs = getAllUserClassesIDsSystemSorted(message);
                    let IDsToRemove = [];
                    for (let i = 0; i < allClasses.length; i++) {
                        for (let j = 0; j < IDs.length; j++) {
                            if (allClasses[i] === IDs[j]) {
                                IDsToRemove.push(IDs[j]);
                            }
                        }
                    }
                    let roles = [];
                    for (let i = 0; i < IDsToRemove.length; i++) {
                        roles.push(message.guild.roles.find(r => r.id === IDsToRemove[i].toString()));
                    }
                    for (let i = 0; i < roles.length; i++) {
                        message.member.removeRole(roles[i]).catch(console.error);
                    }
                    message.reply("all classes you were assigned to have been removed.");
                    break;
                case 'testlevenshtein':
                    let levRegExp = /^\w*!testlevenshtein\s(.+)\|(.+)/;
                    if (levRegExp.test(message.content)) {
                        let s1 = levRegExp.exec(message.content)[1];
                        let s2 = levRegExp.exec(message.content)[2];
                        message.channel.send(levenshtein(s1,s2));
                    } else {
                        message.channel.send("`!testlevenshtein string1|string2`");
                    }
                    break;
                case 'ping':
                    message.channel.send("Pong!");
                    break;
            }

    }
});

function getAllClassesNamesAlphabetSorted(context) {
    let classes = [];
    let botRolePosition = context.guild.roles.find(r => r.id === "540336652313165835").position;
    for (let i = 0; i < context.member.guild.roles.array().length; i++) {
        if (context.member.guild.roles.array()[i].position < botRolePosition && context.member.guild.roles.array()[i].name !== "@everyone") {
            classes.push(context.member.guild.roles.array()[i].name);
        }
    }
    classes.sort();
    return classes;
}

function getAllClassesNamesSystemSorted(context) {
    let classes = [];
    let botRolePosition = context.guild.roles.find(r => r.id === "540336652313165835").position;
    for (let i = 0; i < context.member.guild.roles.array().length; i++) {
        if (context.member.guild.roles.array()[i].position < botRolePosition && context.member.guild.roles.array()[i].name !== "@everyone") {
            classes.push(context.member.guild.roles.array()[i].name);
        }
    }
    return classes;
}

function getAllClassesIDsSystemSorted(context) {
    let classes = [];
    let botRolePosition = context.guild.roles.find(r => r.id === "540336652313165835").position;
    for (let i = 0; i < context.member.guild.roles.array().length; i++) {
        if (context.member.guild.roles.array()[i].position < botRolePosition && context.member.guild.roles.array()[i].name !== "@everyone") {
            classes.push(context.member.guild.roles.array()[i].id);
        }
    }
    return classes;
}

function levenshtein(str1, str2) { // Courtesy of bindiego on GitHub. Modified.
    let m = str1.length,
        n = str2.length,
        d = [],
        i, j;

    if (!m) return n;
    if (!n) return m;

    for (i = 0; i <= m; i++) d[i] = [i];
    for (j = 0; j <= n; j++) d[0][j] = j;

    for (j = 1; j <= n; j++) {
        for (i = 1; i <= m; i++) {
            if (str1[i-1] === str2[j-1]) d[i][j] = d[i - 1][j - 1];
            else d[i][j] = Math.min(d[i-1][j], d[i][j-1], d[i-1][j-1]) + 1;
        }
    }
    return d[m][n];
}

function getAllUserClassesIDsSystemSorted(context) {
    let userClassesIDs = [];
    for (let i = 0; i < context.member.guild.roles.array().length; i++) {
        userClassesIDs.push(context.member.guild.roles.array()[i].id);
    }
    return userClassesIDs;
}

function replaceAliasesAndMistakes(simplifiedUserClasses, context) {
    let replaced = simplifiedUserClasses;
    let allClasses = getAllClassesNamesAlphabetSorted(context);
    let allClassesSimplified = [];
    for (let i = 0; i < allClasses.length; i++) {
        allClassesSimplified.push(allClasses[i].trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, ""));
    }
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

    for (let i = 0; i < lines.length; i++) { // For each alias in the file
        if (!commentLineRegex.test(lines[i]) && aliasRegex.test(lines[i])) { // If the line isn't a comment and is a valid alias
            let data = aliasRegex.exec(lines[i]); // Execute RegExp
            masterTarget.push(data[1]); // The target "apcalculus"
            masterAliases.push(data[2].split(",")); // The aliases ["apcalc","calcab",...]
        }
    }

    for (let i = 0; i < simplifiedUserClasses.length; i++) { // For each class the user entered
        let aliased = false;
        if (allClassesSimplified.indexOf(simplifiedUserClasses[i]) === -1) { // If not a recognized class
            for (let j = 0; j < masterAliases.length; j++) { // For each set of aliases
                for (let k = 0; k < masterAliases[j].length; k++) { // For each alias
                    if (masterAliases[j][k] === replaced[i]) { // If the thing the user entered needs to be replaced
                        replaced[i] = masterTarget[j]; // masterAliases's & masterTarget's have aligning indices
                        aliased = true;
                    }
                }
            }
            if (!aliased) {
                let misspelledFromTarget;
                let lowestDistanceTarget = Number.MAX_SAFE_INTEGER;
                let index;
                for (let j = 0; j < allClassesSimplified.length; j++) { // Check each master class
                    if (levenshtein(allClassesSimplified[j], simplifiedUserClasses[i]) <= LEVENSHTEIN_DISTANCE_TOLERANCE && levenshtein(allClassesSimplified[j], simplifiedUserClasses[i]) < lowestDistanceTarget) { // If within the tolerance and is lower than the current lowest distance
                        lowestDistanceTarget = levenshtein(simplifiedUserClasses[i], allClassesSimplified[j]); // Set new lowest distance
                        index = j;
                        misspelledFromTarget = true; // Ladies and gentlemen, we got 'em.
                    }
                }
                if (misspelledFromTarget && index !== null) {
                    replaced[i] = allClassesSimplified[index];
                } else { // If the error wasn't fixed because of a target spelling issue (AP Calculub), check for alias misspellings (ap balc)
                    let lowestDistanceAlias = Number.MAX_SAFE_INTEGER;
                    let aliasIndex;
                    for (let j = 0; j < masterAliases.length; j++) { // For each set of aliases (AP Calc, Calc)
                        for (let k = 0; k < masterAliases[j].length; k++) { // For each alias (AP Calc)
                            if (levenshtein(masterAliases[j][k], simplifiedUserClasses[i]) <= LEVENSHTEIN_DISTANCE_TOLERANCE && levenshtein(masterAliases[j][k], simplifiedUserClasses[i]) < lowestDistanceAlias) { // If within the tolerance and is lower than the current lowest distance
                                lowestDistanceAlias = levenshtein(masterAliases[j][k], simplifiedUserClasses[i]);
                                aliasIndex = j;
                            }
                        }
                    }
                    if (aliasIndex !== undefined && aliasIndex !== null) {
                        replaced[i] = masterTarget[aliasIndex];
                    }
                }
            }
            }

    }
    return replaced;
}

function timeStamp() {
    return '[' + new Date().toString().split(' G')[0] + ']';

}

client.login('NTM5NTI1Nzg1Mzk2OTY5NDcz.DzDp_Q.b8o1LH841zdpIL3-PGkG8JCClq8');