# HHS-BOT
<html>
<img src="https://img.shields.io/github/repo-size/wyskoj/HHS-BOT.svg" />
<img src="https://img.shields.io/discord/526516818375082032.svg" />
 <hr>
 </html>
To start HHS-BOT you will need to have Node and npm installed.
Enter the repository contents into a folder. Then, run the following commands in this folder.

*Note: Use of nodemon is completely optional*
```
npm i
npm i nodemon
```

Create a file called `client.id` and the contents need to be the bot's secret token.

Run this to start the bot:
```
nodemon --inspect index.js
```

If it is not recognized, check your PATH variable.
Typing `rs` or making any changes to `index.js` restarts the bot.
Type `chrome://inspect/` into Chrome’s Omnibar, then click `Dedicated Dvtools for Node` for advanced debugging.

or:
```
node index.js
```

# Commands

The following is a list of all the currently supported commands (excluding testing / debugging commands)

**`!allclasses`** - Outputs the full list of all classes, as defined by the roles set in the server settings.

**`!classes [class1, class2, class3...]`** - Bulk add classes to the user who sent the command using various techniques to analyze user input.
* First, it separates each class by commas.
* Then, it tries to match each class the user input with the full list of classes.
  * If the user inputs an alias of a class (`Brit Lit` from `English 11 Honors`), the code checks for aliases, as defined in aliases.db.
  * If neither matches, it find the class with the lowest Levenstein distance, and, if within a given tolerance, will add based off of that. This was implemented to help catch spelling mistakes.
  
**`!addclass [class]`** - Add one specifc class to the user who sent the command. It uses the same alias and spelling check as `!classes`.

**`!removeclass [class]`** - Remove one specifc class from the user who sent the command. It uses the same alias and spelling check as `!classes`.

**`!removeallclasses`** - Removes all classes from the user who sent the command.

**`!website`** - Sends the message: `https://haslett.k12.mi.us/hhs`

**`!snowday`** - Displays data from the source code of the [snowday calculator website](https://www.snowdaycalculator.com/prediction.php?zipcode=48840&snowdays=9&extra=0&). It looks at line 1775 and formats the number accordingly.

* If the prediction is < 0: Display `Limited %`
* Else: Display `n %`

I decided to leave the prediction as it is even if above 99% just because.

**`!weather`** - Pulls JSON data from [weather.gov's API service](https://api.weather.gov/gridpoints/GRR/83,39/forecast) and formats it.
