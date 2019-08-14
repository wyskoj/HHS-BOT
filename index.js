const Discord = require('discord.js');
const fs = require('fs');
const request = require('request');
const client = new Discord.Client();

const LEVENSHTEIN_DISTANCE_TOLERANCE = 2;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('error', console.error);

client.on('message', function (message) {

    /* Swear filter */
    let content = message.content;
    for (let i = 0; i < swearWords.length; i++) {
        if (findKeyword(content, swearWords[i], 0) !== -1) {
            message.delete();
            break;
        }
    }

    /* Commands */
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
                    fixed = fixed.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
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
                    fixed = fixed.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "");
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
                    message.channel.send(levenshtein(s1, s2));
                } else {
                    message.channel.send("`!testlevenshtein string1|string2`");
                }
                break;
            case 'ping':
                message.channel.send("Pong!");
                break;
            case 'website':
                message.channel.send("https://www.haslett.k12.mi.us/hhs");
                break;
            case 'testclass':
                let classFunTest = /^\s*!testclass\s(.+)/.exec(message.content);
                if (classFunTest !== null) {
                    let userClass = classFunTest[1]; // Extract class
                    let oneArray = [];
                    oneArray.push(userClass);
                    replaceAliasesAndMistakesForFun(oneArray, message);
                }
                break;
            case 'snowdaycalc':
            case 'snowday':
                let snowDayDB = fs.readFileSync('snowDayCount.db');
                let amountOfSnowDays = parseInt(snowDayDB);
                request('https://www.snowdaycalculator.com/prediction.php?zipcode=48840&snowdays=' + amountOfSnowDays + '&extra=0.4&', function (error, response, body) {
                    let date = new Date(); // Store the current time
                    let year = date.getFullYear().toString(); // Define the year as a string
                    let month = date.getMonth() + 1; // Define the month as a string (add 1 because Jan is 0)
                    let thisDate = date.getDate();

                    /* Prepend a 0 is the month is only 1 digit long */
                    let goodMonth = "";
                    if (month.toString().length === 1) {
                        goodMonth = "0" + month;
                    } else {
                        goodMonth = month.toString();
                    }

                    /* Calculate tomorrow's date, if after 7 AM. Otherwise, Calculate today's date. */
                    if (date.getHours() >= 7) { // If after 7 AM, do tomorrow's prediction
                        thisDate = date.getDate();
                        thisDate += 1;
                        thisDate = thisDate.toString();
                    } else {
                        thisDate = date.getDate().toString();
                    }

                    let thisDateString = "";
                    /* Prepend a 0 is the month is only 1 digit long */
                    if (thisDate.length === 1) {
                        thisDateString = "0" + thisDate;
                    }

                    /* Concatenate the full date with numbers (e.g., 20190212) */
                    let fullDate = year + goodMonth + thisDateString;

                    /* Regex */
                    let getPrediction = new RegExp("theChance\\[" + fullDate + "\\] = (.+);");
                    let match = getPrediction.exec(body);

                    if (match !== null) {
                        if (match.length < 2) {
                            message.channel.send("No snow day prediction.");
                        } else if (parseInt(match[1]) <= 0) {
                            message.channel.send("There is a Limited % of a snow day on " + goodMonth + "/" + thisDateString + "/" + year + " with " + amountOfSnowDays + " previous snow days, according to https://www.snowdaycalculator.com.");
                        } else {
                            message.channel.send("There is a " + Math.round(parseInt(match[1])).toString() + "% of a snow day on " + goodMonth + "/" + thisDate + "/" + year + " with " + amountOfSnowDays + " previous snow days, according to https://www.snowdaycalculator.com");
                        }
                    } else {
                        message.channel.send("frigg off");
                    }

                });
                break;
            case 'weather':
                try {
                    let number;

                    function callback(error, response, body) {

                        let header = JSON.parse(body)["properties"]["periods"][number];
                        message.channel.send(
                            "**Weather data for " + header["startTime"].substring(0, 10) + " (" + header["name"] + ")**: *" + header["shortForecast"] + "*\n" + // Weather data for 2019-02-12: Rain and Snow
                            "Temperature: " + header["temperature"] + "°" + header["temperatureUnit"] + "\n" +// Temperature: 33°F
                            "Wind speed: " + header["windSpeed"] + " " + header["windDirection"] + "\n" + // Wind speed: 5 to 10 mph E
                            "*" + header["detailedForecast"] + "*") // (Detailed forecast)
                    }


                    let weatherMatch = /^!weather\s(\d+)/g.exec(message.content);

                    const options = {
                        url: 'https://api.weather.gov/gridpoints/GRR/83,39/forecast',
                        headers: {
                            'User-Agent': 'HHS-BOT' // This can be literally anything.
                        }
                    };
                    if (weatherMatch !== null) {
                        number = weatherMatch[1];
                        if (number > 13 || number < 0) {
                            message.channel.send("Please pick a number between 0 and 13.");
                        } else {
                            request(options, callback);
                        }
                    } else {
                        number = 0;
                        request(options, callback);
                    }

                } catch {
                    message.channel.send("There was an issue getting weather data. Try again later.");
                    console.log(e);
                }
                break;

            case 'lunch':
                try {
                    let validLetters = ["a", "b", "clear"];
                    let user = /!lunch (\w+)/g.exec(message.content)[1].toLocaleLowerCase();

                    if (validLetters.indexOf(user) == -1) {
                        message.channel.send("Command usage: `!lunch [A|B|clear]`")
                    } else {
                        let aLunch = message.guild.roles.find(r => r.name === "A Lunch");
                        let bLunch = message.guild.roles.find(r => r.name === "B Lunch");

                        if (message.member.roles.has(aLunch.id)) {
                            message.member.removeRole(aLunch);
                        }
                        if (message.member.roles.has(bLunch.id)) {
                            message.member.removeRole(bLunch);
                        }

                        if (user == "a") {
                            message.member.addRole(aLunch);
                            message.reply("you have been assigned to A Lunch.");
                        } else if (user == "b"){
                            message.member.addRole(bLunch);
                            message.reply("you have been assigned to B Lunch.");
                        } else if (user == "clear") {
                            message.reply("you have been assigned to no lunch.");
                        }
                    }
                } catch (e) {
                    message.channel.send("Command usage: `!lunch [A|B|clear]`")
                }

                break;
        }
    }


});

