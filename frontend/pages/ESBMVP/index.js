



function loadAthleteProfile(name, sport) {
    return {
        name: name,
        sport: sport,
    };
}

const profile = loadAthleteProfile("Kobie Roberts", "Football");
console.log(profile);

// Athlete card Interaction V1
const card = document.querySelector("athlete-caed");

card.classList("click", () => {
    card.classList.toggle("expand");
    card.querySelector(".name").textContent = "Expand View"
});

// pulling data in real time (ESPN, Sleeper, Hudl and TikTok pull data this way)
async function loaAthlete(id) {
    try {
        const res = await fetch(`/api/athletes/${id}`);
        const athlete = await res.json();
        updateAthleteCard(athlete)
    } catch(err) {
        showError("Unable to load athlete data.");
    }

    }
    