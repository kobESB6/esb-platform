const inquirer = require("inquirer").default;

function updateAthlete() {
  const athletes = readFile();
// If there are no athletes to update, log a message and return to the main menu
  if (!athletes.length) {
    console.log("No athletes to update.");
    return startApp();
  }
// Prompt the user to select an athlete to update from a list of existing athletes
  const choices = athletes.map(player => ({
    name: `${player.name} (${player.sport})`,
    value: player.id
  }));

  inquirer
    .prompt([
      {
        type: "list",
        name: "id",
        message: "Select athlete to update:",
        choices
      }
    ])
    .then(answer => {
      const athlete = athletes.find(p => p.id === answer.id);
// If the athlete is not found, log an error and return to the main menu
      inquirer
        .prompt([
          {
            name: "name",
            message: "New name:",
            default: athlete.name
          },
          {
            name: "sport",
            message: "New sport:",
            default: athlete.sport
          },
          {
            name: "position",
            message: "New position:",
            default: athlete.position
          }
        ])
        .then(updated => {
          const updatedAthletes = athletes.map(p =>
            p.id === answer.id ? { ...p, ...updated } : p
          );
// Write the updated athletes back to the file      
          writeFile(updatedAthletes);

          console.log("✏️ Athlete updated!");
          startApp();
        });
    });
}

function searchAthletes() {
  const athletes = readFile();
// Prompt the user to enter a sport to search for
  inquirer
    .prompt([
      {
        name: "sport",
        message: "Enter sport to search:"
      }
    ])
    .then(answer => {
      const results = athletes.filter(
        player =>
          player.sport.toLowerCase() === answer.sport.toLowerCase()
      );
// Log the search results to the console and return to the main menu
      console.log("\n🔍 Results:\n");

      results.forEach(player => {
        console.log(`${player.name} - ${player.position}`);
      });

      startApp();
    });
}

function startApp() {
  inquirer
//   Prompt the user to select an action from the main menu
    .prompt([
      {
        type: "list",
        name: "action",
        message: "What do you want to do?",
        choices: [
          "Add Athlete",
          "View Athletes",
          "Update Athlete",
          "Delete Athlete",
          "Search Athletes",
          "Exit"
        ]
      }
    ])
    .then(answer => {
      switch (answer.action) {
        case "Add Athlete":
          return addAthlete();
        case "View Athletes":
          return listAthletes();
        case "Update Athlete":
          return updateAthlete();
        case "Delete Athlete":
          return deleteAthlete();
        case "Search Athletes":
          return searchAthletes();
        case "Exit":
          console.log("👋 Goodbye!");
          process.exit();
      }
    //   Handle any errors that occur during the prompt process
    });
}        // Start the application   
startApp();