client.on('guildMemberRemove', function (member) {
    let botErrorChannel = member.guild.channels.get("541061854969987078");
    botErrorChannel.send(timeStamp() + " " + member.user.username + " has left!");
});

function getAllClassesNamesAlphabetSorted(context) {
    let classes = [];
    let botRolePosition = context.guild.roles.find(r => r.name === "Bot").position;
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
    let botRolePosition = context.guild.roles.find(r => r.name === "Bot").position;
    for (let i = 0; i < context.member.guild.roles.array().length; i++) {
        if (context.member.guild.roles.array()[i].position < botRolePosition && context.member.guild.roles.array()[i].name !== "@everyone") {
            classes.push(context.member.guild.roles.array()[i].name);
        }
    }
    return classes;
}

function getAllClassesIDsSystemSorted(context) {
    let classes = [];
    let botRolePosition = context.guild.roles.find(r => r.name === "Bot").position;
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
            if (str1[i - 1] === str2[j - 1]) d[i][j] = d[i - 1][j - 1];
            else d[i][j] = Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]) + 1;
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

function replaceAliasesAndMistakesForFun(simplifiedUserClasses, context) {
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
    let lowestDistanceTarget = Number.MAX_SAFE_INTEGER;
    let lowestDistanceAlias = Number.MAX_SAFE_INTEGER;
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
                lowestDistanceTarget = Number.MAX_SAFE_INTEGER;
                let index;
                for (let j = 0; j < allClassesSimplified.length; j++) { // Check each master class
                    if (levenshtein(allClassesSimplified[j], simplifiedUserClasses[i]) < lowestDistanceTarget) { // If lower than the current lowest distance
                        lowestDistanceTarget = levenshtein(simplifiedUserClasses[i], allClassesSimplified[j]); // Set new lowest distance
                        index = j;
                        misspelledFromTarget = true; // Ladies and gentlemen, we got 'em.
                    }
                }
                if (misspelledFromTarget && index !== null) {
                    replaced[i] = allClassesSimplified[index];
                } else { // If the error wasn't fixed because of a target spelling issue (AP Calculub), check for alias misspellings (ap balc)
                    lowestDistanceAlias = Number.MAX_SAFE_INTEGER;
                    let aliasIndex;
                    for (let j = 0; j < masterAliases.length; j++) { // For each set of aliases (AP Calc, Calc)
                        for (let k = 0; k < masterAliases[j].length; k++) { // For each alias (AP Calc)
                            if (levenshtein(masterAliases[j][k], simplifiedUserClasses[i]) < lowestDistanceAlias) { // If within the tolerance and is lower than the current lowest distance
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
    context.channel.send(replaced[0] + " : " + (lowestDistanceTarget));
}

function timeStamp() {
    return '[' + new Date().toString().split(' G')[0] + ']';
}

function findKeyword(content, goal) {
    let phrase = content.trim();
    let position = phrase.toLowerCase().indexOf(goal.toLowerCase(), 0);

    // Refinement--make sure the goal isn't part of a word
    while (position >= 0) {
        // Find the string of length 1 before and after the word
        let before = " ";
        let after = " ";
        if (position > 0) {
            before = phrase.substring(position - 1, position).toLowerCase();
        }
        if (position + goal.length() < phrase.length()) {
            after = phrase.substring(
                position + goal.length(),
                position + goal.length() + 1)
                .toLowerCase();
        }

        // If before and after aren't letters, we've found the goal word
        if (((before.compareTo("a") < 0) || (before.compareTo("z") > 0)) // before is not a letter
            && ((after.compareTo("a") < 0) || (after.compareTo("z") > 0))) {
            return position;
        }

        // The last position didn't work, so let's find
        // the next, if there is one.
        position = phrase.indexOf(goal.toLowerCase(), position + 1);
    }

    return -1;
}


function findKeyword(statement, goal, startPos) {
    let phrase = statement.trim();
    // The only change to incorporate the startPos is in the line below
    let position = phrase.toLowerCase().indexOf(goal.toLowerCase(), startPos);

    // Refinement--make sure the goal isn't part of a word
    while (position >= 0) {
        // Find the string of length 1 before and after the word
        let before = " ";
        let after = " ";
        if (position > 0) {
            before = phrase.substring(position - 1, position).toLowerCase();
        }
        if (position + goal.length < phrase.length) {
            after = phrase.substring(
                position + goal.length,
                position + goal.length + 1)
                .toLowerCase();
        }

        // If before and after aren't letters, we've found the goal word
        if (/[a-z]/g.exec(before) === null && /[a-z]/g.exec(after) === null) {
            return position;
        }

        // The last position didn't work, so let's find
        // the next, if there is one.
        position = phrase.indexOf(goal.toLowerCase(), position + 1);
    }

    return -1;
}

let clientID = fs.readFileSync('client.id');
let swearWords = fs.readFileSync('swearWords.db').toString().split("\r\n");
client.login(clientID.toString());